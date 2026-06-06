import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { outputRoot, repoRoot, resolvePython } from './config.mjs';

export function closeWriteStream(outputStream) {
  return new Promise((resolve, reject) => {
    outputStream.once('error', reject);
    outputStream.end(resolve);
  });
}

export async function finalizeRunOutputs(outputPath, { outputFormat, runDate, timestamp }) {
  if (outputFormat === 'parquet') {
    const parquetOutput = await writePartitionedParquet(outputPath, { runDate, timestamp });
    return {
      primaryOutput: parquetOutput,
      parquetOutput
    };
  }

  await fs.copyFile(outputPath, path.join(outputRoot, 'latest-runs.jsonl'));
  return {
    primaryOutput: outputPath,
    parquetOutput: null
  };
}

async function writePartitionedParquet(inputPath, { runDate, timestamp }) {
  const scriptPath = path.join(repoRoot, 'analytics/python/write_partitioned_runs.py');
  const outputDir = path.join(outputRoot, 'runs');
  const latestPath = path.join(outputRoot, 'latest-runs.parquet');
  const python = resolvePython();

  await runPython(python, [
    scriptPath,
    '--input',
    inputPath,
    '--output-dir',
    outputDir,
    '--latest-output',
    latestPath,
    '--run-date',
    runDate,
    '--part-name',
    `part-${timestamp}.parquet`
  ]);

  return outputDir;
}

function runPython(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Partitioned Parquet writer failed with exit code ${exitCode}. ` +
            'Install dependencies with: pnpm analytics:setup'
        )
      );
    });
  });
}
