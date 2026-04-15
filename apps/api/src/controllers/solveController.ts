import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';
import type { Logger } from 'pino';

import { isApiHttpError, makeApiErrorBody } from '../errors.js';
import type { SolveService } from '../services/solveService.js';

type SolveControllerDependencies = {
  solveService: SolveService;
  logger: Logger;
};

export function createSolveController({
  solveService,
  logger
}: SolveControllerDependencies): RequestHandler {
  return async (request, response, next) => {
    const requestId = randomUUID();

    try {
      const solveResponse = await solveService.solve(requestId, request.body);
      response.status(200).json(solveResponse);
    } catch (error) {
      if (isApiHttpError(error)) {
        logger.error({ requestId, err: error, code: error.code }, 'request failed');
        response.status(error.statusCode).json(makeApiErrorBody(requestId, error.code, error.message, error.details));
        return;
      }

      next(error);
    }
  };
}
