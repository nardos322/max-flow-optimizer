import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'data/generated/manifest.json');
const outputRoot = path.join(repoRoot, 'data/analytics');

async function main() {
  const enginePath = await resolveEnginePath();
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const concurrency = readPositiveIntegerEnv('ANALYTICS_CONCURRENCY', 1);
  const engineTimeoutMs = readPositiveIntegerEnv('ANALYTICS_ENGINE_TIMEOUT_MS', 30000);
  await fs.mkdir(outputRoot, { recursive: true });

  const timestamp = createTimestamp();
  const outputPath = path.join(outputRoot, `runs-${timestamp}.jsonl`);
  const records = await runBatch(enginePath, manifest.scenarios, concurrency, engineTimeoutMs);

  await fs.writeFile(outputPath, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);
  await fs.copyFile(outputPath, path.join(outputRoot, 'latest-runs.jsonl'));
  console.log(
    JSON.stringify(
      {
        solverTarget: 'engine',
        enginePath: path.relative(repoRoot, enginePath),
        concurrency,
        engineTimeoutMs,
        runs: records.length,
        ok: records.filter((record) => record.status === 'ok').length,
        errors: records.filter((record) => record.status !== 'ok').length,
        output: path.relative(repoRoot, outputPath)
      },
      null,
      2
    )
  );
}

async function runBatch(enginePath, entries, concurrency, engineTimeoutMs) {
  const records = new Array(entries.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, entries.length);

  async function worker() {
    while (nextIndex < entries.length) {
      const index = nextIndex;
      nextIndex += 1;
      const entry = entries[index];
      const input = JSON.parse(await fs.readFile(path.join(repoRoot, entry.inputPath), 'utf8'));
      records[index] = await runInstance(enginePath, entry, input, engineTimeoutMs);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return records;
}

async function runInstance(enginePath, entry, input, engineTimeoutMs) {
  const requestId = `analytics-${entry.instanceId}-${entry.seed}`;
  const startedAt = performance.now();
  const result = await runEngine(enginePath, {
    requestId,
    input
  }, engineTimeoutMs);
  const wallTimeMs = Number((performance.now() - startedAt).toFixed(2));

  const base = {
    runId: requestId,
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

  if (result.exitCode !== 0 || result.timedOut) {
    return {
      ...base,
      feasible: null,
      requiredFlow: null,
      maxFlow: null,
      uncoveredDaysCount: null,
      nodes: null,
      edges: null,
      edgesPerNode: null,
      runtimeMs: null,
      status: 'error',
      errorCode: result.timedOut ? 'ENGINE_TIMEOUT' : parseEngineError(result.stderr)?.error?.code ?? `EXIT_${result.exitCode}`
    };
  }

  const response = JSON.parse(result.stdout);
  const nodes = response.stats?.nodes ?? null;
  const edges = response.stats?.edges ?? null;

  return {
    ...base,
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
