import fs from 'node:fs/promises';
import path from 'node:path';

import {
  createTimestamp,
  manifestPath,
  outputRoot,
  readOutputFormatEnv,
  readPositiveIntegerEnv,
  repoRoot,
  resolveEnginePath
} from './analytics-runner/config.mjs';
import { runJsonlBatch, runLegacyBatch } from './analytics-runner/batches.mjs';
import { closeRunOutput, createRunOutput, destroyRunOutput } from './analytics-runner/output.mjs';

async function main() {
  const runStartedAt = new Date();
  const runStartedAtMs = performance.now();
  const enginePath = await resolveEnginePath();
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const concurrency = readPositiveIntegerEnv('ANALYTICS_CONCURRENCY', 1);
  const engineTimeoutMs = readPositiveIntegerEnv('ANALYTICS_ENGINE_TIMEOUT_MS', 30000);
  const batchSize = readPositiveIntegerEnv('ANALYTICS_BATCH_SIZE', 250);
  const runMode = process.env.ANALYTICS_RUN_MODE ?? 'batch';
  const outputFormat = readOutputFormatEnv();
  const compactAnalytics = runMode === 'batch' && manifest.inputMode !== 'files';
  await fs.mkdir(outputRoot, { recursive: true });

  const timestamp = createTimestamp();
  const runOutput = createRunOutput({
    outputFormat,
    runDate: runStartedAt.toISOString().slice(0, 10),
    timestamp
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

  console.log(
    JSON.stringify(
      {
        solverTarget: 'engine',
        runMode,
        compactAnalytics,
        outputFormat,
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
        output: path.relative(repoRoot, finalizedOutput.primaryOutput),
        jsonlOutput: finalizedOutput.jsonlOutput ? path.relative(repoRoot, finalizedOutput.jsonlOutput) : null,
        parquetOutput: finalizedOutput.parquetOutput ? path.relative(repoRoot, finalizedOutput.parquetOutput) : null
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
