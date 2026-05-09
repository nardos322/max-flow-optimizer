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
  await fs.mkdir(outputRoot, { recursive: true });

  const timestamp = createTimestamp();
  const outputPath = path.join(outputRoot, `runs-${timestamp}.jsonl`);
  const records = [];

  for (const entry of manifest.scenarios) {
    const input = JSON.parse(await fs.readFile(path.join(repoRoot, entry.inputPath), 'utf8'));
    const record = await runInstance(enginePath, entry, input);
    records.push(record);
    await fs.appendFile(outputPath, `${JSON.stringify(record)}\n`);
  }

  await fs.copyFile(outputPath, path.join(outputRoot, 'latest-runs.jsonl'));
  console.log(
    JSON.stringify(
      {
        solverTarget: 'engine',
        enginePath: path.relative(repoRoot, enginePath),
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

async function runInstance(enginePath, entry, input) {
  const requestId = `analytics-${entry.instanceId}-${entry.seed}`;
  const startedAt = performance.now();
  const result = await runEngine(enginePath, {
    requestId,
    input
  });
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

  if (result.exitCode !== 0) {
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
      errorCode: parseEngineError(result.stderr)?.error?.code ?? `EXIT_${result.exitCode}`
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

function runEngine(enginePath, payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(enginePath, ['--stdin'], {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'pipe']
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
      resolve({
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim()
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
