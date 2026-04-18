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
];

const idSchema = z.string().min(1).max(128);
const nonNegativeIntegerSchema = z.number().int().min(0);

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function hasUniqueItems(values) {
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

export const SolveResponseSchema = z
  .object({
    instanceId: idSchema,
    feasible: z.boolean(),
    requiredFlow: nonNegativeIntegerSchema,
    maxFlow: nonNegativeIntegerSchema,
    assignments: z.array(AssignmentSchema),
    stats: SolveStatsSchema,
    diagnostics: SolveDiagnosticsSchema.optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.feasible) {
      if (value.diagnostics !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['diagnostics'],
          message: 'must NOT be valid',
          params: { keyword: 'not' }
        });
      }
      return;
    }

    if (value.diagnostics === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['diagnostics'],
        message: "must have required property 'diagnostics'",
        params: { keyword: 'required' }
      });
    }

    if (value.assignments.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['assignments'],
        message: 'must NOT have more than 0 items',
        params: { keyword: 'maxItems' }
      });
    }
  });

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
