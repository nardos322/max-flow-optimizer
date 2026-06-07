import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { outputRoot, repoRoot, resolvePython } from './config.mjs';

export function createRunOutput({ outputFormat, runDate, runId, timestamp, updateLatest = true }) {
  if (outputFormat === 'parquet') {
    const parquetOutput = createStreamingParquetOutput({ runDate, runId, timestamp, updateLatest });
    return {
      ...parquetOutput,
      jsonlOutput: null,
      outputFormat,
      updateLatest
    };
  }

  const outputPath = path.join(outputRoot, `runs-${runId}-${timestamp}.jsonl`);
  return {
    writer: createWriteStream(outputPath, { encoding: 'utf8' }),
    outputPath,
    jsonlOutput: outputPath,
    parquetOutput: null,
    primaryOutput: outputPath,
    outputFormat,
    updateLatest
  };
}

export function closeWriteStream(outputStream) {
  return new Promise((resolve, reject) => {
    outputStream.once('error', reject);
    outputStream.end(resolve);
  });
}

export async function closeRunOutput(runOutput) {
  if (runOutput.outputFormat === 'parquet') {
    await closeStreamingParquetOutput(runOutput);
    return {
      primaryOutput: runOutput.primaryOutput,
      parquetOutput: runOutput.parquetOutput,
      jsonlOutput: null
    };
  }

  await closeWriteStream(runOutput.writer);
  if (runOutput.updateLatest) {
    await fs.copyFile(runOutput.outputPath, path.join(outputRoot, 'latest-runs.jsonl'));
  }
  return {
    primaryOutput: runOutput.primaryOutput,
    parquetOutput: null,
    jsonlOutput: runOutput.jsonlOutput
  };
}

export function destroyRunOutput(runOutput) {
  if (runOutput.outputFormat === 'parquet') {
    runOutput.writer.destroy();
    runOutput.child.kill('SIGTERM');
    return;
  }
  runOutput.writer.destroy();
}

function createStreamingParquetOutput({ runDate, runId, timestamp, updateLatest }) {
  const scriptPath = path.join(repoRoot, 'analytics/python/stream_parquet_writer.py');
  const outputDir = path.join(outputRoot, 'runs', `runId=${runId}`);
  const latestPath = updateLatest
    ? path.join(outputRoot, 'latest-runs.parquet')
    : path.join(outputRoot, 'tune', `latest-runs-${runId}.parquet`);
  const flushRows = readPositiveIntegerEnv('ANALYTICS_PARQUET_FLUSH_ROWS', 10000);
  const python = resolvePython();
  const child = spawn(
    python,
    [
      scriptPath,
      '--output-dir',
      outputDir,
      '--latest-output',
      latestPath,
      '--run-date',
      runDate,
      '--run-id',
      runId,
      '--part-prefix',
      `part-${timestamp}`,
      '--flush-rows',
      String(flushRows)
    ],
    {
      cwd: repoRoot,
      stdio: ['pipe', 'ignore', 'inherit']
    }
  );

  child.stdin.setDefaultEncoding('utf8');

  return {
    writer: child.stdin,
    child,
    outputPath: outputDir,
    primaryOutput: outputDir,
    parquetOutput: outputDir,
    latestParquetOutput: latestPath,
    flushRows
  };
}

function closeStreamingParquetOutput(runOutput) {
  return new Promise((resolve, reject) => {
    let settled = false;

    function finish(error) {
      if (settled) {
        return;
      }
      settled = true;
      if (error) {
        reject(error);
        return;
      }
      resolve();
    }

    runOutput.child.on('error', finish);
    runOutput.child.on('close', (exitCode) => {
      if (exitCode === 0) {
        finish();
        return;
      }
      finish(
        new Error(
          `Partitioned Parquet writer failed with exit code ${exitCode}. ` +
            'Install dependencies with: pnpm analytics:setup'
        )
      );
    });

    runOutput.writer.end();
  });
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
