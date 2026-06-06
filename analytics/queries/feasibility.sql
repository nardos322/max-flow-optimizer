-- Feasibility rate by scenario.
-- Reads the analytics_runs view registered by pnpm analytics:aggregate.
select
  scenarioName,
  count(*) as runs,
  sum(case when feasible then 1 else 0 end) as feasibleRuns,
  round(100.0 * sum(case when feasible then 1 else 0 end) / count(*), 2) as feasibilityRatePct
from analytics_runs
group by scenarioName
order by scenarioName;
