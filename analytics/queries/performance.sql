-- Runtime summary by scenario.
-- DuckDB supports quantile_cont for percentile-style analysis.
select
  scenarioName,
  count(*) as runs,
  min(runtimeMs) as minRuntimeMs,
  quantile_cont(runtimeMs, 0.5) as p50RuntimeMs,
  quantile_cont(runtimeMs, 0.95) as p95RuntimeMs,
  max(runtimeMs) as maxRuntimeMs,
  max(wallTimeMs) as maxWallTimeMs
from read_json_auto('data/analytics/latest-runs.jsonl')
where status = 'ok'
group by scenarioName
order by scenarioName;
