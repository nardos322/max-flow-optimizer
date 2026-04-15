import { Router, type RequestHandler } from 'express';

type HealthRoutesDependencies = {
  healthController: RequestHandler;
};

export function createHealthRoutes({ healthController }: HealthRoutesDependencies): Router {
  const router = Router();
  router.get('/health', healthController);
  return router;
}
