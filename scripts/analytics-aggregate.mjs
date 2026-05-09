import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

async function main() {
  const inputPath = path.resolve(repoRoot, process.env.ANALYTICS_RUNS_FILE ?? 'data/analytics/latest-runs.jsonl');
  const scriptPath = path.join(repoRoot, 'analytics/python/analyze_runs.py');
  const python = resolvePython();

  await runPython(python, [scriptPath, '--input', inputPath]);
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
