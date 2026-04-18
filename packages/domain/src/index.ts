export type DomainValidationCode =
  | 'INVALID_INPUT'
  | 'DUPLICATE_ID'
  | 'DUPLICATE_DAY_DATE'
  | 'UNKNOWN_REFERENCE'
  | 'DAY_WITHOUT_PERIOD'
  | 'DAY_IN_MULTIPLE_PERIODS'
  | 'INVALID_CAPACITY';

export type DomainValidationError = {
  code: DomainValidationCode;
  message?: string;
  details?: Record<string, unknown>;
};

export type DomainLimits = {
  maxDays: number;
  maxMedics: number;
  maxPeriods: number;
  maxAvailabilityPairs: number;
};

export type DomainValidationOptions = {
  limits?: Partial<DomainLimits>;
};

export type ApiErrorEnvelopeContext = {
  requestId?: string;
  timestamp?: string;
};

export type ApiErrorEnvelope = {
  error: {
    requestId: string;
    timestamp: string;
    code: DomainValidationCode;
    message: string;
    details?: Record<string, unknown>;
  };
};

type InputRecord = Record<string, unknown>;

export const DEFAULT_DOMAIN_LIMITS: DomainLimits = {
  maxDays: 500,
  maxMedics: 500,
  maxPeriods: 100,
  maxAvailabilityPairs: 100000
};

const DEFAULT_MESSAGE_BY_CODE: Record<DomainValidationCode, string> = {
  INVALID_INPUT: 'Input failed semantic validation.',
  DUPLICATE_ID: 'Duplicate id found.',
  DUPLICATE_DAY_DATE: 'Duplicate day date found.',
  UNKNOWN_REFERENCE: 'Unknown reference found.',
  DAY_WITHOUT_PERIOD: 'Each day must belong to exactly one period.',
  DAY_IN_MULTIPLE_PERIODS: 'Each day must belong to exactly one period.',
  INVALID_CAPACITY: 'maxDaysPerMedic must be greater than or equal to 0.'
};

function isRecord(value: unknown): value is InputRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecordArray(value: unknown): InputRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function makeValidationError(
  code: DomainValidationCode,
  message: string,
  details?: Record<string, unknown>
): DomainValidationError {
  return {
    code,
    message,
    details
  };
}

function firstDuplicate(values: unknown[]): string | null {
  const seen = new Set<unknown>();
  for (const value of values) {
    if (seen.has(value)) {
      return typeof value === 'string' && value.length > 0 ? value : null;
    }
    seen.add(value);
  }
  return null;
}

function checkCollectionLimit(actualLabel: keyof DomainLimits, max: number, actual: number): DomainValidationError | null {
  if (actual > max) {
    return makeValidationError('INVALID_INPUT', `Operational limit exceeded for ${actualLabel}.`, {
      limit: actualLabel,
      max,
      actual
    });
  }
  return null;
}

export function validateSolveRequestDomain(
  input: unknown,
  options: DomainValidationOptions = {}
): DomainValidationError[] {
  const limits = {
    ...DEFAULT_DOMAIN_LIMITS,
    ...(options.limits ?? {})
  };

  if (!isRecord(input)) {
    return [makeValidationError('INVALID_INPUT', DEFAULT_MESSAGE_BY_CODE.INVALID_INPUT, { path: '$' })];
  }

  const errors: DomainValidationError[] = [];
  const periods = asRecordArray(input.periods);
  const days = asRecordArray(input.days);
  const medics = asRecordArray(input.medics);
  const availability = asRecordArray(input.availability);

  const limitErrors = [
    checkCollectionLimit('maxDays', limits.maxDays, days.length),
    checkCollectionLimit('maxMedics', limits.maxMedics, medics.length),
    checkCollectionLimit('maxPeriods', limits.maxPeriods, periods.length),
    checkCollectionLimit('maxAvailabilityPairs', limits.maxAvailabilityPairs, availability.length)
  ].filter((error): error is DomainValidationError => error !== null);

  if (limitErrors.length > 0) {
    return limitErrors;
  }

  if (typeof input.maxDaysPerMedic === 'number' && input.maxDaysPerMedic < 0) {
    errors.push(
      makeValidationError('INVALID_CAPACITY', DEFAULT_MESSAGE_BY_CODE.INVALID_CAPACITY, {
        field: 'maxDaysPerMedic',
        value: input.maxDaysPerMedic
      })
    );
  }

  for (const [entity, collection] of [
    ['periods', periods],
    ['days', days],
    ['medics', medics]
  ] as const) {
    const duplicateId = firstDuplicate(collection.map((item) => item.id));
    if (duplicateId) {
      errors.push(
        makeValidationError('DUPLICATE_ID', `Duplicate id found in ${entity}.`, {
          entity,
          id: duplicateId
        })
      );
    }
  }

  const duplicateDate = firstDuplicate(days.map((day) => day.date));
  if (duplicateDate) {
    errors.push(
      makeValidationError('DUPLICATE_DAY_DATE', DEFAULT_MESSAGE_BY_CODE.DUPLICATE_DAY_DATE, {
        date: duplicateDate
      })
    );
  }

  const dayIds = new Set(days.map((day) => day.id));
  const medicIds = new Set(medics.map((medic) => medic.id));
  const dayPeriodCount = new Map(days.map((day) => [day.id, 0]));

  for (const period of periods) {
    for (const dayId of asStringArray(period.dayIds)) {
      if (!dayIds.has(dayId)) {
        errors.push(
          makeValidationError('UNKNOWN_REFERENCE', 'Unknown reference found in periods.dayIds.', {
            entity: 'periods',
            field: 'dayIds',
            value: dayId
          })
        );
        continue;
      }

      dayPeriodCount.set(dayId, (dayPeriodCount.get(dayId) ?? 0) + 1);
    }
  }

  for (const [dayId, count] of dayPeriodCount.entries()) {
    if (count === 0) {
      errors.push(
        makeValidationError('DAY_WITHOUT_PERIOD', DEFAULT_MESSAGE_BY_CODE.DAY_WITHOUT_PERIOD, {
          dayId
        })
      );
    }
    if (count > 1) {
      errors.push(
        makeValidationError('DAY_IN_MULTIPLE_PERIODS', DEFAULT_MESSAGE_BY_CODE.DAY_IN_MULTIPLE_PERIODS, {
          dayId
        })
      );
    }
  }

  for (const pair of availability) {
    if (!medicIds.has(pair.medicId)) {
      errors.push(
        makeValidationError('UNKNOWN_REFERENCE', 'Unknown reference found in availability.medicId.', {
          entity: 'availability',
          field: 'medicId',
          value: pair.medicId
        })
      );
    }

    if (!dayIds.has(pair.dayId)) {
      errors.push(
        makeValidationError('UNKNOWN_REFERENCE', 'Unknown reference found in availability.dayId.', {
          entity: 'availability',
          field: 'dayId',
          value: pair.dayId
        })
      );
    }
  }

  return errors;
}

export function toApiErrorEnvelope(
  validationError: DomainValidationError,
  context: ApiErrorEnvelopeContext = {}
): ApiErrorEnvelope {
  return {
    error: {
      requestId: context.requestId ?? '00000000-0000-0000-0000-000000000000',
      timestamp: context.timestamp ?? '2026-03-07T00:00:00.000Z',
      code: validationError.code,
      message: validationError.message ?? DEFAULT_MESSAGE_BY_CODE[validationError.code] ?? 'Validation error.',
      ...(validationError.details ? { details: validationError.details } : {})
    }
  };
}

export function findPrimaryDomainError(input: unknown, options: DomainValidationOptions = {}): DomainValidationError | null {
  return validateSolveRequestDomain(input, options)[0] ?? null;
}
