import { Router, type RequestHandler } from 'express';

type V1RoutesDependencies = {
  solveController: RequestHandler;
  listRunsController: RequestHandler;
  getRunController: RequestHandler;
};

export function createV1Routes({ solveController, listRunsController, getRunController }: V1RoutesDependencies): Router {
  const router = Router();
  router.post('/solve', solveController);
  router.get('/runs', listRunsController);
  router.get('/runs/:runId', getRunController);
  return router;
}
