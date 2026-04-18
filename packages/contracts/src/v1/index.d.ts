import type { z } from 'zod';

export type SolveRequestV1 = {
  instanceId: string;
  maxDaysPerMedic: number;
  periods: PeriodV1[];
  days: DayV1[];
  medics: MedicV1[];
  availability: AvailabilityV1[];
};

export type PeriodV1 = {
  id: string;
  dayIds: string[];
};

export type DayV1 = {
  id: string;
  date: string;
};

export type MedicV1 = {
  id: string;
  name: string;
};

export type AvailabilityV1 = {
  medicId: string;
  dayId: string;
};

export type AssignmentV1 = {
  dayId: string;
  medicId: string;
  periodId: string;
};

export type SolveStatsV1 = {
  nodes: number;
  edges: number;
  runtimeMs: number;
  augmentingPaths?: number;
};

export type SolveDiagnosticsV1 = {
  summaryCode: 'INSUFFICIENT_COVERAGE';
  message: string;
  uncoveredDays: string[];
};

export type FeasibleSolveResponseV1 = {
  instanceId: string;
  feasible: true;
  requiredFlow: number;
  maxFlow: number;
  assignments: AssignmentV1[];
  stats: SolveStatsV1;
  diagnostics?: never;
};

export type InfeasibleSolveResponseV1 = {
  instanceId: string;
  feasible: false;
  requiredFlow: number;
  maxFlow: number;
  assignments: [];
  stats: SolveStatsV1;
  diagnostics: SolveDiagnosticsV1;
};

export type SolveResponseV1 = FeasibleSolveResponseV1 | InfeasibleSolveResponseV1;

export type HealthResponseV1 = {
  status: 'ok';
};

export type ApiErrorCodeV1 =
  | 'INVALID_INPUT'
  | 'DUPLICATE_ID'
  | 'DUPLICATE_DAY_DATE'
  | 'UNKNOWN_REFERENCE'
  | 'DAY_WITHOUT_PERIOD'
  | 'DAY_IN_MULTIPLE_PERIODS'
  | 'INVALID_CAPACITY'
  | 'ENGINE_EXECUTION_FAILED'
  | 'ENGINE_TIMEOUT'
  | 'ENGINE_INVALID_OUTPUT'
  | 'ENGINE_INTERNAL_ERROR'
  | 'INTERNAL_ERROR';

export type ApiErrorV1 = {
  error: {
    requestId: string;
    timestamp: string;
    code: ApiErrorCodeV1;
    message: string;
    details?: Record<string, unknown>;
  };
};

export type SchemaNameV1 = 'solveRequest' | 'solveResponse' | 'apiError' | 'healthResponse';

export type ZodValidationIssue = z.ZodIssue;

export type FormattedValidationError = {
  keyword: string;
  path: string;
  message: string;
};

export type ValidateFunction<T> = ((data: unknown) => data is T) & {
  errors?: ZodValidationIssue[] | null;
};

export type ValidatorSet = {
  validateSolveRequest: ValidateFunction<SolveRequestV1>;
  validateSolveResponse: ValidateFunction<SolveResponseV1>;
  validateApiError: ValidateFunction<ApiErrorV1>;
  validateHealthResponse: ValidateFunction<HealthResponseV1>;
  formatErrors(errors?: ZodValidationIssue[] | null): FormattedValidationError[];
};

export const API_ERROR_CODES_V1: ApiErrorCodeV1[];
export const PeriodSchema: z.ZodType<PeriodV1>;
export const DaySchema: z.ZodType<DayV1>;
export const MedicSchema: z.ZodType<MedicV1>;
export const AvailabilitySchema: z.ZodType<AvailabilityV1>;
export const SolveRequestSchema: z.ZodType<SolveRequestV1>;
export const AssignmentSchema: z.ZodType<AssignmentV1>;
export const SolveStatsSchema: z.ZodType<SolveStatsV1>;
export const SolveDiagnosticsSchema: z.ZodType<SolveDiagnosticsV1>;
export const SolveResponseSchema: z.ZodType<SolveResponseV1>;
export const HealthResponseSchema: z.ZodType<HealthResponseV1>;
export const ApiErrorSchema: z.ZodType<ApiErrorV1>;

export const SCHEMA_FILENAMES: Record<SchemaNameV1, string>;

export function loadSchema(schemaName: SchemaNameV1): Record<string, unknown>;

export function loadOpenApiDocument(): string;

export function formatZodErrors(errors?: ZodValidationIssue[] | null): FormattedValidationError[];

export function createValidatorSet(): ValidatorSet;
