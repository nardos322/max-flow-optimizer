import type { InstanceDraft } from '../../types.js';

export function sortDraft(draft: InstanceDraft): InstanceDraft {
  return {
    ...draft,
    periods: [...draft.periods]
      .map((period) => ({
        ...period,
        dayIds: [...period.dayIds].sort((left, right) => left.localeCompare(right))
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    days: [...draft.days].sort((left, right) => left.id.localeCompare(right.id)),
    medics: [...draft.medics].sort((left, right) => left.id.localeCompare(right.id)),
    availability: [...draft.availability].sort((left, right) => {
      const byMedicId = left.medicId.localeCompare(right.medicId);
      return byMedicId !== 0 ? byMedicId : left.dayId.localeCompare(right.dayId);
    })
  };
}
