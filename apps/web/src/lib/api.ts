import type { ApiErrorCodeV1, SolveResponseV1 } from '@maxflow/contracts/v1';
import { ApiErrorSchema, SolveResponseSchema } from '@maxflow/contracts/v1/schemas';

import type { ApiErrorDetails, InstanceDraft } from '../types.js';
import { sortDraft } from './planner.js';

export async function solveDraft(instanceDraft: InstanceDraft): Promise<SolveResponseV1> {
  const response = await fetch(`${resolveApiBaseUrl()}/v1/solve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(sortDraft(instanceDraft))
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
