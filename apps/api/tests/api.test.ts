import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { Logger } from 'pino';

import { createValidatorSet } from '@maxflow/contracts';

import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import type { EngineClient } from '../src/engineClient.js';
import { ApiHttpError } from '../src/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const testDataRoot = path.join(repoRoot, 'packages', 'test-data');
const enginePath = path.join(repoRoot, 'services', 'engine-cpp', 'build', 'maxflow_engine');

const validators = createValidatorSet();
const app = createApp({
  config: loadConfig({
    cwd: repoRoot,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ENGINE_PATH: enginePath,
      LOG_LEVEL: 'silent',
      RUNS_PERSISTENCE_ENABLED: 'false'
    }
  })
});

type CapturedLog = {
  level: 'info' | 'error';
  payload: Record<string, unknown>;
  message: string;
};

function readJson<T extends string | object = Record<string, unknown>>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(testDataRoot, relativePath), 'utf8')) as T;
}

function createCapturingLogger(): { logger: Logger; logs: CapturedLog[] } {
  const logs: CapturedLog[] = [];
  const logger = {
    info(payload: Record<string, unknown>, message: string) {
      logs.push({ level: 'info', payload, message });
    },
    error(payload: Record<string, unknown>, message: string) {
      logs.push({ level: 'error', payload, message });
    }
  } as unknown as Logger;

  return { logger, logs };
}

function normalizeRuntimeMs(payload: unknown): unknown {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'stats' in payload &&
    typeof (payload as { stats?: unknown }).stats === 'object' &&
    (payload as { stats?: unknown }).stats !== null
  ) {
    return {
      ...payload,
      stats: {
        ...(payload as { stats: Record<string, unknown> }).stats,
        runtimeMs: 0
      }
    };
  }

  return payload;
}

describe('API v1', () => {
  it('responds to GET /health', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
    expect(validators.validateHealthResponse(response.body)).toBe(true);
  });

  it.each([
    ['tiny-feasible', 'input/tiny-feasible.json', 'expected/tiny-feasible.response.json'],
    [
      'tiny-infeasible-availability',
      'input/tiny-infeasible-availability.json',
      'expected/tiny-infeasible-availability.response.json'
    ],
    ['tiny-infeasible-capacity', 'input/tiny-infeasible-capacity.json', 'expected/tiny-infeasible-capacity.response.json'],
    [
      'tiny-infeasible-per-period',
      'input/tiny-infeasible-per-period.json',
      'expected/tiny-infeasible-per-period.response.json'
    ]
  ])('solves canonical fixture %s', async (_id, inputPath, expectedPath) => {
    const response = await request(app).post('/v1/solve').send(readJson(inputPath)).expect(200);

    expect(validators.validateSolveResponse(response.body)).toBe(true);
    expect(normalizeRuntimeMs(response.body)).toEqual(readJson(expectedPath));
  });

  it.each([
    ['invalid-duplicate-id', 'input/invalid-duplicate-id.json', 'expected/invalid-duplicate-id.error.json'],
    [
      'invalid-duplicate-day-date',
      'input/invalid-duplicate-day-date.json',
      'expected/invalid-duplicate-day-date.error.json'
    ],
    ['invalid-day-without-period', 'input/invalid-day-without-period.json', 'expected/invalid-day-without-period.error.json'],
    [
      'invalid-day-in-multiple-periods',
      'input/invalid-day-in-multiple-periods.json',
      'expected/invalid-day-in-multiple-periods.error.json'
    ]
  ])('returns canonical validation error for %s', async (_id, inputPath, expectedPath) => {
    const response = await request(app).post('/v1/solve').send(readJson(inputPath)).expect(400);
    const expected = readJson(expectedPath) as { error: Record<string, unknown> };

    expect(validators.validateApiError(response.body)).toBe(true);
    expect(response.body.error).toMatchObject({
      code: expected.error.code,
      message: expected.error.message,
      details: expected.error.details
    });
    expect(response.body.error.requestId).toEqual(expect.any(String));
    expect(new Date(response.body.error.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('rejects malformed request bodies before domain validation', async () => {
    const response = await request(app)
      .post('/v1/solve')
      .send({
        instanceId: 'broken',
        maxDaysPerMedic: 1,
        periods: [{ id: 'p1', dayIds: ['d1'] }],
        days: [{ id: 'd1' }],
        medics: [{ id: 'm1', name: 'Ana' }],
        availability: []
      })
      .expect(400);

    expect(validators.validateApiError(response.body)).toBe(true);
    expect(response.body.error.code).toBe('INVALID_INPUT');
    expect(response.body.error.details.path).toBe('days.0.date');
  });

  it('returns a clear error for oversized request bodies', async () => {
    const oversizedApp = createApp({
      config: loadConfig({
        cwd: repoRoot,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          ENGINE_PATH: enginePath,
          LOG_LEVEL: 'silent',
          RUNS_PERSISTENCE_ENABLED: 'false',
          MAX_REQUEST_BYTES: '100'
        }
      })
    });

    const response = await request(oversizedApp).post('/v1/solve').send(readJson('input/tiny-feasible.json')).expect(400);

    expect(validators.validateApiError(response.body)).toBe(true);
    expect(response.body.error.code).toBe('INVALID_INPUT');
    expect(response.body.error.message).toBe('Request body exceeds MAX_REQUEST_BYTES.');
    expect(response.body.error.details.limit).toBe(100);
  });

  it('reuses the same requestId across API errors and engine calls', async () => {
    let engineRequestId: string | undefined;
    const engineClient: EngineClient = {
      async solve(requestId) {
        engineRequestId = requestId;
        throw new ApiHttpError(500, 'ENGINE_TIMEOUT', 'Engine execution timed out.');
      }
    };
    const correlatedApp = createApp({
      config: loadConfig({
        cwd: repoRoot,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          ENGINE_PATH: enginePath,
          LOG_LEVEL: 'silent',
          RUNS_PERSISTENCE_ENABLED: 'false'
        }
      }),
      engineClient
    });

    const response = await request(correlatedApp).post('/v1/solve').send(readJson('input/tiny-feasible.json')).expect(500);

    expect(response.body.error.requestId).toEqual(engineRequestId);
    expect(response.body.error.code).toBe('ENGINE_TIMEOUT');
  });

  it('logs request completion metadata with requestId', async () => {
    const { logger, logs } = createCapturingLogger();
    const loggingApp = createApp({
      config: loadConfig({
        cwd: repoRoot,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          ENGINE_PATH: enginePath,
          LOG_LEVEL: 'info',
          RUNS_PERSISTENCE_ENABLED: 'false'
        }
      }),
      logger
    });

    await request(loggingApp).get('/health').expect(200);

    const completedLog = logs.find((log) => log.level === 'info' && log.message === 'request completed');
    expect(completedLog?.payload).toMatchObject({
      method: 'GET',
      route: '/health',
      statusCode: 200
    });
    expect(completedLog?.payload.requestId).toEqual(expect.any(String));
    expect(completedLog?.payload.durationMs).toEqual(expect.any(Number));
  });

  it('adds errorCode to failed request completion logs', async () => {
    const { logger, logs } = createCapturingLogger();
    const loggingApp = createApp({
      config: loadConfig({
        cwd: repoRoot,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          ENGINE_PATH: enginePath,
          LOG_LEVEL: 'info',
          RUNS_PERSISTENCE_ENABLED: 'false'
        }
      }),
      logger
    });

    await request(loggingApp).post('/v1/solve').send(readJson('input/invalid-duplicate-id.json')).expect(400);

    const completedLog = logs.find((log) => log.level === 'info' && log.message === 'request completed');
    expect(completedLog?.payload).toMatchObject({
      method: 'POST',
      route: '/v1/solve',
      statusCode: 400,
      errorCode: 'DUPLICATE_ID'
    });
    expect(completedLog?.payload.requestId).toEqual(expect.any(String));
    expect(completedLog?.payload.instanceId).toBe('invalid-duplicate-id');
  });

  it('persists solve runs and exposes run history', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maxflow-runs-'));
    const input = {
      ...readJson<Record<string, unknown>>('input/tiny-feasible.json'),
      metadata: {
        source: 'web-fixture',
        datasetName: 'tiny-feasible'
      }
    };
    const runsApp = createApp({
      config: loadConfig({
        cwd: repoRoot,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          ENGINE_PATH: enginePath,
          LOG_LEVEL: 'silent',
          RUNS_DB_PATH: path.join(tempDir, 'runs.sqlite'),
          RUNS_PERSISTENCE_ENABLED: 'true'
        }
      })
    });

    const solveResponse = await request(runsApp).post('/v1/solve').send(input).expect(200);

    expect(validators.validateSolveResponse(solveResponse.body)).toBe(true);
    expect(solveResponse.body.runId).toEqual(expect.any(String));
    expect(new Date(solveResponse.body.createdAt).toString()).not.toBe('Invalid Date');

    const listResponse = await request(runsApp).get('/v1/runs').expect(200);

    expect(validators.validateRunsListResponse(listResponse.body)).toBe(true);
    expect(listResponse.body.pagination).toEqual({
      limit: 20,
      offset: 0,
      total: 1
    });
    expect(listResponse.body.items[0]).toMatchObject({
      runId: solveResponse.body.runId,
      instanceId: solveResponse.body.instanceId,
      status: 'feasible',
      feasible: true,
      requiredFlow: solveResponse.body.requiredFlow,
      maxFlow: solveResponse.body.maxFlow,
      runtimeMs: solveResponse.body.stats.runtimeMs,
      nodes: solveResponse.body.stats.nodes,
      edges: solveResponse.body.stats.edges,
      source: 'web-fixture'
    });
    expect(listResponse.body.items[0].inputHash).toMatch(/^sha256:/);

    const detailResponse = await request(runsApp).get(`/v1/runs/${solveResponse.body.runId}`).expect(200);

    expect(validators.validateRunDetail(detailResponse.body)).toBe(true);
    expect(detailResponse.body).toMatchObject({
      runId: solveResponse.body.runId,
      instanceId: solveResponse.body.instanceId,
      status: 'feasible',
      input,
      response: solveResponse.body
    });
  });

  it('filters and paginates persisted runs', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maxflow-runs-'));
    const runsApp = createApp({
      config: loadConfig({
        cwd: repoRoot,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          ENGINE_PATH: enginePath,
          LOG_LEVEL: 'silent',
          RUNS_DB_PATH: path.join(tempDir, 'runs.sqlite'),
          RUNS_PERSISTENCE_ENABLED: 'true'
        }
      })
    });

    await request(runsApp).post('/v1/solve').send(readJson('input/tiny-feasible.json')).expect(200);
    await request(runsApp).post('/v1/solve').send(readJson('input/tiny-infeasible-availability.json')).expect(200);

    const statusResponse = await request(runsApp).get('/v1/runs?status=infeasible').expect(200);
    expect(validators.validateRunsListResponse(statusResponse.body)).toBe(true);
    expect(statusResponse.body.pagination.total).toBe(1);
    expect(statusResponse.body.items[0].status).toBe('infeasible');

    const instanceResponse = await request(runsApp).get('/v1/runs?instanceId=tiny-feasible').expect(200);
    expect(instanceResponse.body.pagination.total).toBe(1);
    expect(instanceResponse.body.items[0].instanceId).toBe('tiny-feasible');

    const pagedResponse = await request(runsApp).get('/v1/runs?limit=1&offset=1').expect(200);
    expect(validators.validateRunsListResponse(pagedResponse.body)).toBe(true);
    expect(pagedResponse.body.items).toHaveLength(1);
    expect(pagedResponse.body.pagination).toEqual({
      limit: 1,
      offset: 1,
      total: 2
    });
  });

  it('returns run query validation errors and missing run errors', async () => {
    const response = await request(app).get('/v1/runs?status=unknown').expect(400);

    expect(validators.validateApiError(response.body)).toBe(true);
    expect(response.body.error.code).toBe('INVALID_INPUT');

    const missingResponse = await request(app).get('/v1/runs/missing-run').expect(404);

    expect(validators.validateApiError(missingResponse.body)).toBe(true);
    expect(missingResponse.body.error.code).toBe('NOT_FOUND');
  });

  it('maps engine failures to ENGINE_* errors', async () => {
    const failingApp = createApp({
      config: loadConfig({
        cwd: repoRoot,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          ENGINE_PATH: path.join(repoRoot, 'services', 'engine-cpp', 'build', 'missing-engine'),
          LOG_LEVEL: 'silent',
          RUNS_PERSISTENCE_ENABLED: 'false'
        }
      })
    });

    const response = await request(failingApp).post('/v1/solve').send(readJson('input/tiny-feasible.json')).expect(500);

    expect(validators.validateApiError(response.body)).toBe(true);
    expect(response.body.error.code).toBe('ENGINE_EXECUTION_FAILED');
  });
});
