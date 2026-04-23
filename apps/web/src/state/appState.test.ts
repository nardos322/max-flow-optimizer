import { describe, expect, it } from 'vitest';

import { FIXTURE_DRAFT } from '../lib/fixture.js';
import { appStateReducer, initialAppState } from './appState.js';

describe('appStateReducer', () => {
  it('loads the canonical fixture and clears previous solve state', () => {
    const nextState = appStateReducer(
      {
        ...initialAppState,
        lastSolveError: {
          requestId: 'test',
          timestamp: '2026-04-23T00:00:00.000Z',
          code: 'INVALID_INPUT',
          message: 'broken'
        },
        isSolving: true
      },
      { type: 'loadFixture' }
    );

    expect(nextState.instanceDraft).toEqual(FIXTURE_DRAFT);
    expect(nextState.lastSolveResult).toBeNull();
    expect(nextState.lastSolveError).toBeNull();
    expect(nextState.isSolving).toBe(false);
  });

  it('removes related period assignments and availability when deleting a day', () => {
    const seededState = appStateReducer(initialAppState, { type: 'loadFixture' });

    const nextState = appStateReducer(seededState, {
      type: 'deleteDay',
      dayId: 'd1'
    });

    expect(nextState.instanceDraft.days.map((day) => day.id)).toEqual(['d2', 'd3']);
    expect(nextState.instanceDraft.periods.find((period) => period.id === 'p1')?.dayIds).toEqual(['d2']);
    expect(nextState.instanceDraft.availability).toEqual([
      { medicId: 'm1', dayId: 'd3' },
      { medicId: 'm2', dayId: 'd2' }
    ]);
  });

  it('loads the infeasible fixture when requested', () => {
    const nextState = appStateReducer(initialAppState, {
      type: 'loadFixture',
      variant: 'infeasible'
    });

    expect(nextState.instanceDraft.instanceId).toBe('tiny-infeasible-availability');
    expect(nextState.instanceDraft.availability).toEqual([
      { medicId: 'm1', dayId: 'd1' },
      { medicId: 'm2', dayId: 'd2' }
    ]);
  });
});
