import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(repoRoot, 'data/analytics');

async function main() {
  const runIdInput = process.env.ANALYTICS_RUN_ID?.trim();
  const latestRun = await readRequiredJson(path.join(outputRoot, 'latest-run.json'), 'Run metadata');
  const run = runIdInput ? await readRunMetadata(runIdInput) : latestRun;
  const quality = await readRequiredJson(path.join(outputRoot, 'latest-quality.json'), 'Quality report');
  const summaries = await readRequiredJson(path.join(outputRoot, 'latest-summary.json'), 'Summary report');
  const checks = [];

  checks.push(check('run_metadata_present', Boolean(run), { runId: runIdInput ?? latestRun.runId ?? null }));
  checks.push(check('quality_passed', quality.status === 'passed', { status: quality.status }));
  checks.push(check('quality_has_checks', Number.isInteger(quality.totalChecks) && quality.totalChecks > 0, {
    totalChecks: quality.totalChecks ?? null,
    failedChecks: quality.failedChecks ?? null
  }));
  checks.push(check('summary_has_rows', Array.isArray(summaries) && summaries.length > 0, {
    scenarios: Array.isArray(summaries) ? summaries.length : null
  }));

  if (run) {
    checks.push(await checkRunOutput(run));
    checks.push(checkManifestFingerprint(run));
    checks.push(checkSummaryCounts(run, summaries));
  }

  checks.push(await checkOptionalReport());

  const failed = checks.filter((item) => !item.passed);
  const result = {
    status: failed.length === 0 ? 'passed' : 'failed',
    runId: run?.runId ?? null,
    totalChecks: checks.length,
    failedChecks: failed.length,
    checks
  };

  console.log(JSON.stringify(result, null, 2));
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function readRunMetadata(runId) {
  const runPath = path.join(outputRoot, 'runs', `runId=${runId}`, 'run.json');
  try {
    return await readRequiredJson(runPath, `Run metadata for ${runId}`);
  } catch (error) {
    throw new Error(
      `${error.message}\nRun pnpm analytics:run with ANALYTICS_RUN_ID=${runId}, or verify the latest run without ANALYTICS_RUN_ID.`
    );
  }
}

async function checkRunOutput(run) {
  const outputPath = run.parquetOutput ?? run.jsonlOutput ?? run.output;
  if (!outputPath) {
    return check('run_output_exists', false, { output: null });
  }
  const absoluteOutputPath = path.resolve(repoRoot, outputPath);
  return check('run_output_exists', await pathExists(absoluteOutputPath), {
    output: path.relative(repoRoot, absoluteOutputPath)
  });
}

function checkManifestFingerprint(run) {
  const fingerprint = run.manifestFingerprint;
  const passed =
    fingerprint &&
    typeof fingerprint.sha256 === 'string' &&
    fingerprint.sha256.length === 64 &&
    Number.isInteger(fingerprint.entries) &&
    fingerprint.entries >= 0 &&
    Array.isArray(fingerprint.scenarios);

  return check('manifest_fingerprint_present', passed, {
    entries: fingerprint?.entries ?? null,
    scenarios: fingerprint?.scenarios?.length ?? null,
    sha256: fingerprint?.sha256 ?? null
  });
}

function checkSummaryCounts(run, summaries) {
  const summaryRuns = Array.isArray(summaries) ? summaries.reduce((total, row) => total + (row.runs ?? 0), 0) : 0;
  return check('summary_counts_match_run', summaryRuns === run.runs, {
    summaryRuns,
    runRows: run.runs ?? null
  });
}

async function checkOptionalReport() {
  const reportPath = path.join(repoRoot, 'analytics/reports/latest-report.md');
  const exists = await pathExists(reportPath);
  const requireReport = readBooleanEnv('ANALYTICS_VERIFY_REQUIRE_REPORT', false);
  return check('report_exists', !requireReport || exists, {
    report: path.relative(repoRoot, reportPath),
    exists,
    required: requireReport
  });
}

function check(name, passed, details) {
  return {
    name,
    passed: Boolean(passed),
    details
  };
}

async function readRequiredJson(filePath, label) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`${label} not found: ${path.relative(repoRoot, filePath)}`);
    }
    throw error;
  }
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function readBooleanEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  if (['1', 'true', 'yes'].includes(value.toLowerCase())) {
    return true;
  }
  if (['0', 'false', 'no'].includes(value.toLowerCase())) {
    return false;
  }
  throw new Error(`${name} must be a boolean value: true/false or 1/0.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
