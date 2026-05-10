-- Relationship between graph size and runtime.
select
  scenarioName,
  avg(nodes) as avgNodes,
  avg(edges) as avgEdges,
  avg(edgesPerNode) as avgEdgesPerNode,
  avg(runtimeMs) as avgRuntimeMs,
  max(runtimeMs) as maxRuntimeMs
from read_parquet('data/analytics/latest-runs.parquet')
where status = 'ok'
group by scenarioName
order by avgEdges desc;
