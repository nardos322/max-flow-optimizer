import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
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
import { closeWriteStream, finalizeRunOutputs } from './analytics-runner/output.mjs';

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

  const { primaryOutput, parquetOutput } = await finalizeRunOutputs(outputPath, {
    outputFormat,
    runDate: runStartedAt.toISOString().slice(0, 10),
    timestamp
  });
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
        output: path.relative(repoRoot, primaryOutput),
        jsonlOutput: path.relative(repoRoot, outputPath),
        parquetOutput: parquetOutput ? path.relative(repoRoot, parquetOutput) : null
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
