import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const testDataRoot = path.join(repoRoot, 'packages', 'test-data');
const defaultEnginePath = path.join(repoRoot, 'services', 'engine-cpp', 'build', 'maxflow_engine');
const enginePath = process.env.ENGINE_PATH?.trim() || defaultEnginePath;
const generatedLimit = parsePositiveInteger(process.env.ANALYTICS_COMPARE_GENERATED_LIMIT ?? '10');
const outputJsonPath = path.join(repoRoot, 'analytics', 'reports', 'performance-comparison.json');
const outputMarkdownPath = path.join(repoRoot, 'analytics', 'reports', 'performance-comparison.md');

async function main() {
  const datasets = [
    ...(await loadFixtureDatasets()),
    ...(await loadGeneratedDatasets())
  ];

  if (datasets.length === 0) {
    throw new Error('No datasets found for comparison.');
  }

  const rows = [];
  for (const dataset of datasets) {
    rows.push(await runDataset(dataset));
  }

  const generatedAt = new Date().toISOString();
  const report = {
    generatedAt,
    enginePath: path.relative(repoRoot, enginePath),
    rows
  };

  await fs.mkdir(path.dirname(outputJsonPath), { recursive: true });
  await fs.writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(outputMarkdownPath, renderMarkdown(report));

  console.log(
    JSON.stringify(
      {
        rows: rows.length,
        json: path.relative(repoRoot, outputJsonPath),
        markdown: path.relative(repoRoot, outputMarkdownPath)
      },
      null,
      2
    )
  );
}

async function loadFixtureDatasets() {
  const manifest = await readJson(path.join(testDataRoot, 'fixtures.manifest.json'));
  const runnableCategories = new Set(['feasible', 'infeasible', 'smoke', 'benchmark']);

  return Promise.all(
    manifest.fixtures
      .filter((fixture) => runnableCategories.has(fixture.category))
      .map(async (fixture) => {
        const input = await readJson(path.join(testDataRoot, fixture.inputPath));
        return {
          source: 'fixture',
          dataset: fixture.id,
          category: fixture.category,
          input,
          requestPayload: {
            requestId: `compare-${fixture.id}`,
            input
          },
          mode: 'single'
        };
      })
  );
}

async function loadGeneratedDatasets() {
  const manifestPath = path.join(repoRoot, 'data', 'generated', 'manifest.json');
  const manifest = await readJsonIfExists(manifestPath);
  if (!manifest?.scenarios || generatedLimit === 0) {
    return [];
  }

  const selected = [];
  const seenScenarioNames = new Set();
  for (const scenario of manifest.scenarios) {
    if (seenScenarioNames.has(scenario.scenarioName)) {
      continue;
    }
    seenScenarioNames.add(scenario.scenarioName);
    selected.push(scenario);
    if (selected.length >= generatedLimit) {
      break;
    }
  }

  return selected.map((scenario) => ({
    source: 'generated',
    dataset: scenario.instanceId,
    category: scenario.scenarioName,
    input: null,
    requestPayload: {
      requestId: `compare-${scenario.instanceId}`,
      scenarioName: scenario.scenarioName,
      seed: scenario.seed,
      instanceId: scenario.instanceId,
      daysCount: scenario.daysCount,
      medicsCount: scenario.medicsCount,
      periodsCount: scenario.periodsCount,
      availabilityDensity: scenario.availabilityDensity,
      maxDaysPerMedic: scenario.maxDaysPerMedic
    },
    mode: 'analytics'
  }));
}

async function runDataset(dataset) {
  const startedAt = process.hrtime.bigint();
  const result =
    dataset.mode === 'analytics'
      ? await runEngine(['--stdin', '--analytics-jsonl'], `${JSON.stringify(dataset.requestPayload)}\n`)
      : await runEngine(['--stdin'], `${JSON.stringify(dataset.requestPayload)}\n`);
  const wallTimeMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);

  if (result.exitCode !== 0) {
    return {
      source: dataset.source,
      dataset: dataset.dataset,
      category: dataset.category,
      status: 'error',
      error: result.stderr || result.stdout,
      wallTimeMs
    };
  }

  const response = JSON.parse(dataset.mode === 'analytics' ? result.stdout.split('\n')[0] : result.stdout);
  if (response.error) {
    return {
      source: dataset.source,
      dataset: dataset.dataset,
      category: dataset.category,
      status: 'error',
      error: response.error,
      wallTimeMs
    };
  }

  return {
    source: dataset.source,
    dataset: dataset.dataset,
    category: dataset.category,
    status: 'ok',
    days: dataset.input?.days.length ?? dataset.requestPayload.daysCount,
    medics: dataset.input?.medics.length ?? dataset.requestPayload.medicsCount,
    periods: dataset.input?.periods.length ?? dataset.requestPayload.periodsCount,
    availability: dataset.input?.availability.length ?? response.analytics?.availabilityPairs ?? null,
    feasible: response.feasible,
    requiredFlow: response.requiredFlow,
    maxFlow: response.maxFlow,
    nodes: response.stats?.nodes ?? null,
    edges: response.stats?.edges ?? null,
    runtimeMs: response.stats?.runtimeMs ?? null,
    wallTimeMs
  };
}

function runEngine(args, stdinPayload) {
  return new Promise((resolve, reject) => {
    const child = spawn(enginePath, args, {
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
    child.stdin.end(stdinPayload);
  });
}

function renderMarkdown(report) {
  return `# Performance Comparison

Generated at: \`${report.generatedAt}\`

Engine: \`${report.enginePath}\`

| Source | Dataset | Category | Status | Days | Medics | Availability | Feasible | Flow | Nodes | Edges | Runtime | Wall time |
| --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
${report.rows.map(renderRow).join('\n')}
`;
}

function renderRow(row) {
  if (row.status !== 'ok') {
    return `| ${row.source} | \`${row.dataset}\` | \`${row.category}\` | error | - | - | - | - | - | - | - | - | ${row.wallTimeMs} ms |`;
  }

  return `| ${row.source} | \`${row.dataset}\` | \`${row.category}\` | ok | ${row.days} | ${row.medics} | ${row.availability ?? '-'} | ${row.feasible} | ${row.maxFlow}/${row.requiredFlow} | ${row.nodes} | ${row.edges} | ${row.runtimeMs} ms | ${row.wallTimeMs} ms |`;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error('ANALYTICS_COMPARE_GENERATED_LIMIT must be a non-negative integer.');
  }
  return parsed;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
