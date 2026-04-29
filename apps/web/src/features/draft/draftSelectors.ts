import type { InstanceDraft } from '../../types.js';

export function getPeriodIdForDay(periods: InstanceDraft['periods'], dayId: string): string | null {
  const period = periods.find((entry) => entry.dayIds.includes(dayId));
  return period?.id ?? null;
}
