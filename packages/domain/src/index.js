export const DEFAULT_DOMAIN_LIMITS = {
  maxDays: 500,
  maxMedics: 500,
  maxPeriods: 100,
  maxAvailabilityPairs: 100000
};

const DEFAULT_MESSAGE_BY_CODE = {
  INVALID_INPUT: 'Input failed semantic validation.',
  DUPLICATE_ID: 'Duplicate id found.',
  DUPLICATE_DAY_DATE: 'Duplicate day date found.',
  UNKNOWN_REFERENCE: 'Unknown reference found.',
  DAY_WITHOUT_PERIOD: 'Each day must belong to exactly one period.',
  DAY_IN_MULTIPLE_PERIODS: 'Each day must belong to exactly one period.',
  INVALID_CAPACITY: 'maxDaysPerMedic must be greater than or equal to 0.'
};

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function makeValidationError(code, message, details) {
  return {
    code,
    message,
    details
  };
}

function firstDuplicate(values) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
  }
  return null;
}

function checkCollectionLimit(items, actualLabel, max, actual) {
  if (actual > max) {
    return makeValidationError(
      'INVALID_INPUT',
      `Operational limit exceeded for ${actualLabel}.`,
      { limit: actualLabel, max, actual }
    );
  }
  return null;
}

export function validateSolveRequestDomain(input, options = {}) {
  const limits = {
    ...DEFAULT_DOMAIN_LIMITS,
    ...(options.limits ?? {})
  };

  if (!isRecord(input)) {
    return [makeValidationError('INVALID_INPUT', DEFAULT_MESSAGE_BY_CODE.INVALID_INPUT, { path: '$' })];
  }

  const errors = [];
  const periods = Array.isArray(input.periods) ? input.periods : [];
  const days = Array.isArray(input.days) ? input.days : [];
  const medics = Array.isArray(input.medics) ? input.medics : [];
  const availability = Array.isArray(input.availability) ? input.availability : [];

  const limitErrors = [
    checkCollectionLimit(days, 'maxDays', limits.maxDays, days.length),
    checkCollectionLimit(medics, 'maxMedics', limits.maxMedics, medics.length),
    checkCollectionLimit(periods, 'maxPeriods', limits.maxPeriods, periods.length),
    checkCollectionLimit(availability, 'maxAvailabilityPairs', limits.maxAvailabilityPairs, availability.length)
  ].filter(Boolean);

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

  for (const [entity, collection] of [['periods', periods], ['days', days], ['medics', medics]]) {
    const duplicateId = firstDuplicate(collection.map((item) => item?.id));
    if (duplicateId) {
      errors.push(
        makeValidationError('DUPLICATE_ID', `Duplicate id found in ${entity}.`, {
          entity,
          id: duplicateId
        })
      );
    }
  }

  const duplicateDate = firstDuplicate(days.map((day) => day?.date));
  if (duplicateDate) {
    errors.push(
      makeValidationError('DUPLICATE_DAY_DATE', DEFAULT_MESSAGE_BY_CODE.DUPLICATE_DAY_DATE, {
        date: duplicateDate
      })
    );
  }

  const dayIds = new Set(days.map((day) => day?.id));
  const medicIds = new Set(medics.map((medic) => medic?.id));
  const dayPeriodCount = new Map(days.map((day) => [day?.id, 0]));

  for (const period of periods) {
    for (const dayId of Array.isArray(period?.dayIds) ? period.dayIds : []) {
      if (!dayIds.has(dayId)) {
        errors.push(
          makeValidationError('UNKNOWN_REFERENCE', `Unknown reference found in periods.dayIds.`, {
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
    if (!medicIds.has(pair?.medicId)) {
      errors.push(
        makeValidationError('UNKNOWN_REFERENCE', 'Unknown reference found in availability.medicId.', {
          entity: 'availability',
          field: 'medicId',
          value: pair?.medicId
        })
      );
    }

    if (!dayIds.has(pair?.dayId)) {
      errors.push(
        makeValidationError('UNKNOWN_REFERENCE', 'Unknown reference found in availability.dayId.', {
          entity: 'availability',
          field: 'dayId',
          value: pair?.dayId
        })
      );
    }
  }

  return errors;
}

export function toApiErrorEnvelope(validationError, context = {}) {
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

export function findPrimaryDomainError(input, options = {}) {
  return validateSolveRequestDomain(input, options)[0] ?? null;
}
