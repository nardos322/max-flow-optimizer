import { randomUUID } from 'node:crypto';

import type { RequestHandler, Response } from 'express';
import type { Logger } from 'pino';

import type { ApiErrorCode } from '../errors.js';

type RequestContextLocals = {
  requestId?: string;
  errorCode?: ApiErrorCode;
};

export function createRequestContextMiddleware(logger: Logger): RequestHandler {
  return (request, response, next) => {
    const startedAt = process.hrtime.bigint();
    const requestId = randomUUID();
    response.locals.requestId = requestId;

    response.on('finish', () => {
      logger.info(
        {
          requestId,
          method: request.method,
          route: resolveRoute(request),
          statusCode: response.statusCode,
          durationMs: elapsedMs(startedAt),
          instanceId: getInstanceId(request.body),
          errorCode: getRequestContext(response).errorCode
        },
        'request completed'
      );
    });

    next();
  };
}

export function getRequestId(response: Response): string {
  const locals = getRequestContext(response);

  if (typeof locals.requestId === 'string' && locals.requestId.length > 0) {
    return locals.requestId;
  }

  const requestId = randomUUID();
  locals.requestId = requestId;
  return requestId;
}

export function setRequestErrorCode(response: Response, errorCode: ApiErrorCode): void {
  getRequestContext(response).errorCode = errorCode;
}

function getRequestContext(response: Response): RequestContextLocals {
  return response.locals as RequestContextLocals;
}

function elapsedMs(startedAt: bigint): number {
  return Number(process.hrtime.bigint() - startedAt) / 1_000_000;
}

function resolveRoute(request: Parameters<RequestHandler>[0]): string {
  return request.originalUrl.split('?')[0] ?? request.originalUrl;
}

function getInstanceId(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || !('instanceId' in body)) {
    return undefined;
  }

  const instanceId = (body as { instanceId?: unknown }).instanceId;
  return typeof instanceId === 'string' && instanceId.length > 0 ? instanceId : undefined;
}
