import type { ErrorRequestHandler } from 'express';
import type { Logger } from 'pino';

import { isApiHttpError, makeApiErrorBody } from '../errors.js';
import { getRequestId, setRequestErrorCode } from './requestContextMiddleware.js';

export function createErrorMiddleware(logger: Logger): ErrorRequestHandler {
  return (error, _request, response, _next) => {
    const requestId = getRequestId(response);

    if (isApiHttpError(error)) {
      setRequestErrorCode(response, error.code);
      logger.error({ requestId, err: error, code: error.code }, 'request failed');
      response.status(error.statusCode).json(makeApiErrorBody(requestId, error.code, error.message, error.details));
      return;
    }

    if (error instanceof SyntaxError || hasBodyParserErrorType(error)) {
      setRequestErrorCode(response, 'INVALID_INPUT');
      response.status(400).json(makeApiErrorBody(requestId, 'INVALID_INPUT', 'Request body must be valid JSON.'));
      return;
    }

    setRequestErrorCode(response, 'INTERNAL_ERROR');
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
