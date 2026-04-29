import { describe, expect, it } from 'vitest';

import { FIXTURE_DRAFT } from '../lib/fixture.js';
import { deleteMedic, toggleAvailability, upsertDay, upsertPeriod } from './draftMutations.js';

describe('draftMutations', () => {
  it('moves a day to a single period when upserting a day', () => {
    const nextDraft = upsertDay(FIXTURE_DRAFT, { id: 'd2', date: '2026-01-02' }, 'p2');

    expect(nextDraft.periods.find((period) => period.id === 'p1')?.dayIds).toEqual(['d1']);
    expect(nextDraft.periods.find((period) => period.id === 'p2')?.dayIds).toEqual(['d2', 'd3']);
  });

  it('removes duplicate day assignments when upserting a period', () => {
    const nextDraft = upsertPeriod(FIXTURE_DRAFT, { id: 'p2', dayIds: ['d1', 'd1', 'd3'] });

    expect(nextDraft.periods.find((period) => period.id === 'p1')?.dayIds).toEqual(['d2']);
    expect(nextDraft.periods.find((period) => period.id === 'p2')?.dayIds).toEqual(['d1', 'd3']);
  });

  it('toggles availability without touching other medics', () => {
    const removedDraft = toggleAvailability(FIXTURE_DRAFT, 'm1', 'd1');
    const restoredDraft = toggleAvailability(removedDraft, 'm1', 'd1');

    expect(removedDraft.availability).not.toContainEqual({ medicId: 'm1', dayId: 'd1' });
    expect(removedDraft.availability).toContainEqual({ medicId: 'm2', dayId: 'd2' });
    expect(restoredDraft.availability).toContainEqual({ medicId: 'm1', dayId: 'd1' });
  });

  it('deletes medic availability when deleting a medic', () => {
    const nextDraft = deleteMedic(FIXTURE_DRAFT, 'm1');

    expect(nextDraft.medics.map((medic) => medic.id)).toEqual(['m2']);
    expect(nextDraft.availability).toEqual([{ medicId: 'm2', dayId: 'd2' }]);
  });
});
