import type { RunDetailV1, RunStatusV1, RunSummaryV1, SolveRequestV1, SolveResponseV1 } from '@maxflow/contracts';

export type InsertRunInput = {
  runId: string;
  createdAt: string;
  input: SolveRequestV1;
  response: SolveResponseV1;
  contractVersion: string;
  engineVersion?: string;
};

export type ListRunsQuery = {
  limit: number;
  offset: number;
  status?: RunStatusV1;
  instanceId?: string;
};

export type RunsListResult = {
  items: RunSummaryV1[];
  total: number;
};

export type RunsStore = {
  insertRun(input: InsertRunInput): void;
  listRuns(query: ListRunsQuery): RunsListResult;
  getRun(runId: string): RunDetailV1 | null;
  close(): void;
};

