import type { RunDetailV1, RunStatusV1, RunSummaryV1, SolveRequestV1, SolveResponseV1 } from '@maxflow/contracts';

export type RunRow = {
  run_id: string;
  instance_id: string;
  created_at: string;
  status: RunStatusV1;
  feasible: 0 | 1;
  required_flow: number;
  max_flow: number;
  runtime_ms: number;
  nodes: number;
  edges: number;
  input_hash: string;
  source: string;
};

export type RunDetailRow = RunRow & {
  input_json: string;
  response_json: string;
};

export function mapSummaryRow(row: RunRow): RunSummaryV1 {
  return {
    runId: row.run_id,
    instanceId: row.instance_id,
    createdAt: row.created_at,
    status: row.status,
    feasible: row.feasible === 1,
    requiredFlow: row.required_flow,
    maxFlow: row.max_flow,
    runtimeMs: row.runtime_ms,
    nodes: row.nodes,
    edges: row.edges,
    inputHash: row.input_hash,
    source: row.source
  };
}

export function mapDetailRow(row: RunDetailRow): RunDetailV1 {
  return {
    runId: row.run_id,
    instanceId: row.instance_id,
    createdAt: row.created_at,
    status: row.status,
    input: JSON.parse(row.input_json) as SolveRequestV1,
    response: JSON.parse(row.response_json) as SolveResponseV1
  };
}

