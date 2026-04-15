declare module '@maxflow/domain' {
  export type DomainValidationError = {
    code: string;
    message?: string;
    details?: Record<string, unknown>;
  };

  export const DEFAULT_DOMAIN_LIMITS: {
    maxDays: number;
    maxMedics: number;
    maxPeriods: number;
    maxAvailabilityPairs: number;
  };

  export function findPrimaryDomainError(
    input: unknown,
    options?: {
      limits?: Partial<typeof DEFAULT_DOMAIN_LIMITS>;
    }
  ): DomainValidationError | null;
}
