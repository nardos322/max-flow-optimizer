import express from 'express';
import { pino, type Logger } from 'pino';

import { createValidatorSet, type ValidatorSet } from '@maxflow/contracts';

import { type ApiConfig, loadConfig } from './config.js';
import { createHealthController } from './controllers/healthController.js';
import { createSolveController } from './controllers/solveController.js';
import { CliEngineClient, type EngineClient } from './engineClient.js';
import { createErrorMiddleware } from './middleware/errorMiddleware.js';
import { createHealthRoutes } from './routes/healthRoutes.js';
import { createV1Routes } from './routes/v1Routes.js';
import { createSolveService } from './services/solveService.js';

type CreateAppOptions = {
  config?: ApiConfig;
  validators?: ValidatorSet;
  engineClient?: EngineClient;
  logger?: Logger;
};

export function createApp(options: CreateAppOptions = {}) {
  const config = options.config ?? loadConfig();
  const validators = options.validators ?? createValidatorSet();
  const logger = options.logger ?? pino({ level: config.logLevel });
  const engineClient = options.engineClient ?? new CliEngineClient(config, validators, logger);
  const solveService = createSolveService({ config, validators, engineClient });
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: config.maxRequestBytes }));

  app.use(createHealthRoutes({ healthController: createHealthController() }));
  app.use(
    '/v1',
    createV1Routes({
      solveController: createSolveController({
        solveService,
        logger
      })
    })
  );
  app.use(createErrorMiddleware(logger));

  return app;
}
