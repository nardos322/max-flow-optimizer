import crypto from 'node:crypto';

import type { SolveRequestV1, SolveResponseV1, ValidatorSet } from '@maxflow/contracts';
import { findPrimaryDomainError } from '@maxflow/domain';

import type { ApiConfig } from '../config.js';
import type { EngineClient } from '../engineClient.js';
import { ApiHttpError, toApiErrorCode } from '../errors.js';
import type { RunsStore } from './runsStore.js';

type SolveServiceDependencies = {
  config: ApiConfig;
  validators: ValidatorSet;
  engineClient: EngineClient;
  runsStore?: RunsStore;
};

export type SolveService = {
  solve(requestId: string, input: unknown): Promise<SolveResponseV1>;
};

function stripMetadataForEngine(input: SolveRequestV1): Omit<SolveRequestV1, 'metadata'> {
  const { metadata: _metadata, ...engineInput } = input;
  return engineInput;
}

export function createSolveService({ config, validators, engineClient, runsStore }: SolveServiceDependencies): SolveService {
  return {
    async solve(requestId, input) {
      if (!validators.validateSolveRequest(input)) {
        const errors = validators.formatErrors(validators.validateSolveRequest.errors);
        throw new ApiHttpError(400, 'INVALID_INPUT', 'Request body failed schema validation.', {
          path: errors[0]?.path ?? '$',
          errors
        });
      }

      const domainError = findPrimaryDomainError(input, { limits: config.limits });
      if (domainError) {
        throw new ApiHttpError(
          400,
          toApiErrorCode(domainError.code),
          domainError.message ?? 'Input failed semantic validation.',
          domainError.details
        );
      }

      const engineResponse = await engineClient.solve(requestId, stripMetadataForEngine(input));

      if (!config.runsPersistenceEnabled || !runsStore) {
        return engineResponse;
      }

      const runId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const responseWithRun = {
        ...engineResponse,
        runId,
        createdAt
      } as SolveResponseV1;

      try {
        runsStore.insertRun({
          runId,
          createdAt,
          input,
          response: responseWithRun,
          contractVersion: 'v1'
        });
      } catch (error) {
        throw new ApiHttpError(500, 'INTERNAL_ERROR', 'Failed to persist solve run.', {
          cause: error instanceof Error ? error.message : 'Unknown persistence error.'
        });
      }

      return responseWithRun;
    }
  };
}
