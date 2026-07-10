import express from 'express';
import { pino, type Logger } from 'pino';

import { createValidatorSet, type ValidatorSet } from '@maxflow/contracts';

import { type ApiConfig, loadConfig } from './config.js';
import { createHealthController } from './controllers/healthController.js';
import { createGetRunController, createListRunsController } from './controllers/runsController.js';
import { createSolveController } from './controllers/solveController.js';
import { CliEngineClient, type EngineClient } from './engineClient.js';
import { createErrorMiddleware } from './middleware/errorMiddleware.js';
import { createRequestContextMiddleware } from './middleware/requestContextMiddleware.js';
import { createHealthRoutes } from './routes/healthRoutes.js';
import { createV1Routes } from './routes/v1Routes.js';
import { createRunsStore, type RunsStore } from './services/runsStore.js';
import { createSolveService } from './services/solveService.js';

type CreateAppOptions = {
  config?: ApiConfig;
  validators?: ValidatorSet;
  engineClient?: EngineClient;
  runsStore?: RunsStore;
  logger?: Logger;
};

export function createApp(options: CreateAppOptions = {}) {
  const config = options.config ?? loadConfig();
  const validators = options.validators ?? createValidatorSet();
  const logger = options.logger ?? pino({ level: config.logLevel });
  const engineClient = options.engineClient ?? new CliEngineClient(config, validators, logger);
  const runsStore = options.runsStore ?? (config.runsPersistenceEnabled ? createRunsStore({ dbPath: config.runsDbPath }) : undefined);
  const solveService = createSolveService({ config, validators, engineClient, runsStore });
  const app = express();

  app.disable('x-powered-by');
  app.use(createRequestContextMiddleware(logger));
  app.use(createCorsMiddleware());
  app.use(express.json({ limit: config.maxRequestBytes }));

  app.use(createHealthRoutes({ healthController: createHealthController() }));
  app.use(
    '/v1',
    createV1Routes({
      solveController: createSolveController({
        solveService
      }),
      listRunsController: createListRunsController({ runsStore }),
      getRunController: createGetRunController({ runsStore })
    })
  );
  app.use(createErrorMiddleware(logger));

  return app;
}

function createCorsMiddleware() {
  return (request: express.Request, response: express.Response, next: express.NextFunction) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
      response.sendStatus(204);
      return;
    }

    next();
  };
}
