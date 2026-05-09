import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const analyticsRoot = path.join(repoRoot, 'data/analytics');

async function main() {
  const inputPath = path.resolve(repoRoot, process.env.ANALYTICS_RUNS_FILE ?? 'data/analytics/latest-runs.jsonl');
  const records = await readJsonl(inputPath);
  const summaries = summarize(records);

  await fs.mkdir(analyticsRoot, { recursive: true });
  const jsonPath = path.join(analyticsRoot, 'latest-summary.json');
  const csvPath = path.join(analyticsRoot, 'latest-summary.csv');

  await fs.writeFile(jsonPath, `${JSON.stringify(summaries, null, 2)}\n`);
  await fs.writeFile(csvPath, toCsv(summaries));

  console.log(
    JSON.stringify(
      {
        input: path.relative(repoRoot, inputPath),
        scenarios: summaries.length,
        json: path.relative(repoRoot, jsonPath),
        csv: path.relative(repoRoot, csvPath)
      },
      null,
      2
    )
  );
}

async function readJsonl(inputPath) {
  const content = await fs.readFile(inputPath, 'utf8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function summarize(records) {
  const groups = new Map();
  for (const record of records) {
    const group = groups.get(record.scenarioName) ?? [];
    group.push(record);
    groups.set(record.scenarioName, group);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([scenarioName, group]) => {
      const okRuns = group.filter((record) => record.status === 'ok');
      const runtimes = okRuns.map((record) => record.runtimeMs).filter(isNumber).sort((left, right) => left - right);
      const wallTimes = group.map((record) => record.wallTimeMs).filter(isNumber).sort((left, right) => left - right);
      const feasibleRuns = okRuns.filter((record) => record.feasible).length;
      const avgEdges = average(okRuns.map((record) => record.edges).filter(isNumber));
      const avgNodes = average(okRuns.map((record) => record.nodes).filter(isNumber));

      return {
        scenarioName,
        runs: group.length,
        okRuns: okRuns.length,
        errorRuns: group.length - okRuns.length,
        feasibleRuns,
        infeasibleRuns: okRuns.length - feasibleRuns,
        feasibilityRatePct: percentage(feasibleRuns, okRuns.length),
        avgUncoveredDays: round2(average(okRuns.map((record) => record.uncoveredDaysCount).filter(isNumber))),
        avgNodes: round2(avgNodes),
        avgEdges: round2(avgEdges),
        avgEdgesPerNode: avgNodes > 0 ? round4(avgEdges / avgNodes) : 0,
        p50RuntimeMs: percentile(runtimes, 0.5),
        p95RuntimeMs: percentile(runtimes, 0.95),
        p99RuntimeMs: percentile(runtimes, 0.99),
        maxRuntimeMs: runtimes.at(-1) ?? 0,
        p95WallTimeMs: percentile(wallTimes, 0.95),
        maxWallTimeMs: wallTimes.at(-1) ?? 0
      };
    });
}

function toCsv(rows) {
  if (rows.length === 0) {
    return '';
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvValue(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function csvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const raw = String(value);
  return raw.includes(',') || raw.includes('"') || raw.includes('\n') ? `"${raw.replaceAll('"', '""')}"` : raw;
}

function percentile(values, ratio) {
  if (values.length === 0) {
    return 0;
  }
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * ratio) - 1));
  return values[index];
}

function percentage(part, total) {
  return total === 0 ? 0 : round2((100 * part) / total);
}

function average(values) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round2(value) {
  return Number(value.toFixed(2));
}

function round4(value) {
  return Number(value.toFixed(4));
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
