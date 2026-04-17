import type { RequestHandler } from 'express';

import { getRequestId } from '../middleware/requestContextMiddleware.js';
import type { SolveService } from '../services/solveService.js';

type SolveControllerDependencies = {
  solveService: SolveService;
};

export function createSolveController({
  solveService
}: SolveControllerDependencies): RequestHandler {
  return async (request, response, next) => {
    const requestId = getRequestId(response);

    try {
      const solveResponse = await solveService.solve(requestId, request.body);
      response.status(200).json(solveResponse);
    } catch (error) {
      next(error);
    }
  };
}
