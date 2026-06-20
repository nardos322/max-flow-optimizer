import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { createManifestEntry, selectProfiles } from './analytics-scenarios.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

async function main() {
  const profiles = selectProfiles(process.env.ANALYTICS_TUNE_SCENARIOS);
  const runsPerScenario = readPositiveIntegerEnv('ANALYTICS_TUNE_RUNS_PER_SCENARIO', 1000);
  const batchSizes = readIntegerListEnv('ANALYTICS_TUNE_BATCH_SIZES', [50, 100, 150, 250, 500]);
  const concurrencies = readConcurrencyListEnv('ANALYTICS_TUNE_CONCURRENCIES', ['auto', '4', '6', '8']);
  const outputFormat = readOutputFormatEnv('ANALYTICS_TUNE_OUTPUT_FORMAT', 'jsonl');
  const shardPath = await writeTuneShard(profiles, runsPerScenario);
  const tuneRunPrefix = path.basename(path.dirname(shardPath));
  const totalRuns = profiles.length * runsPerScenario;
  const results = [];

  console.log(
    `Tuning analytics:run with ${totalRuns} runs, ${profiles.length} scenarios, output=${outputFormat}, shard=${path.relative(
      repoRoot,
      shardPath
    )}`
  );

  for (const batchSize of batchSizes) {
    for (const concurrency of concurrencies) {
      const result = await runCandidate({
        shardPath,
        tuneRunPrefix,
        outputFormat,
        batchSize,
        concurrency
      });
      results.push(result);
      console.log(formatCandidate(result));
    }
  }

  results.sort((left, right) => left.totalWallTimeSeconds - right.totalWallTimeSeconds);
  const best = results[0];

  console.log('\nRanking');
  console.log('| Rank | Batch | Concurrency | Seconds | Rows/s | Errors |');
  console.log('| ---: | ---: | --- | ---: | ---: | ---: |');
  for (const [index, result] of results.entries()) {
    console.log(
      `| ${index + 1} | ${result.batchSize} | ${result.concurrency} | ${result.totalWallTimeSeconds} | ${result.rowsPerSecond} | ${result.errors} |`
    );
  }

  console.log('\nRecommended environment');
  console.log(`ANALYTICS_BATCH_SIZE=${best.batchSize}`);
  console.log(`ANALYTICS_CONCURRENCY=${best.concurrency}`);
}

async function writeTuneShard(profiles, runsPerScenario) {
  const tuneRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'maxflow-analytics-tune-'));
  const shardPath = path.join(tuneRoot, 'manifest.jsonl');
  const lines = [];

  for (let index = 0; index < runsPerScenario; index += 1) {
    for (const profile of profiles) {
      lines.push(JSON.stringify(createManifestEntry(profile, index)));
    }
  }

  await fs.writeFile(shardPath, `${lines.join('\n')}\n`);
  return shardPath;
}

async function runCandidate({ shardPath, tuneRunPrefix, outputFormat, batchSize, concurrency }) {
  const startedAt = performance.now();
  const summaryPath = path.join(path.dirname(shardPath), `summary-${batchSize}-${concurrency}.json`);
  const env = {
    ...process.env,
    ANALYTICS_MANIFEST_SHARD: shardPath,
    ANALYTICS_RUN_ID: `${tuneRunPrefix}-${batchSize}-${concurrency}`,
    ANALYTICS_RUN_SUMMARY_FILE: summaryPath,
    ANALYTICS_UPDATE_LATEST: 'false',
    ANALYTICS_OUTPUT_FORMAT: outputFormat,
    ANALYTICS_BATCH_SIZE: String(batchSize),
    ANALYTICS_CONCURRENCY: String(concurrency)
  };
  await runNodeScript(path.join(repoRoot, 'scripts/analytics-run.mjs'), env);
  const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
  const elapsedSeconds = Number(((performance.now() - startedAt) / 1000).toFixed(2));
  const totalWallTimeSeconds = summary.totalWallTimeSeconds ?? elapsedSeconds;
  const rowsPerSecond = Number((summary.runs / totalWallTimeSeconds).toFixed(2));

  return {
    batchSize,
    concurrency,
    runs: summary.runs,
    errors: summary.errors,
    totalWallTimeSeconds,
    elapsedSeconds,
    rowsPerSecond,
    output: summary.output
  };
}

function runNodeScript(scriptPath, env) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [scriptPath], {
      cwd: repoRoot,
      env,
      maxBuffer: 1024 * 1024
    }, (error, stdout, stderr) => {
      if (!error) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `analytics:run candidate failed with exit code ${error.code ?? 'unknown'}.\n${stderr || stdout || error.message}`
        )
      );
    });
  });
}

function formatCandidate(result) {
  return `batch=${result.batchSize} concurrency=${result.concurrency} seconds=${result.totalWallTimeSeconds} rowsPerSecond=${result.rowsPerSecond} errors=${result.errors}`;
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

function readIntegerListEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }

  const parsed = value
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item) && item > 0);
  if (parsed.length === 0) {
    throw new Error(`${name} must include at least one positive integer.`);
  }
  return parsed;
}

function readConcurrencyListEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }

  const parsed = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (parsed.length === 0 || parsed.some((item) => item !== 'auto' && (!Number.isInteger(Number(item)) || Number(item) <= 0))) {
    throw new Error(`${name} must include positive integers or auto.`);
  }
  return parsed;
}

function readOutputFormatEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (['jsonl', 'parquet'].includes(value)) {
    return value;
  }
  throw new Error(`${name} must be jsonl or parquet.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
