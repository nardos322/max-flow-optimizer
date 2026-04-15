import type { ApiErrorCodeV1, ApiErrorV1 } from '@maxflow/contracts';

export type ApiErrorCode = ApiErrorCodeV1;

export type ApiErrorBody = ApiErrorV1;

export class ApiHttpError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(statusCode: number, code: ApiErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiHttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function makeApiErrorBody(
  requestId: string,
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
): ApiErrorBody {
  return {
    error: {
      requestId,
      timestamp: new Date().toISOString(),
      code,
      message,
      ...(details ? { details } : {})
    }
  };
}

export function isApiHttpError(error: unknown): error is ApiHttpError {
  return error instanceof ApiHttpError;
}

export function toApiErrorCode(code: string): ApiErrorCode {
  const allowedCodes = new Set<ApiErrorCode>([
    'INVALID_INPUT',
    'DUPLICATE_ID',
    'DUPLICATE_DAY_DATE',
    'UNKNOWN_REFERENCE',
    'DAY_WITHOUT_PERIOD',
    'DAY_IN_MULTIPLE_PERIODS',
    'INVALID_CAPACITY',
    'ENGINE_EXECUTION_FAILED',
    'ENGINE_TIMEOUT',
    'ENGINE_INVALID_OUTPUT',
    'ENGINE_INTERNAL_ERROR',
    'INTERNAL_ERROR'
  ]);

  return allowedCodes.has(code as ApiErrorCode) ? (code as ApiErrorCode) : 'INVALID_INPUT';
}
