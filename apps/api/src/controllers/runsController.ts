import type { RequestHandler } from 'express';

import { RunsListQuerySchema } from '@maxflow/contracts';

import { ApiHttpError } from '../errors.js';
import type { RunsStore } from '../services/runsStore/index.js';

type RunsControllerDependencies = {
  runsStore?: RunsStore;
};

export function createListRunsController({ runsStore }: RunsControllerDependencies): RequestHandler {
  return (request, response, next) => {
    try {
      const queryResult = RunsListQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        throw new ApiHttpError(400, 'INVALID_INPUT', 'Run query parameters failed validation.', {
          errors: queryResult.error.issues.map((issue) => ({
            path: issue.path.join('.') || '$',
            message: issue.message
          }))
        });
      }

      if (!runsStore) {
        response.status(200).json({
          items: [],
          pagination: {
            limit: queryResult.data.limit,
            offset: queryResult.data.offset,
            total: 0
          }
        });
        return;
      }

      const result = runsStore.listRuns(queryResult.data);
      response.status(200).json({
        items: result.items,
        pagination: {
          limit: queryResult.data.limit,
          offset: queryResult.data.offset,
          total: result.total
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

export function createGetRunController({ runsStore }: RunsControllerDependencies): RequestHandler {
  return (request, response, next) => {
    try {
      const { runId } = request.params;
      const run = runsStore?.getRun(runId) ?? null;

      if (!run) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Run was not found.', { runId });
      }

      response.status(200).json(run);
    } catch (error) {
      next(error);
    }
  };
}
