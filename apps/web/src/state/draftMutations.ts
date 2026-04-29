import { sortDraft } from '../features/draft/index.js';
import type { InstanceDraft } from '../types.js';

export function replaceDraft(instanceDraft: InstanceDraft): InstanceDraft {
  return sortDraft(instanceDraft);
}

export function setInstanceMeta(
  instanceDraft: InstanceDraft,
  patch: Pick<InstanceDraft, 'instanceId' | 'maxDaysPerMedic'>
): InstanceDraft {
  return replaceDraft({
    ...instanceDraft,
    ...patch
  });
}

export function upsertPeriod(
  instanceDraft: InstanceDraft,
  period: InstanceDraft['periods'][number]
): InstanceDraft {
  return replaceDraft({
    ...instanceDraft,
    periods: assignDaysToPeriod(instanceDraft.periods, period)
  });
}

export function deletePeriod(instanceDraft: InstanceDraft, periodId: string): InstanceDraft {
  return replaceDraft({
    ...instanceDraft,
    periods: instanceDraft.periods.filter((period) => period.id !== periodId)
  });
}

export function upsertDay(
  instanceDraft: InstanceDraft,
  day: InstanceDraft['days'][number],
  periodId: string | null
): InstanceDraft {
  return replaceDraft({
    ...instanceDraft,
    days: upsertById(instanceDraft.days, day),
    periods: assignDayToPeriod(instanceDraft.periods, day.id, periodId)
  });
}

export function deleteDay(instanceDraft: InstanceDraft, dayId: string): InstanceDraft {
  return replaceDraft({
    ...instanceDraft,
    days: instanceDraft.days.filter((day) => day.id !== dayId),
    periods: instanceDraft.periods.map((period) => ({
      ...period,
      dayIds: period.dayIds.filter((entry) => entry !== dayId)
    })),
    availability: instanceDraft.availability.filter((pair) => pair.dayId !== dayId)
  });
}

export function upsertMedic(instanceDraft: InstanceDraft, medic: InstanceDraft['medics'][number]): InstanceDraft {
  return replaceDraft({
    ...instanceDraft,
    medics: upsertById(instanceDraft.medics, medic)
  });
}

export function deleteMedic(instanceDraft: InstanceDraft, medicId: string): InstanceDraft {
  return replaceDraft({
    ...instanceDraft,
    medics: instanceDraft.medics.filter((medic) => medic.id !== medicId),
    availability: instanceDraft.availability.filter((pair) => pair.medicId !== medicId)
  });
}

export function toggleAvailability(instanceDraft: InstanceDraft, medicId: string, dayId: string): InstanceDraft {
  const pairExists = instanceDraft.availability.some((pair) => pair.medicId === medicId && pair.dayId === dayId);
  const availability = pairExists
    ? instanceDraft.availability.filter((pair) => !(pair.medicId === medicId && pair.dayId === dayId))
    : [...instanceDraft.availability, { medicId, dayId }];

  return replaceDraft({
    ...instanceDraft,
    availability
  });
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((entry) => entry.id === item.id);
  if (index === -1) {
    return [...items, item];
  }

  const nextItems = [...items];
  nextItems[index] = item;
  return nextItems;
}

function assignDayToPeriod(periods: InstanceDraft['periods'], dayId: string, periodId: string | null) {
  return periods.map((period) => {
    const dayIds = period.dayIds.filter((entry) => entry !== dayId);
    return period.id === periodId ? { ...period, dayIds: [...dayIds, dayId] } : { ...period, dayIds };
  });
}

function assignDaysToPeriod(
  periods: InstanceDraft['periods'],
  targetPeriod: InstanceDraft['periods'][number]
): InstanceDraft['periods'] {
  const normalizedTarget = {
    ...targetPeriod,
    dayIds: [...new Set(targetPeriod.dayIds)]
  };

  const nextPeriods = periods.map((period) => ({
    ...period,
    dayIds:
      period.id === normalizedTarget.id
        ? normalizedTarget.dayIds
        : period.dayIds.filter((dayId) => !normalizedTarget.dayIds.includes(dayId))
  }));

  return nextPeriods.some((period) => period.id === normalizedTarget.id)
    ? nextPeriods
    : [...nextPeriods, normalizedTarget];
}
