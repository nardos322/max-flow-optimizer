import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

async function main() {
  const summaryPath = path.join(repoRoot, 'data/analytics/latest-summary.json');
  const runsPath = path.resolve(repoRoot, process.env.ANALYTICS_RUNS_FILE ?? 'data/analytics/latest-runs.jsonl');
  const reportPath = path.join(repoRoot, 'analytics/reports/latest-report.md');
  const summaries = JSON.parse(await fs.readFile(summaryPath, 'utf8'));

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, renderReport(summaries, runsPath));

  console.log(
    JSON.stringify(
      {
        summary: path.relative(repoRoot, summaryPath),
        report: path.relative(repoRoot, reportPath)
      },
      null,
      2
    )
  );
}

function renderReport(summaries, runsPath) {
  const totalRuns = summaries.reduce((sum, row) => sum + row.runs, 0);
  const generatedAt = new Date().toISOString();

  return `# Analytics Report

Generated at: \`${generatedAt}\`

Runs file: \`${path.relative(repoRoot, runsPath)}\`

## Summary

- Total scenarios: ${summaries.length}
- Total runs: ${totalRuns}
- Solver target: \`engine\`

## Scenario Results

| Scenario | Runs | Feasible % | p50 runtime | p95 runtime | Max runtime | Avg edges |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${summaries.map(renderSummaryRow).join('\n')}

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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
