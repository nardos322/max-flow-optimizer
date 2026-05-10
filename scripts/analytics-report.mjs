import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const reportTimeZone = 'America/Argentina/Buenos_Aires';

async function main() {
  const summaryPath = path.join(repoRoot, 'data/analytics/latest-summary.json');
  const runsPath = path.resolve(repoRoot, process.env.ANALYTICS_RUNS_FILE ?? 'data/analytics/latest-runs.jsonl');
  const parquetPath = path.join(repoRoot, 'data/analytics/latest-runs.parquet');
  const qualityPath = path.join(repoRoot, 'data/analytics/latest-quality.json');
  const comparisonPath = path.join(repoRoot, 'data/analytics/latest-comparison.json');
  const duckdbOutputPath = path.join(repoRoot, 'data/analytics/duckdb');
  const reportPath = path.join(repoRoot, 'analytics/reports/latest-report.md');
  const summaries = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
  const quality = await readJsonIfExists(qualityPath);
  const comparison = await readJsonIfExists(comparisonPath);
  const duckdbOutputs = await listDuckdbOutputs(duckdbOutputPath);
  const charts = getChartReferences();

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(
    reportPath,
    renderReport(summaries, { runsPath, parquetPath, quality, comparison, duckdbOutputs, charts })
  );

  console.log(
    JSON.stringify(
      {
        summary: path.relative(repoRoot, summaryPath),
        quality: path.relative(repoRoot, qualityPath),
        comparison: path.relative(repoRoot, comparisonPath),
        duckdb: duckdbOutputs.map((item) => item.relativePath),
        report: path.relative(repoRoot, reportPath),
        charts: charts.map((chart) => `analytics/reports/charts/${chart.fileName}`)
      },
      null,
      2
    )
  );
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

async function listDuckdbOutputs(outputPath) {
  try {
    const entries = await fs.readdir(outputPath);
    return entries
      .filter((entry) => entry.endsWith('.json') || entry.endsWith('.csv'))
      .sort()
      .map((entry) => ({
        fileName: entry,
        relativePath: path.relative(repoRoot, path.join(outputPath, entry))
      }));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function renderReport(summaries, { runsPath, parquetPath, quality, comparison, duckdbOutputs, charts }) {
  const totalRuns = summaries.reduce((sum, row) => sum + row.runs, 0);
  const generatedAt = formatReportDate(new Date());

  return `# Analytics Report

Generated at: \`${generatedAt}\`

Runs file: \`${path.relative(repoRoot, runsPath)}\`

Parquet file: \`${path.relative(repoRoot, parquetPath)}\`

## Summary

- Total scenarios: ${summaries.length}
- Total runs: ${totalRuns}
- Solver target: \`engine\`
- Quality status: \`${quality?.status ?? 'not available'}\`

## Scenario Results

| Scenario | Runs | Feasible % | p50 runtime | p95 runtime | Max runtime | Avg edges |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${summaries.map(renderSummaryRow).join('\n')}

## Charts

${charts.map(renderChartReference).join('\n\n')}

## Data Quality

${renderQualitySection(quality)}

## Previous Run Comparison

${renderComparisonSection(comparison)}

## DuckDB Query Outputs

${renderDuckdbSection(duckdbOutputs)}

## Initial Reading

- Scenarios with lower availability density should show lower feasibility rates.
- Runtime should grow with graph size, especially with higher edge counts.
- \`wallTimeMs\` includes process overhead; \`runtimeMs\` is the engine-reported solver time.

## Reproduce

\`\`\`bash
pnpm run build:engine
pnpm analytics:generate
pnpm analytics:run
pnpm analytics:aggregate
pnpm analytics:report
\`\`\`
`;
}

function renderSummaryRow(row) {
  return `| \`${row.scenarioName}\` | ${row.runs} | ${row.feasibilityRatePct} | ${row.p50RuntimeMs} ms | ${row.p95RuntimeMs} ms | ${row.maxRuntimeMs} ms | ${row.avgEdges} |`;
}

function renderChartReference(chart) {
  return `### ${chart.title}\n\n![${chart.title}](charts/${chart.fileName})`;
}

function renderQualitySection(quality) {
  if (!quality) {
    return 'Quality report not found. Run `pnpm analytics:aggregate` before generating the report.';
  }

  const failedChecks = quality.checks.filter((check) => !check.passed);
  if (failedChecks.length === 0) {
    return `- Status: \`${quality.status}\`\n- Checks: ${quality.totalChecks}\n- Failed checks: 0`;
  }

  return [
    `- Status: \`${quality.status}\``,
    `- Checks: ${quality.totalChecks}`,
    `- Failed checks: ${quality.failedChecks}`,
    '',
    '| Check | Invalid rows | Sample run IDs |',
    '| --- | ---: | --- |',
    ...failedChecks.map(renderFailedQualityCheck)
  ].join('\n');
}

function renderFailedQualityCheck(check) {
  const invalidCount = check.details?.invalidCount ?? check.details?.missing?.length ?? 0;
  const sample = check.details?.sampleRunIds?.join(', ') ?? check.details?.missing?.join(', ') ?? '';
  return `| \`${check.name}\` | ${invalidCount} | ${sample || '-'} |`;
}

function renderComparisonSection(comparison) {
  if (!comparison) {
    return 'Comparison report not found. Run `pnpm analytics:aggregate` before generating the report.';
  }

  if (comparison.status === 'no_baseline') {
    return 'No previous historical summary exists yet. The next aggregate run will compare against this one.';
  }

  return [
    `Baseline: \`${comparison.baseline}\``,
    '',
    '| Scenario | Feasible delta | p95 runtime delta | Avg edges delta | Error runs delta |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...comparison.changes.map(renderComparisonRow)
  ].join('\n');
}

function renderComparisonRow(change) {
  if (change.status !== 'compared') {
    return `| \`${change.scenarioName}\` | ${change.status} | ${change.status} | ${change.status} | ${change.status} |`;
  }

  return `| \`${change.scenarioName}\` | ${formatDelta(change.metrics.feasibilityRatePct, '%')} | ${formatDelta(change.metrics.p95RuntimeMs, ' ms')} | ${formatDelta(change.metrics.avgEdges, '')} | ${formatDelta(change.metrics.errorRuns, '')} |`;
}

function renderDuckdbSection(duckdbOutputs) {
  if (duckdbOutputs.length === 0) {
    return 'DuckDB outputs not found. Run `pnpm analytics:aggregate` before generating the report.';
  }

  return [
    '| Output |',
    '| --- |',
    ...duckdbOutputs.map((item) => `| \`${item.relativePath}\` |`)
  ].join('\n');
}

function formatDelta(metric, suffix) {
  if (!metric || metric.delta === null) {
    return '-';
  }
  const sign = metric.delta > 0 ? '+' : '';
  const pct = metric.pctDelta === null ? '' : ` (${sign}${metric.pctDelta}%)`;
  return `${sign}${metric.delta}${suffix}${pct}`;
}

function getChartReferences() {
  return [
    {
      title: 'Feasibility Rate By Scenario',
      fileName: 'feasibility-rate.png'
    },
    {
      title: 'P95 Runtime By Scenario',
      fileName: 'p95-runtime.png'
    },
    {
      title: 'Average Graph Edges By Scenario',
      fileName: 'avg-edges.png'
    }
  ];
}

function formatReportDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: reportTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short'
  }).format(date);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
