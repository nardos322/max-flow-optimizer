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

    if (isBodyTooLargeError(error)) {
      setRequestErrorCode(response, 'INVALID_INPUT');
      response
        .status(400)
        .json(
          makeApiErrorBody(requestId, 'INVALID_INPUT', 'Request body exceeds MAX_REQUEST_BYTES.', {
            limit: getBodyParserLimit(error)
          })
        );
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

function isBodyTooLargeError(error: unknown): boolean {
  return getBodyParserErrorType(error) === 'entity.too.large';
}

function hasBodyParserErrorType(error: unknown): boolean {
  const type = getBodyParserErrorType(error);
  return typeof type === 'string' && type.startsWith('entity.');
}

function getBodyParserErrorType(error: unknown): string | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof (error as { type?: unknown }).type === 'string'
  ) {
    return (error as { type: string }).type;
  }

  return null;
}

function getBodyParserLimit(error: unknown): number | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'limit' in error &&
    typeof (error as { limit?: unknown }).limit === 'number'
  ) {
    return (error as { limit: number }).limit;
  }

  return null;
}
