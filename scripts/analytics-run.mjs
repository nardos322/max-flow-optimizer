import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

import {
  createTimestamp,
  manifestPath,
  outputRoot,
  readOutputFormatEnv,
  readPositiveIntegerEnv,
  repoRoot,
  resolveEnginePath,
  resolveManifestShardPath,
  resolveRunId
} from './analytics-runner/config.mjs';
import { runJsonlBatch, runLegacyBatch } from './analytics-runner/batches.mjs';
import { closeRunOutput, createRunOutput, destroyRunOutput } from './analytics-runner/output.mjs';

async function main() {
  const runStartedAt = new Date();
  const runStartedAtMs = performance.now();
  const enginePath = await resolveEnginePath();
  const manifestShardPath = resolveManifestShardPath();
  const manifestSourcePath = manifestShardPath ?? manifestPath;
  const manifest = await readManifest(manifestSourcePath, manifestShardPath !== null);
  const manifestFingerprint = await createManifestFingerprint(manifest, manifestSourcePath);
  const concurrency = readConcurrencyEnv();
  const engineTimeoutMs = readPositiveIntegerEnv('ANALYTICS_ENGINE_TIMEOUT_MS', 30000);
  const batchSize = readPositiveIntegerEnv('ANALYTICS_BATCH_SIZE', 250);
  const runMode = process.env.ANALYTICS_RUN_MODE ?? 'batch';
  const outputFormat = readOutputFormatEnv();
  const chunkStrategy = readChunkStrategyEnv();
  const resume = readBooleanEnv('ANALYTICS_RESUME', false);
  await fs.mkdir(outputRoot, { recursive: true });

  const timestamp = createTimestamp();
  const runId = resolveRunId(timestamp);
  const completedKeys = resume ? await readCompletedKeys(runId) : new Set();
  if (resume) {
    await validateResumeManifest(runId, manifestFingerprint, completedKeys.size);
  }
  const filteredEntries = resume
    ? manifest.scenarios.filter((entry) => !completedKeys.has(createEntryKey(entry)))
    : manifest.scenarios;
  if (resume && filteredEntries.length === 0) {
    await finishAlreadyCompleteResume(runId, manifest, manifestFingerprint);
    return;
  }
  const compactAnalytics = runMode === 'batch' && manifest.inputMode !== 'files';
  const runOutput = createRunOutput({
    outputFormat,
    runDate: runStartedAt.toISOString().slice(0, 10),
    runId,
    timestamp,
    updateLatest: updateLatestEnabled(),
    updateLatestOutput: updateLatestOutputEnabled()
  });
  const writer = runOutput.writer;
  let stats;
  let finalizedOutput;

  try {
    stats =
      runMode === 'legacy'
        ? await runLegacyBatch(enginePath, filteredEntries, concurrency, engineTimeoutMs, writer)
        : await runJsonlBatch(
            enginePath,
            filteredEntries,
            concurrency,
            engineTimeoutMs,
            batchSize,
            writer,
            chunkStrategy
          );

    finalizedOutput = await closeRunOutput(runOutput);
  } catch (error) {
    destroyRunOutput(runOutput);
    throw error;
  }

  const runFinishedAt = new Date();
  const totalWallTimeMs = Number((performance.now() - runStartedAtMs).toFixed(2));
  const totalWallTimeSeconds = Number((totalWallTimeMs / 1000).toFixed(2));
  const engineRuntimeMsTotal = Number(stats.runtimeMsTotal.toFixed(2));
  const engineTotalMsTotal = Number(stats.engineTotalMsTotal.toFixed(2));
  const engineParseMsTotal = Number(stats.engineParseMsTotal.toFixed(2));
  const syntheticGenerateMsTotal = Number(stats.syntheticGenerateMsTotal.toFixed(2));
  const engineSolveMsTotal = Number(stats.engineSolveMsTotal.toFixed(2));
  const normalizeMsTotal = Number(stats.normalizeMsTotal.toFixed(2));
  const buildNetworkMsTotal = Number(stats.buildNetworkMsTotal.toFixed(2));
  const maxFlowMsTotal = Number(stats.maxFlowMsTotal.toFixed(2));
  const finalizeMsTotal = Number(stats.finalizeMsTotal.toFixed(2));
  const amortizedWallTimeMsTotal = Number(stats.wallTimeMsTotal.toFixed(2));
  const estimatedRunnerOverheadMs = Number(Math.max(0, amortizedWallTimeMsTotal - engineRuntimeMsTotal).toFixed(2));
  const rowsPerSecond = totalWallTimeSeconds > 0 ? Number((stats.runs / totalWallTimeSeconds).toFixed(2)) : null;
  const engineRuntimeAvgMs =
    stats.recordsWithRuntime > 0 ? Number((engineRuntimeMsTotal / stats.recordsWithRuntime).toFixed(4)) : null;
  const amortizedWallTimeAvgMs =
    stats.recordsWithWallTime > 0 ? Number((amortizedWallTimeMsTotal / stats.recordsWithWallTime).toFixed(4)) : null;

  const summary = {
    solverTarget: 'engine',
    runId,
    runMode,
    compactAnalytics,
    outputFormat,
    enginePath: path.relative(repoRoot, enginePath),
    manifest: path.relative(repoRoot, manifestSourcePath),
    manifestKind: manifest.kind,
    manifestFingerprint,
    manifestEntries: manifest.scenarios.length,
    skippedExistingRuns: manifest.scenarios.length - filteredEntries.length,
    resume,
    concurrency,
    batchSize: runMode === 'legacy' ? null : batchSize,
    chunkStrategy: runMode === 'legacy' ? null : chunkStrategy,
    engineTimeoutMs,
    runs: stats.runs,
    ok: stats.ok,
    errors: stats.errors,
    totalWallTimeMs,
    totalWallTimeSeconds,
    rowsPerSecond,
    engineRuntimeMsTotal,
    engineRuntimeSecondsTotal: Number((engineRuntimeMsTotal / 1000).toFixed(2)),
    engineRuntimeAvgMs,
    engineTimingRecords: stats.recordsWithEngineTimings,
    engineInternalBreakdownSeconds: {
      parse: Number((engineParseMsTotal / 1000).toFixed(2)),
      syntheticGenerate: Number((syntheticGenerateMsTotal / 1000).toFixed(2)),
      solveEnvelope: Number((engineSolveMsTotal / 1000).toFixed(2)),
      normalize: Number((normalizeMsTotal / 1000).toFixed(2)),
      buildNetwork: Number((buildNetworkMsTotal / 1000).toFixed(2)),
      maxFlow: Number((maxFlowMsTotal / 1000).toFixed(2)),
      finalize: Number((finalizeMsTotal / 1000).toFixed(2)),
      total: Number((engineTotalMsTotal / 1000).toFixed(2))
    },
    amortizedWallTimeMsTotal,
    amortizedWallTimeSecondsTotal: Number((amortizedWallTimeMsTotal / 1000).toFixed(2)),
    amortizedWallTimeAvgMs,
    estimatedRunnerOverheadMs,
    estimatedRunnerOverheadSeconds: Number((estimatedRunnerOverheadMs / 1000).toFixed(2)),
    estimatedIdealSecondsAtConcurrency:
      concurrency > 0 && engineRuntimeMsTotal > 0 ? Number((engineRuntimeMsTotal / 1000 / concurrency).toFixed(2)) : null,
    startedAt: runStartedAt.toISOString(),
    finishedAt: runFinishedAt.toISOString(),
    output: path.relative(repoRoot, finalizedOutput.primaryOutput),
    jsonlOutput: finalizedOutput.jsonlOutput ? path.relative(repoRoot, finalizedOutput.jsonlOutput) : null,
    parquetOutput: finalizedOutput.parquetOutput ? path.relative(repoRoot, finalizedOutput.parquetOutput) : null
  };

  if (process.env.ANALYTICS_RUN_SUMMARY_FILE) {
    await fs.writeFile(process.env.ANALYTICS_RUN_SUMMARY_FILE, `${JSON.stringify(summary, null, 2)}\n`);
  }
  await writeRunMetadata(runId, summary);
  if (updateLatestEnabled()) {
    await fs.writeFile(path.join(outputRoot, 'latest-run.json'), `${JSON.stringify(summary, null, 2)}\n`);
  }

  console.log(JSON.stringify(summary, null, 2));
}

async function readManifest(sourcePath, isShard) {
  const content = await fs.readFile(sourcePath, 'utf8');

  if (!isShard) {
    return {
      ...JSON.parse(content),
      kind: 'manifest'
    };
  }

  const scenarios = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  return {
    generatedAt: null,
    inputMode: scenarios.some((entry) => entry.inputPath) ? 'files' : 'generated',
    scenarios,
    kind: 'manifest-shard'
  };
}

async function createManifestFingerprint(manifest, sourcePath) {
  const content = await fs.readFile(sourcePath);
  const scenariosByName = new Map();

  for (const entry of manifest.scenarios) {
    scenariosByName.set(entry.scenarioName, (scenariosByName.get(entry.scenarioName) ?? 0) + 1);
  }

  return {
    source: path.relative(repoRoot, sourcePath),
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
    entries: manifest.scenarios.length,
    inputMode: manifest.inputMode ?? null,
    manifestOrder: manifest.manifestOrder ?? null,
    runsPerScenario: manifest.runsPerScenario ?? null,
    scenarios: [...scenariosByName.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, entries]) => ({ name, entries }))
  };
}

function readConcurrencyEnv() {
  const value = process.env.ANALYTICS_CONCURRENCY;
  if (value === undefined || value === 'auto') {
    return Math.max(1, Math.min(8, os.availableParallelism() - 1));
  }
  return readPositiveIntegerEnv('ANALYTICS_CONCURRENCY', 1);
}

function updateLatestEnabled() {
  return readBooleanEnv('ANALYTICS_UPDATE_LATEST', true);
}

function updateLatestOutputEnabled() {
  return readBooleanEnv('ANALYTICS_UPDATE_LATEST_OUTPUT', updateLatestEnabled());
}

function readBooleanEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  if (['1', 'true', 'yes'].includes(value.toLowerCase())) {
    return true;
  }
  if (['0', 'false', 'no'].includes(value.toLowerCase())) {
    return false;
  }
  throw new Error(`${name} must be a boolean value: true/false or 1/0.`);
}

function readChunkStrategyEnv() {
  const value = process.env.ANALYTICS_CHUNK_STRATEGY ?? 'cost-balanced';
  if (['sequential', 'cost-balanced'].includes(value)) {
    return value;
  }
  throw new Error('ANALYTICS_CHUNK_STRATEGY must be sequential or cost-balanced.');
}

async function readCompletedKeys(runId) {
  const keys = new Set();
  const runDir = path.join(outputRoot, 'runs', `runId=${runId}`);
  await addKeysFromPath(keys, runDir);

  let outputEntries = [];
  try {
    outputEntries = await fs.readdir(outputRoot, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return keys;
    }
    throw error;
  }

  for (const entry of outputEntries) {
    if (!entry.isFile() || !entry.name.startsWith(`runs-${runId}-`) || !entry.name.endsWith('.jsonl')) {
      continue;
    }
    await addKeysFromPath(keys, path.join(outputRoot, entry.name));
  }

  return keys;
}

async function validateResumeManifest(runId, manifestFingerprint, completedCount) {
  if (completedCount === 0) {
    return;
  }

  const existingMetadata = await readRunMetadata(runId);
  if (!existingMetadata?.manifestFingerprint) {
    if (readBooleanEnv('ANALYTICS_FORCE_RESUME', false)) {
      return;
    }
    throw new Error(
      `Cannot resume ${runId}: existing records were found but no run metadata exists. ` +
        'Set ANALYTICS_FORCE_RESUME=true only if the manifest is known to match.'
    );
  }

  if (manifestFingerprintMatches(existingMetadata.manifestFingerprint, manifestFingerprint)) {
    return;
  }
  if (readBooleanEnv('ANALYTICS_FORCE_RESUME', false)) {
    return;
  }

  throw new Error(
    `Cannot resume ${runId}: current manifest does not match the existing run fingerprint. ` +
      'Set ANALYTICS_FORCE_RESUME=true only for an intentional override.'
  );
}

async function finishAlreadyCompleteResume(runId, manifest, manifestFingerprint) {
  const existingMetadata = await readRunMetadata(runId);
  const summary =
    existingMetadata ??
    {
      solverTarget: 'engine',
      runId,
      manifest: manifestFingerprint.source,
      manifestKind: manifest.kind,
      manifestFingerprint,
      manifestEntries: manifest.scenarios.length,
      runs: manifest.scenarios.length,
      ok: null,
      errors: null,
      output: null,
      jsonlOutput: null,
      parquetOutput: null
    };
  const resumedSummary = {
    ...summary,
    resume: true,
    resumedWithoutWork: true,
    skippedExistingRuns: manifest.scenarios.length
  };

  await writeRunMetadata(runId, resumedSummary);
  if (updateLatestEnabled()) {
    await fs.writeFile(path.join(outputRoot, 'latest-run.json'), `${JSON.stringify(resumedSummary, null, 2)}\n`);
  }
  console.log(JSON.stringify(resumedSummary, null, 2));
}

async function readRunMetadata(runId) {
  const candidates = [
    path.join(outputRoot, 'runs', `runId=${runId}`, 'run.json'),
    path.join(outputRoot, 'latest-run.json')
  ];

  for (const candidate of candidates) {
    try {
      const metadata = JSON.parse(await fs.readFile(candidate, 'utf8'));
      if (metadata.runId === runId) {
        return metadata;
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return null;
}

function manifestFingerprintMatches(left, right) {
  return (
    left?.sha256 === right?.sha256 &&
    left?.entries === right?.entries &&
    JSON.stringify(left?.scenarios ?? []) === JSON.stringify(right?.scenarios ?? [])
  );
}

async function writeRunMetadata(runId, summary) {
  const runDir = path.join(outputRoot, 'runs', `runId=${runId}`);
  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(path.join(runDir, 'run.json'), `${JSON.stringify(summary, null, 2)}\n`);
}

async function addKeysFromPath(keys, inputPath) {
  let stat;
  try {
    stat = await fs.stat(inputPath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  if (stat.isFile() && inputPath.endsWith('.jsonl')) {
    const content = await fs.readFile(inputPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      if (!line.trim()) {
        continue;
      }
      const record = JSON.parse(line);
      keys.add(createEntryKey(record));
    }
    return;
  }

  const scriptPath = path.join(repoRoot, 'analytics/python/list_run_keys.py');
  const stdout = await runPythonCapture(resolvePython(), [scriptPath, '--input', inputPath]);
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) {
      keys.add(trimmed);
    }
  }
}

function resolvePython() {
  if (process.env.PYTHON) {
    return process.env.PYTHON;
  }
  const localVenvPython = path.join(repoRoot, '.venv/bin/python');
  return fs
    .access(localVenvPython)
    .then(() => localVenvPython)
    .catch(() => 'python3');
}

async function runPythonCapture(commandOrPromise, args) {
  const command = await commandOrPromise;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(`Failed to read completed analytics records with exit code ${exitCode}.\n${stderr}`));
    });
  });
}

function createEntryKey(entry) {
  return `${entry.instanceId}\t${entry.seed}`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
