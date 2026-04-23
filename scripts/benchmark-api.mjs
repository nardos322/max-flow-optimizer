import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';

const defaults = {
  mediumWarmupRuns: 5,
  mediumMeasuredRuns: 30,
  largeMeasuredRuns: 10
};

async function main() {
  const mediumPayload = await readFixture('packages/test-data/input/medium-random-50x50.json');
  const largePayload = await readFixture('packages/test-data/input/large-random-200x200.json');

  for (let index = 0; index < defaults.mediumWarmupRuns; index += 1) {
    await runSolve('medium-random-50x50', mediumPayload);
  }

  const mediumRuns = await repeat(defaults.mediumMeasuredRuns, () => runSolve('medium-random-50x50', mediumPayload));
  const largeRuns = await repeat(defaults.largeMeasuredRuns, () => runSolve('large-random-200x200', largePayload));
  const allRuns = [...mediumRuns, ...largeRuns];

  const report = {
    baseUrl,
    hardware: {
      platform: `${os.platform()} ${os.release()}`,
      cpuModel: os.cpus()[0]?.model ?? 'unknown',
      cpuCount: os.cpus().length,
      totalMemoryGb: Number((os.totalmem() / 1024 / 1024 / 1024).toFixed(2))
    },
    criteria: {
      p50TargetMs: 300,
      p95TargetMs: 1000,
      timeoutMs: 2000
    },
    datasets: {
      medium: summarizeRuns(mediumRuns),
      large: summarizeRuns(largeRuns),
      overall: summarizeRuns(allRuns)
    }
  };

  console.log(JSON.stringify(report, null, 2));
}

async function readFixture(relativePath) {
  return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'));
}

async function runSolve(dataset, payload) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}/v1/solve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const durationMs = Number((performance.now() - startedAt).toFixed(2));
  const body = await response.json();

  return {
    dataset,
    status: response.status,
    durationMs,
    requestId: body?.error?.requestId ?? body?.instanceId ?? 'unknown',
    engineRuntimeMs: body?.stats?.runtimeMs ?? null,
    feasible: body?.feasible ?? null
  };
}

function summarizeRuns(runs) {
  const durations = runs.map((run) => run.durationMs).sort((left, right) => left - right);
  const engineDurations = runs
    .map((run) => run.engineRuntimeMs)
    .filter((value) => typeof value === 'number')
    .sort((left, right) => left - right);

  return {
    runs: runs.length,
    p50Ms: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    maxMs: durations.at(-1) ?? 0,
    engineP50Ms: percentile(engineDurations, 0.5),
    engineP95Ms: percentile(engineDurations, 0.95),
    errors5xx: runs.filter((run) => run.status >= 500).length,
    statuses: summarizeStatuses(runs)
  };
}

function summarizeStatuses(runs) {
  return runs.reduce((accumulator, run) => {
    const key = String(run.status);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function percentile(values, ratio) {
  if (values.length === 0) {
    return 0;
  }

  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * ratio) - 1));
  return values[index];
}

async function repeat(count, callback) {
  const results = [];
  for (let index = 0; index < count; index += 1) {
    results.push(await callback());
  }
  return results;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
