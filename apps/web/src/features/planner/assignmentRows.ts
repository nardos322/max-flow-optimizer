import type { SolveResponseV1 } from '@maxflow/contracts/v1';

import type { DayAssignmentRow, InstanceDraft } from '../../types.js';

export function buildAssignmentRows(draft: InstanceDraft, result: SolveResponseV1 | null): DayAssignmentRow[] {
  if (!result?.feasible) {
    return [];
  }

  const dayById = new Map(draft.days.map((day) => [day.id, day]));
  const medicById = new Map(draft.medics.map((medic) => [medic.id, medic]));

  return [...result.assignments]
    .sort((left, right) => left.dayId.localeCompare(right.dayId))
    .map((assignment) => ({
      dayId: assignment.dayId,
      date: dayById.get(assignment.dayId)?.date ?? '',
      periodId: assignment.periodId,
      medicId: assignment.medicId,
      medicName: medicById.get(assignment.medicId)?.name ?? ''
    }));
}
