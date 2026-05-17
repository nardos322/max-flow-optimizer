import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import readline from 'node:readline';

import { findProfile, generateInstance } from './analytics-scenarios.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'data/generated/manifest.json');
const outputRoot = path.join(repoRoot, 'data/analytics');

async function main() {
  const runStartedAt = new Date();
  const runStartedAtMs = performance.now();
  const enginePath = await resolveEnginePath();
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const concurrency = readPositiveIntegerEnv('ANALYTICS_CONCURRENCY', 1);
  const engineTimeoutMs = readPositiveIntegerEnv('ANALYTICS_ENGINE_TIMEOUT_MS', 30000);
  const batchSize = readPositiveIntegerEnv('ANALYTICS_BATCH_SIZE', 250);
  const runMode = process.env.ANALYTICS_RUN_MODE ?? 'batch';
  const compactAnalytics = runMode === 'batch' && manifest.inputMode !== 'files';
  await fs.mkdir(outputRoot, { recursive: true });

  const timestamp = createTimestamp();
  const outputPath = path.join(outputRoot, `runs-${timestamp}.jsonl`);
  const outputStream = createWriteStream(outputPath, { encoding: 'utf8' });
  let stats;

  try {
    stats =
      runMode === 'legacy'
        ? await runLegacyBatch(enginePath, manifest.scenarios, concurrency, engineTimeoutMs, outputStream)
        : await runJsonlBatch(enginePath, manifest.scenarios, concurrency, engineTimeoutMs, batchSize, outputStream);

    await closeWriteStream(outputStream);
  } catch (error) {
    outputStream.destroy();
    throw error;
  }
  await fs.copyFile(outputPath, path.join(outputRoot, 'latest-runs.jsonl'));
  const runFinishedAt = new Date();
  const totalWallTimeMs = Number((performance.now() - runStartedAtMs).toFixed(2));
  console.log(
    JSON.stringify(
      {
        solverTarget: 'engine',
        runMode,
        compactAnalytics,
        enginePath: path.relative(repoRoot, enginePath),
        concurrency,
        batchSize: runMode === 'legacy' ? null : batchSize,
        engineTimeoutMs,
        runs: stats.runs,
        ok: stats.ok,
        errors: stats.errors,
        totalWallTimeMs,
        totalWallTimeSeconds: Number((totalWallTimeMs / 1000).toFixed(2)),
        startedAt: runStartedAt.toISOString(),
        finishedAt: runFinishedAt.toISOString(),
        output: path.relative(repoRoot, outputPath)
      },
      null,
      2
    )
  );
}

async function runLegacyBatch(enginePath, entries, concurrency, engineTimeoutMs, outputStream) {
  const stats = createRunStats();
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, entries.length);

  async function worker() {
    while (nextIndex < entries.length) {
      const index = nextIndex;
      nextIndex += 1;
      const entry = entries[index];
      const input = await loadInput(entry);
      await writeRecord(outputStream, stats, await runInstance(enginePath, entry, input, engineTimeoutMs));
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return stats;
}

async function runJsonlBatch(enginePath, entries, concurrency, engineTimeoutMs, batchSize, outputStream) {
  const stats = createRunStats();
  const workerCount = Math.min(concurrency, entries.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < entries.length) {
        const startIndex = nextIndex;
        nextIndex += batchSize;
        const chunk = entries.slice(startIndex, Math.min(startIndex + batchSize, entries.length)).map((entry) => ({ entry }));
        await runJsonlChunk(enginePath, chunk, outputStream, stats, engineTimeoutMs);
      }
    })
  );

  return stats;
}

async function runJsonlChunk(enginePath, chunk, outputStream, stats, engineTimeoutMs) {
  const startedAt = performance.now();
  const result = await runBatchEngine(enginePath, chunk, engineTimeoutMs * chunk.length);
  const batchWallTimeMs = Number((performance.now() - startedAt).toFixed(2));
  const amortizedWallTimeMs = Number((batchWallTimeMs / chunk.length).toFixed(2));

  if (result.exitCode !== 0 || result.timedOut) {
    for (const { entry } of chunk) {
      await writeRecord(outputStream, stats, createErrorRecord(entry, {
        wallTimeMs: amortizedWallTimeMs,
        errorCode: result.timedOut ? 'ENGINE_BATCH_TIMEOUT' : `EXIT_${result.exitCode}`
      }));
    }
    return;
  }

  const lines = result.stdoutLines;
  if (lines.length !== chunk.length) {
    for (const { entry } of chunk) {
      await writeRecord(outputStream, stats, createErrorRecord(entry, {
        wallTimeMs: amortizedWallTimeMs,
        errorCode: 'ENGINE_BATCH_OUTPUT_MISMATCH'
      }));
    }
    return;
  }

  for (const [lineIndex, line] of lines.entries()) {
    const { entry } = chunk[lineIndex];
    let response;
    try {
      response = JSON.parse(line);
    } catch {
      await writeRecord(outputStream, stats, createErrorRecord(entry, {
        wallTimeMs: amortizedWallTimeMs,
        errorCode: 'ENGINE_BATCH_INVALID_JSON'
      }));
      continue;
    }
    await writeRecord(
      outputStream,
      stats,
      response.error !== undefined
        ? createErrorRecord(entry, {
            wallTimeMs: amortizedWallTimeMs,
            errorCode: response.error.code ?? 'ENGINE_BATCH_ERROR'
          })
        : createOkRecord(applyAnalyticsMetadata(entry, response), response, amortizedWallTimeMs)
    );
  }
}

async function runInstance(enginePath, entry, input, engineTimeoutMs) {
  const requestId = createRequestId(entry);
  const startedAt = performance.now();
  const result = await runEngine(enginePath, {
    requestId,
    input
  }, engineTimeoutMs);
  const wallTimeMs = Number((performance.now() - startedAt).toFixed(2));

  if (result.exitCode !== 0 || result.timedOut) {
    return createErrorRecord(entry, {
      wallTimeMs,
      errorCode: result.timedOut ? 'ENGINE_TIMEOUT' : parseEngineError(result.stderr)?.error?.code ?? `EXIT_${result.exitCode}`
    });
  }

  const response = JSON.parse(result.stdout);
  return createOkRecord(entry, response, wallTimeMs);
}

function createBaseRecord(entry, wallTimeMs) {
  return {
    runId: createRequestId(entry),
    scenarioName: entry.scenarioName,
    seed: entry.seed,
    solverTarget: 'engine',
    instanceId: entry.instanceId,
    daysCount: entry.daysCount,
    medicsCount: entry.medicsCount,
    periodsCount: entry.periodsCount,
    availabilityPairs: entry.availabilityPairs,
    availabilityDensity: entry.availabilityDensity,
    maxDaysPerMedic: entry.maxDaysPerMedic,
    wallTimeMs
  };
}

function createErrorRecord(entry, { wallTimeMs, errorCode }) {
  return {
    ...createBaseRecord(entry, wallTimeMs),
    feasible: null,
    requiredFlow: null,
    maxFlow: null,
    uncoveredDaysCount: null,
    nodes: null,
    edges: null,
    edgesPerNode: null,
    runtimeMs: null,
    status: 'error',
    errorCode
  };
}

function createOkRecord(entry, response, wallTimeMs) {
  const nodes = response.stats?.nodes ?? null;
  const edges = response.stats?.edges ?? null;

  return {
    ...createBaseRecord(entry, wallTimeMs),
    feasible: response.feasible,
    requiredFlow: response.requiredFlow,
    maxFlow: response.maxFlow,
    uncoveredDaysCount: response.diagnostics?.uncoveredDays?.length ?? 0,
    nodes,
    edges,
    edgesPerNode: typeof nodes === 'number' && nodes > 0 && typeof edges === 'number' ? Number((edges / nodes).toFixed(4)) : null,
    runtimeMs: response.stats?.runtimeMs ?? null,
    status: 'ok',
    errorCode: null
  };
}

function createRequestId(entry) {
  return `analytics-${entry.instanceId}-${entry.seed}`;
}

function applyAnalyticsMetadata(entry, response) {
  const availabilityPairs = response.analytics?.availabilityPairs;
  if (typeof availabilityPairs === 'number') {
    entry.availabilityPairs = availabilityPairs;
  }
  return entry;
}

function createRunStats() {
  return {
    runs: 0,
    ok: 0,
    errors: 0
  };
}

async function writeRecord(outputStream, stats, record) {
  stats.runs += 1;
  if (record.status === 'ok') {
    stats.ok += 1;
  } else {
    stats.errors += 1;
  }

  if (!outputStream.write(`${JSON.stringify(record)}\n`)) {
    await once(outputStream, 'drain');
  }
}

function closeWriteStream(outputStream) {
  return new Promise((resolve, reject) => {
    outputStream.once('error', reject);
    outputStream.end(resolve);
  });
}

function runEngine(enginePath, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(enginePath, ['--stdin'], {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

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
      clearTimeout(timeout);
      resolve({
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timedOut
      });
    });
    child.stdin.end(`${JSON.stringify(payload)}\n`);
  });
}

function runBatchEngine(enginePath, chunk, timeoutMs) {
  return new Promise((resolve, reject) => {
    const usesCompactAnalytics = chunk.every(({ entry }) => !entry.inputPath);
    const child = spawn(enginePath, ['--stdin', usesCompactAnalytics ? '--analytics-jsonl' : '--batch-jsonl'], {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const stdoutLines = [];
    let stderr = '';
    let timedOut = false;
    const stdout = readline.createInterface({
      input: child.stdout,
      crlfDelay: Infinity
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stderr.setEncoding('utf8');
    stdout.on('line', (line) => {
      if (line.length > 0) {
        stdoutLines.push(line);
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (exitCode) => {
      clearTimeout(timeout);
      stdout.close();
      resolve({
        exitCode,
        stdoutLines,
        stderr: stderr.trim(),
        timedOut
      });
    });

    writeBatchPayloads(child.stdin, chunk).catch((error) => {
      child.kill('SIGTERM');
      reject(error);
    });
  });
}

async function writeBatchPayloads(stdin, chunk) {
  stdin.setDefaultEncoding('utf8');
  const usesCompactAnalytics = chunk.every(({ entry }) => !entry.inputPath);
  for (const { entry } of chunk) {
    const payload = usesCompactAnalytics
      ? createCompactAnalyticsPayload(entry)
      : {
          requestId: createRequestId(entry),
          input: await loadInput(entry)
        };

    if (!stdin.write(`${JSON.stringify(payload)}\n`)) {
      await once(stdin, 'drain');
    }
  }
  stdin.end();
}

function createCompactAnalyticsPayload(entry) {
  const profile = findProfile(entry.scenarioName);
  return {
    requestId: createRequestId(entry),
    scenarioName: entry.scenarioName,
    seed: entry.seed,
    instanceId: entry.instanceId,
    daysCount: entry.daysCount ?? profile.daysCount,
    medicsCount: entry.medicsCount ?? profile.medicsCount,
    periodsCount: entry.periodsCount ?? profile.periodsCount,
    availabilityDensity: entry.availabilityDensity ?? profile.availabilityDensity,
    maxDaysPerMedic: entry.maxDaysPerMedic ?? profile.maxDaysPerMedic
  };
}

async function loadInput(entry) {
  if (entry.inputPath) {
    return JSON.parse(await fs.readFile(path.join(repoRoot, entry.inputPath), 'utf8'));
  }

  const profile = findProfile(entry.scenarioName);
  const input = generateInstance(profile, entry.seed, parseInstanceIndex(entry.instanceId));
  entry.availabilityPairs = input.availability.length;
  return input;
}

function parseInstanceIndex(instanceId) {
  const match = instanceId.match(/-(\d+)$/);
  if (!match) {
    throw new Error(`Invalid analytics instanceId: ${instanceId}`);
  }
  return Number.parseInt(match[1], 10) - 1;
}

async function resolveEnginePath() {
  const candidate =
    process.env.ANALYTICS_ENGINE_PATH ??
    process.env.ENGINE_PATH ??
    path.join(repoRoot, 'services/engine-cpp/build/maxflow_engine');

  try {
    await fs.access(candidate);
  } catch {
    throw new Error(`Engine binary not found at ${candidate}. Run pnpm run build:engine first.`);
  }

  return candidate;
}

function parseEngineError(stderr) {
  try {
    return JSON.parse(stderr);
  } catch {
    return null;
  }
}

function createTimestamp() {
  return new Date().toISOString().replaceAll(':', '').replaceAll('.', '').replace('Z', 'Z');
}

function readPositiveIntegerEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
