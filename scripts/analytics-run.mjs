import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

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
  const concurrency = readConcurrencyEnv();
  const engineTimeoutMs = readPositiveIntegerEnv('ANALYTICS_ENGINE_TIMEOUT_MS', 30000);
  const batchSize = readPositiveIntegerEnv('ANALYTICS_BATCH_SIZE', 250);
  const runMode = process.env.ANALYTICS_RUN_MODE ?? 'batch';
  const outputFormat = readOutputFormatEnv();
  const compactAnalytics = runMode === 'batch' && manifest.inputMode !== 'files';
  await fs.mkdir(outputRoot, { recursive: true });

  const timestamp = createTimestamp();
  const runId = resolveRunId(timestamp);
  const runOutput = createRunOutput({
    outputFormat,
    runDate: runStartedAt.toISOString().slice(0, 10),
    runId,
    timestamp,
    updateLatest: updateLatestEnabled()
  });
  const writer = runOutput.writer;
  let stats;
  let finalizedOutput;

  try {
    stats =
      runMode === 'legacy'
        ? await runLegacyBatch(enginePath, manifest.scenarios, concurrency, engineTimeoutMs, writer)
        : await runJsonlBatch(enginePath, manifest.scenarios, concurrency, engineTimeoutMs, batchSize, writer);

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
    concurrency,
    batchSize: runMode === 'legacy' ? null : batchSize,
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

function readConcurrencyEnv() {
  const value = process.env.ANALYTICS_CONCURRENCY;
  if (value === undefined || value === 'auto') {
    return Math.max(1, Math.min(8, os.availableParallelism() - 1));
  }
  return readPositiveIntegerEnv('ANALYTICS_CONCURRENCY', 1);
}

function updateLatestEnabled() {
  const value = process.env.ANALYTICS_UPDATE_LATEST ?? 'true';
  if (['1', 'true', 'yes'].includes(value.toLowerCase())) {
    return true;
  }
  if (['0', 'false', 'no'].includes(value.toLowerCase())) {
    return false;
  }
  throw new Error('ANALYTICS_UPDATE_LATEST must be a boolean value: true/false or 1/0.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
