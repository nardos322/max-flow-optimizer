import type { SolveResponseV1, ValidatorSet } from '@maxflow/contracts';
import { findPrimaryDomainError } from '@maxflow/domain';

import type { ApiConfig } from '../config.js';
import type { EngineClient } from '../engineClient.js';
import { ApiHttpError, toApiErrorCode } from '../errors.js';

type SolveServiceDependencies = {
  config: ApiConfig;
  validators: ValidatorSet;
  engineClient: EngineClient;
};

export type SolveService = {
  solve(requestId: string, input: unknown): Promise<SolveResponseV1>;
};

export function createSolveService({ config, validators, engineClient }: SolveServiceDependencies): SolveService {
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

      return engineClient.solve(requestId, input);
    }
  };
}
