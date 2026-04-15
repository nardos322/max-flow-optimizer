import { randomUUID } from 'node:crypto';

import type { ErrorRequestHandler } from 'express';
import type { Logger } from 'pino';

import { isApiHttpError, makeApiErrorBody } from '../errors.js';

export function createErrorMiddleware(logger: Logger): ErrorRequestHandler {
  return (error, _request, response, _next) => {
    const requestId = randomUUID();

    if (isApiHttpError(error)) {
      logger.error({ requestId, err: error, code: error.code }, 'request failed');
      response.status(error.statusCode).json(makeApiErrorBody(requestId, error.code, error.message, error.details));
      return;
    }

    if (error instanceof SyntaxError || hasBodyParserErrorType(error)) {
      response.status(400).json(makeApiErrorBody(requestId, 'INVALID_INPUT', 'Request body must be valid JSON.'));
      return;
    }

    logger.error({ requestId, err: error }, 'unhandled request error');
    response.status(500).json(makeApiErrorBody(requestId, 'INTERNAL_ERROR', 'Internal API error.'));
  };
}

function hasBodyParserErrorType(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof (error as { type?: unknown }).type === 'string' &&
    (error as { type: string }).type.startsWith('entity.')
  );
}
