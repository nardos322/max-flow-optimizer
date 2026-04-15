import { Router, type RequestHandler } from 'express';

type V1RoutesDependencies = {
  solveController: RequestHandler;
};

export function createV1Routes({ solveController }: V1RoutesDependencies): Router {
  const router = Router();
  router.post('/solve', solveController);
  return router;
}
