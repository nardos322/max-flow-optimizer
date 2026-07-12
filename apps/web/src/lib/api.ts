import type {
  ApiErrorCodeV1,
  OptimizationObjectiveV1,
  RunDetailV1,
  RunsListResponseV1,
  RunStatusV1,
  SolveRequestV1,
  SolveResponseV1
} from '@maxflow/contracts/v1';
import { ApiErrorSchema, RunDetailSchema, RunsListResponseSchema, SolveResponseSchema } from '@maxflow/contracts/v1/schemas';

import type { ApiErrorDetails, InstanceDraft } from '../types.js';
import { sortDraft } from '../features/draft/index.js';

export async function solveDraft(
  instanceDraft: InstanceDraft,
  optimizationObjective: OptimizationObjectiveV1 = 'none'
): Promise<SolveResponseV1> {
  const response = await fetch(`${resolveApiBaseUrl()}/v1/solve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(buildSolveRequest(instanceDraft, optimizationObjective))
  }).catch((error: Error) => {
    throw createClientError('INTERNAL_ERROR', error.message || 'Unable to reach the API.');
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const apiErrorResult = ApiErrorSchema.safeParse(payload);
    if (apiErrorResult.success) {
      throw apiErrorResult.data.error;
    }

    throw createClientError('INTERNAL_ERROR', 'The API returned an invalid error response.');
  }

  const solveResult = SolveResponseSchema.safeParse(payload);
  if (!solveResult.success) {
    throw createClientError('ENGINE_INVALID_OUTPUT', 'The API returned an invalid solve response.');
  }

  return solveResult.data;
}

function buildSolveRequest(instanceDraft: InstanceDraft, optimizationObjective: OptimizationObjectiveV1): SolveRequestV1 {
  const sortedDraft = sortDraft(instanceDraft);
  const { optimization: _optimization, ...baseRequest } = sortedDraft;

  if (optimizationObjective === 'fairness') {
    return {
      ...baseRequest,
      optimization: {
        objective: 'fairness'
      }
    };
  }

  return baseRequest;
}

export type ListRunsParams = {
  limit?: number;
  offset?: number;
  status?: RunStatusV1 | 'all';
  instanceId?: string;
};

export async function listRuns(params: ListRunsParams = {}): Promise<RunsListResponseV1> {
  const query = new URLSearchParams();
  query.set('limit', String(params.limit ?? 20));
  query.set('offset', String(params.offset ?? 0));

  if (params.status && params.status !== 'all') {
    query.set('status', params.status);
  }

  if (params.instanceId) {
    query.set('instanceId', params.instanceId);
  }

  const response = await fetch(`${resolveApiBaseUrl()}/v1/runs?${query.toString()}`).catch((error: Error) => {
    throw createClientError('INTERNAL_ERROR', error.message || 'Unable to reach the API.');
  });
  const payload = await readPayload(response);

  if (!response.ok) {
    throw parseApiError(payload);
  }

  const result = RunsListResponseSchema.safeParse(payload);
  if (!result.success) {
    throw createClientError('ENGINE_INVALID_OUTPUT', 'The API returned an invalid runs response.');
  }

  return result.data;
}

export async function getRun(runId: string): Promise<RunDetailV1> {
  const response = await fetch(`${resolveApiBaseUrl()}/v1/runs/${encodeURIComponent(runId)}`).catch((error: Error) => {
    throw createClientError('INTERNAL_ERROR', error.message || 'Unable to reach the API.');
  });
  const payload = await readPayload(response);

  if (!response.ok) {
    throw parseApiError(payload);
  }

  const result = RunDetailSchema.safeParse(payload);
  if (!result.success) {
    throw createClientError('ENGINE_INVALID_OUTPUT', 'The API returned an invalid run detail response.');
  }

  return result.data;
}

async function readPayload(response: Response): Promise<unknown> {
  return (await response.json().catch(() => null)) as unknown;
}

function parseApiError(payload: unknown): ApiErrorDetails {
  const apiErrorResult = ApiErrorSchema.safeParse(payload);
  if (apiErrorResult.success) {
    return apiErrorResult.data.error;
  }

  return createClientError('INTERNAL_ERROR', 'The API returned an invalid error response.');
}

function createClientError(code: ApiErrorCodeV1, message: string): ApiErrorDetails {
  return {
    requestId: 'client',
    timestamp: new Date().toISOString(),
    code,
    message
  };
}

function resolveApiBaseUrl(): string {
  const value = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!value) {
    return '/api';
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
}
