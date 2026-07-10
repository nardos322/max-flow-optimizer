import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';
import type {
  RunDetailV1,
  RunStatusV1,
  RunSummaryV1,
  SolveRequestV1,
  SolveResponseV1
} from '@maxflow/contracts';

type RunsStoreOptions = {
  dbPath: string;
};

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

type RunRow = {
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

type RunDetailRow = RunRow & {
  input_json: string;
  response_json: string;
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

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function createInputHash(input: SolveRequestV1): string {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(input)).digest('hex')}`;
}

function getRunStatus(response: SolveResponseV1): RunStatusV1 {
  return response.feasible ? 'feasible' : 'infeasible';
}

function getRunSource(input: SolveRequestV1): string {
  return input.metadata?.source ?? 'unknown';
}

function mapSummaryRow(row: RunRow): RunSummaryV1 {
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

function mapDetailRow(row: RunDetailRow): RunDetailV1 {
  return {
    runId: row.run_id,
    instanceId: row.instance_id,
    createdAt: row.created_at,
    status: row.status,
    input: JSON.parse(row.input_json) as SolveRequestV1,
    response: JSON.parse(row.response_json) as SolveResponseV1
  };
}

export function createRunsStore({ dbPath }: RunsStoreOptions): RunsStore {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      run_id TEXT PRIMARY KEY,
      instance_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL,
      feasible INTEGER NOT NULL,
      required_flow INTEGER NOT NULL,
      max_flow INTEGER NOT NULL,
      runtime_ms INTEGER NOT NULL,
      nodes INTEGER NOT NULL,
      edges INTEGER NOT NULL,
      input_json TEXT NOT NULL,
      response_json TEXT NOT NULL,
      diagnostics_json TEXT,
      input_hash TEXT NOT NULL,
      contract_version TEXT NOT NULL,
      engine_version TEXT,
      source TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS runs_created_at_idx ON runs (created_at DESC);
    CREATE INDEX IF NOT EXISTS runs_instance_id_idx ON runs (instance_id);
    CREATE INDEX IF NOT EXISTS runs_status_idx ON runs (status);
  `);

  const insertRunStatement = db.prepare(`
    INSERT INTO runs (
      run_id,
      instance_id,
      created_at,
      status,
      feasible,
      required_flow,
      max_flow,
      runtime_ms,
      nodes,
      edges,
      input_json,
      response_json,
      diagnostics_json,
      input_hash,
      contract_version,
      engine_version,
      source
    ) VALUES (
      @runId,
      @instanceId,
      @createdAt,
      @status,
      @feasible,
      @requiredFlow,
      @maxFlow,
      @runtimeMs,
      @nodes,
      @edges,
      @inputJson,
      @responseJson,
      @diagnosticsJson,
      @inputHash,
      @contractVersion,
      @engineVersion,
      @source
    )
  `);

  return {
    insertRun(input) {
      insertRunStatement.run({
        runId: input.runId,
        instanceId: input.input.instanceId,
        createdAt: input.createdAt,
        status: getRunStatus(input.response),
        feasible: input.response.feasible ? 1 : 0,
        requiredFlow: input.response.requiredFlow,
        maxFlow: input.response.maxFlow,
        runtimeMs: input.response.stats.runtimeMs,
        nodes: input.response.stats.nodes,
        edges: input.response.stats.edges,
        inputJson: JSON.stringify(input.input),
        responseJson: JSON.stringify(input.response),
        diagnosticsJson: input.response.feasible ? null : JSON.stringify(input.response.diagnostics),
        inputHash: createInputHash(input.input),
        contractVersion: input.contractVersion,
        engineVersion: input.engineVersion ?? null,
        source: getRunSource(input.input)
      });
    },

    listRuns(query) {
      const filters: string[] = [];
      const params: Record<string, string | number> = {
        limit: query.limit,
        offset: query.offset
      };

      if (query.status) {
        filters.push('status = @status');
        params.status = query.status;
      }

      if (query.instanceId) {
        filters.push('instance_id = @instanceId');
        params.instanceId = query.instanceId;
      }

      const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
      const rows = db
        .prepare(
          `
          SELECT
            run_id,
            instance_id,
            created_at,
            status,
            feasible,
            required_flow,
            max_flow,
            runtime_ms,
            nodes,
            edges,
            input_hash,
            source
          FROM runs
          ${whereClause}
          ORDER BY created_at DESC, run_id DESC
          LIMIT @limit OFFSET @offset
        `
        )
        .all(params) as RunRow[];
      const totalRow = db.prepare(`SELECT COUNT(*) AS total FROM runs ${whereClause}`).get(params) as { total: number };

      return {
        items: rows.map(mapSummaryRow),
        total: totalRow.total
      };
    },

    getRun(runId) {
      const row = db
        .prepare(
          `
          SELECT
            run_id,
            instance_id,
            created_at,
            status,
            feasible,
            required_flow,
            max_flow,
            runtime_ms,
            nodes,
            edges,
            input_hash,
            source,
            input_json,
            response_json
          FROM runs
          WHERE run_id = ?
        `
        )
        .get(runId) as RunDetailRow | undefined;

      return row ? mapDetailRow(row) : null;
    },

    close() {
      db.close();
    }
  };
}
