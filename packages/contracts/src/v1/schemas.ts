import { z } from 'zod';

export const API_ERROR_CODES_V1 = [
  'INVALID_INPUT',
  'DUPLICATE_ID',
  'DUPLICATE_DAY_DATE',
  'UNKNOWN_REFERENCE',
  'DAY_WITHOUT_PERIOD',
  'DAY_IN_MULTIPLE_PERIODS',
  'INVALID_CAPACITY',
  'ENGINE_EXECUTION_FAILED',
  'ENGINE_TIMEOUT',
  'ENGINE_INVALID_OUTPUT',
  'ENGINE_INTERNAL_ERROR',
  'INTERNAL_ERROR'
] as const;

const idSchema = z.string().min(1).max(128);
const nonNegativeIntegerSchema = z.number().int().min(0);

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function hasUniqueItems(values: string[]): boolean {
  return new Set(values).size === values.length;
}

export const PeriodSchema = z
  .object({
    id: idSchema,
    dayIds: z.array(idSchema).min(1)
  })
  .strict();

export const DaySchema = z
  .object({
    id: idSchema,
    date: z.string().refine(isIsoDate, { message: 'Invalid date format.' })
  })
  .strict();

export const MedicSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(128)
  })
  .strict();

export const AvailabilitySchema = z
  .object({
    medicId: idSchema,
    dayId: idSchema
  })
  .strict();

export const SolveRequestSchema = z
  .object({
    instanceId: idSchema,
    maxDaysPerMedic: nonNegativeIntegerSchema,
    periods: z.array(PeriodSchema).min(1),
    days: z.array(DaySchema).min(1),
    medics: z.array(MedicSchema).min(1),
    availability: z.array(AvailabilitySchema)
  })
  .strict();

export const AssignmentSchema = z
  .object({
    dayId: idSchema,
    medicId: idSchema,
    periodId: idSchema
  })
  .strict();

export const SolveStatsSchema = z
  .object({
    nodes: nonNegativeIntegerSchema,
    edges: nonNegativeIntegerSchema,
    runtimeMs: nonNegativeIntegerSchema,
    augmentingPaths: nonNegativeIntegerSchema.optional()
  })
  .strict();

export const SolveDiagnosticsSchema = z
  .object({
    summaryCode: z.literal('INSUFFICIENT_COVERAGE'),
    message: z.string().min(1).max(500),
    uncoveredDays: z.array(idSchema).refine(hasUniqueItems, { message: 'Array items must be unique.' })
  })
  .strict();

export const FeasibleSolveResponseSchema = z
  .object({
    instanceId: idSchema,
    feasible: z.literal(true),
    requiredFlow: nonNegativeIntegerSchema,
    maxFlow: nonNegativeIntegerSchema,
    assignments: z.array(AssignmentSchema),
    stats: SolveStatsSchema,
    diagnostics: z.never().optional()
  })
  .strict();

export const InfeasibleSolveResponseSchema = z
  .object({
    instanceId: idSchema,
    feasible: z.literal(false),
    requiredFlow: nonNegativeIntegerSchema,
    maxFlow: nonNegativeIntegerSchema,
    assignments: z.array(AssignmentSchema).max(0),
    stats: SolveStatsSchema,
    diagnostics: SolveDiagnosticsSchema
  })
  .strict();

export const SolveResponseSchema = z.discriminatedUnion('feasible', [
  FeasibleSolveResponseSchema,
  InfeasibleSolveResponseSchema
]);

export const HealthResponseSchema = z
  .object({
    status: z.literal('ok')
  })
  .strict();

export const ApiErrorSchema = z
  .object({
    error: z
      .object({
        requestId: idSchema,
        timestamp: z.string().datetime(),
        code: z.enum(API_ERROR_CODES_V1),
        message: z.string().min(1).max(500),
        details: z.record(z.unknown()).optional()
      })
      .strict()
  })
  .strict();

export type ApiErrorCodeV1 = (typeof API_ERROR_CODES_V1)[number];
export type PeriodV1 = z.infer<typeof PeriodSchema>;
export type DayV1 = z.infer<typeof DaySchema>;
export type MedicV1 = z.infer<typeof MedicSchema>;
export type AvailabilityV1 = z.infer<typeof AvailabilitySchema>;
export type SolveRequestV1 = z.infer<typeof SolveRequestSchema>;
export type AssignmentV1 = z.infer<typeof AssignmentSchema>;
export type SolveStatsV1 = z.infer<typeof SolveStatsSchema>;
export type SolveDiagnosticsV1 = z.infer<typeof SolveDiagnosticsSchema>;
export type FeasibleSolveResponseV1 = z.infer<typeof FeasibleSolveResponseSchema>;
export type InfeasibleSolveResponseV1 = z.infer<typeof InfeasibleSolveResponseSchema>;
export type SolveResponseV1 = z.infer<typeof SolveResponseSchema>;
export type HealthResponseV1 = z.infer<typeof HealthResponseSchema>;
export type ApiErrorV1 = z.infer<typeof ApiErrorSchema>;
