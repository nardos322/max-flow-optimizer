import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

async function main() {
  const latestRun = await readLatestRun();
  const runIdInput = process.env.ANALYTICS_RUN_ID?.trim();
  const matchingLatestRun = !runIdInput || latestRun?.runId === runIdInput ? latestRun : null;
  const inputPath = path.resolve(repoRoot, process.env.ANALYTICS_RUNS_FILE ?? (await resolveDefaultRunsInput(latestRun)));
  const scriptPath = path.join(repoRoot, 'analytics/python/analyze_runs.py');
  const python = resolvePython();
  const args = [scriptPath, '--input', inputPath];

  if (matchingLatestRun) {
    args.push('--run-metadata', path.join(repoRoot, 'data/analytics/latest-run.json'));
    args.push('--run-summary-output', path.join(repoRoot, 'data/analytics/runs', `runId=${matchingLatestRun.runId}`, 'summary.json'));
  }
  if (process.env.ANALYTICS_EXPECTED_MANIFEST) {
    args.push('--expected-manifest', path.resolve(repoRoot, process.env.ANALYTICS_EXPECTED_MANIFEST));
  } else if (matchingLatestRun?.manifest) {
    args.push('--expected-manifest', path.resolve(repoRoot, matchingLatestRun.manifest));
  }
  const baselineSummary = resolveBaselineSummary();
  if (baselineSummary) {
    args.push('--baseline-summary', baselineSummary);
  }

  await runPython(python, args);
}

function resolveBaselineSummary() {
  if (process.env.ANALYTICS_BASELINE_SUMMARY?.trim()) {
    return path.resolve(repoRoot, process.env.ANALYTICS_BASELINE_SUMMARY);
  }

  const baselineRunId = process.env.ANALYTICS_BASELINE_RUN_ID?.trim();
  if (!baselineRunId) {
    return null;
  }

  return path.join(repoRoot, 'data/analytics/runs', `runId=${baselineRunId}`, 'summary.json');
}

async function resolveDefaultRunsInput(latestRun) {
  const runIdInput = process.env.ANALYTICS_RUN_ID?.trim();
  if (runIdInput) {
    const runPath = path.join(repoRoot, 'data/analytics/runs', `runId=${runIdInput}`);
    if (!fs.existsSync(runPath)) {
      throw new Error(`Analytics run id not found: ${runIdInput}. Expected ${path.relative(repoRoot, runPath)}.`);
    }
    return path.relative(repoRoot, runPath);
  }

  if (latestRun?.parquetOutput) {
    return latestRun.parquetOutput;
  }
  if (latestRun?.jsonlOutput) {
    return latestRun.jsonlOutput;
  }

  const latestJsonl = path.join(repoRoot, 'data/analytics/latest-runs.jsonl');

  if (fs.existsSync(latestJsonl)) {
    return 'data/analytics/latest-runs.jsonl';
  }
  throw new Error(
    'No analytics run metadata found. Run pnpm analytics:run first or pass ANALYTICS_RUN_ID/ANALYTICS_RUNS_FILE.'
  );
}

async function readLatestRun() {
  try {
    return JSON.parse(await fs.promises.readFile(path.join(repoRoot, 'data/analytics/latest-run.json'), 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function resolvePython() {
  if (process.env.PYTHON) {
    return process.env.PYTHON;
  }

  const localVenvPython = path.join(repoRoot, '.venv/bin/python');
  if (fs.existsSync(localVenvPython)) {
    return localVenvPython;
  }

  return 'python3';
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
          `Python analytics aggregation failed with exit code ${exitCode}. Install dependencies with: pnpm analytics:setup`
        )
      );
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
