import type { SolveDiagnosticsV1, SolveRequestV1, SolveResponseV1 } from '@maxflow/contracts';

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function enrichDiagnostics(input: SolveRequestV1, response: SolveResponseV1): SolveResponseV1 {
  if (response.feasible) {
    return response;
  }

  return {
    ...response,
    diagnostics: buildDiagnostics(input, response.diagnostics)
  };
}

function buildDiagnostics(input: SolveRequestV1, diagnostics: SolveDiagnosticsV1): SolveDiagnosticsV1 {
  const availableDaysByMedic = new Map<string, Set<string>>();
  const availableMedicsByDay = new Map<string, Set<string>>();

  for (const medic of input.medics) {
    availableDaysByMedic.set(medic.id, new Set());
  }

  for (const day of input.days) {
    availableMedicsByDay.set(day.id, new Set());
  }

  for (const pair of input.availability) {
    availableDaysByMedic.get(pair.medicId)?.add(pair.dayId);
    availableMedicsByDay.get(pair.dayId)?.add(pair.medicId);
  }

  const uncoveredDayIds = new Set(diagnostics.uncoveredDays);
  const daysWithoutAvailability = input.days
    .filter((day) => (availableMedicsByDay.get(day.id)?.size ?? 0) === 0)
    .map((day) => day.id)
    .sort((left, right) => left.localeCompare(right));

  const periods = input.periods
    .map((period) => {
      const periodDayIds = sortedUnique(period.dayIds);
      const uncoveredDays = periodDayIds.filter((dayId) => uncoveredDayIds.has(dayId));
      const availableDayCount = periodDayIds.filter((dayId) => (availableMedicsByDay.get(dayId)?.size ?? 0) > 0).length;
      const availableMedicIds = new Set<string>();

      for (const dayId of periodDayIds) {
        for (const medicId of availableMedicsByDay.get(dayId) ?? []) {
          availableMedicIds.add(medicId);
        }
      }

      return {
        periodId: period.id,
        requiredDays: periodDayIds.length,
        maxCoverableDays: Math.min(periodDayIds.length, availableDayCount, availableMedicIds.size),
        uncoveredDays
      };
    })
    .filter((period) => period.uncoveredDays.length > 0 || period.maxCoverableDays < period.requiredDays)
    .sort((left, right) => left.periodId.localeCompare(right.periodId));

  const medics = input.medics
    .map((medic) => ({
      medicId: medic.id,
      availableDays: availableDaysByMedic.get(medic.id)?.size ?? 0,
      maxDaysPerMedic: input.maxDaysPerMedic
    }))
    .filter((medic) => medic.availableDays === 0)
    .sort((left, right) => left.medicId.localeCompare(right.medicId));

  return {
    ...diagnostics,
    uncoveredDays: sortedUnique(diagnostics.uncoveredDays),
    capacity: {
      requiredDays: input.days.length,
      totalMedicCapacity: input.medics.length * input.maxDaysPerMedic,
      availablePairs: input.availability.length
    },
    daysWithoutAvailability,
    periods,
    medics
  };
}
