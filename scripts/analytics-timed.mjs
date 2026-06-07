import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'data/analytics/latest-timing.json');

const stages = [
  { name: 'generate', script: 'scripts/analytics-generate.mjs' },
  { name: 'run', script: 'scripts/analytics-run.mjs' },
  { name: 'aggregate', script: 'scripts/analytics-aggregate.mjs' },
  { name: 'report', script: 'scripts/analytics-report.mjs' }
];

async function main() {
  const startedAt = new Date();
  const startedAtMs = performance.now();
  const stageResults = [];

  for (const stage of stages) {
    stageResults.push(await runStage(stage));
  }

  const totalSeconds = secondsSince(startedAtMs);
  const latestRun = await readJsonIfExists(path.join(repoRoot, 'data/analytics/latest-run.json'));
  const summary = {
    runId: latestRun?.runId ?? process.env.ANALYTICS_RUN_ID ?? null,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    totalSeconds,
    rowsPerSecond: latestRun?.rowsPerSecond ?? null,
    runDiagnostics: latestRun
      ? {
          engineRuntimeSecondsTotal: latestRun.engineRuntimeSecondsTotal,
          engineInternalBreakdownSeconds: latestRun.engineInternalBreakdownSeconds,
          amortizedWallTimeSecondsTotal: latestRun.amortizedWallTimeSecondsTotal,
          estimatedRunnerOverheadSeconds: latestRun.estimatedRunnerOverheadSeconds,
          estimatedIdealSecondsAtConcurrency: latestRun.estimatedIdealSecondsAtConcurrency
        }
      : null,
    stages: Object.fromEntries(
      stageResults.map((stage) => [
        stage.name,
        {
          seconds: stage.seconds,
          exitCode: stage.exitCode
        }
      ])
    )
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);

  console.log('\nAnalytics timing');
  console.log('| Stage | Seconds |');
  console.log('| --- | ---: |');
  for (const stage of stageResults) {
    console.log(`| ${stage.name} | ${stage.seconds} |`);
  }
  console.log(`| total | ${totalSeconds} |`);
  console.log(`\nTiming summary: ${path.relative(repoRoot, outputPath)}`);
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function runStage(stage) {
  const startedAtMs = performance.now();
  console.log(`\n[analytics:timed] ${stage.name} started`);
  const exitCode = await runNodeScript(path.join(repoRoot, stage.script));
  const seconds = secondsSince(startedAtMs);
  console.log(`[analytics:timed] ${stage.name} finished in ${seconds}s`);
  return {
    name: stage.name,
    seconds,
    exitCode
  };
}

function runNodeScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve(exitCode);
        return;
      }
      reject(new Error(`${path.relative(repoRoot, scriptPath)} failed with exit code ${exitCode}.`));
    });
  });
}

function secondsSince(startedAtMs) {
  return Number(((performance.now() - startedAtMs) / 1000).toFixed(2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
