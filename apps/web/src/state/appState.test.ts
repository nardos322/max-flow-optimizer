import { describe, expect, it } from 'vitest';

import type { RunDetailV1, RunsListResponseV1 } from '@maxflow/contracts/v1';

import { FIXTURE_DRAFT } from '../lib/fixture.js';
import { appStateReducer, initialAppState } from './appState.js';

const runDetail: RunDetailV1 = {
  runId: 'run-001',
  instanceId: FIXTURE_DRAFT.instanceId,
  createdAt: '2026-07-10T12:00:00.000Z',
  status: 'feasible',
  input: FIXTURE_DRAFT,
  response: {
    runId: 'run-001',
    createdAt: '2026-07-10T12:00:00.000Z',
    instanceId: FIXTURE_DRAFT.instanceId,
    feasible: true,
    requiredFlow: 3,
    maxFlow: 3,
    assignments: [
      { dayId: 'd1', medicId: 'm1', periodId: 'p1' },
      { dayId: 'd2', medicId: 'm2', periodId: 'p1' },
      { dayId: 'd3', medicId: 'm1', periodId: 'p2' }
    ],
    stats: {
      nodes: 13,
      edges: 18,
      runtimeMs: 1
    }
  }
};

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

  it('reassigns days to a single target period when saving a period', () => {
    const seededState = appStateReducer(initialAppState, { type: 'loadFixture' });

    const nextState = appStateReducer(seededState, {
      type: 'upsertPeriod',
      period: {
        id: 'p2',
        dayIds: ['d2', 'd3']
      }
    });

    expect(nextState.instanceDraft.periods.find((period) => period.id === 'p1')?.dayIds).toEqual(['d1']);
    expect(nextState.instanceDraft.periods.find((period) => period.id === 'p2')?.dayIds).toEqual(['d2', 'd3']);
  });

  it('stores run history list and selection state', () => {
    const runsList: RunsListResponseV1 = {
      items: [
        {
          runId: runDetail.runId,
          instanceId: runDetail.instanceId,
          createdAt: runDetail.createdAt,
          status: runDetail.status,
          feasible: true,
          requiredFlow: 3,
          maxFlow: 3,
          runtimeMs: 1,
          nodes: 13,
          edges: 18,
          inputHash: 'sha256:abc',
          source: 'web-fixture'
        }
      ],
      pagination: {
        limit: 20,
        offset: 0,
        total: 1
      }
    };

    const loadingState = appStateReducer(initialAppState, { type: 'beginLoadRuns' });
    const loadedState = appStateReducer(loadingState, { type: 'loadRunsSuccess', result: runsList });
    const selectedState = appStateReducer(loadedState, { type: 'selectRun', run: runDetail });

    expect(loadingState.isLoadingRuns).toBe(true);
    expect(loadedState.isLoadingRuns).toBe(false);
    expect(loadedState.runsList).toEqual(runsList);
    expect(selectedState.selectedRun).toEqual(runDetail);
  });

  it('resets pagination when changing run status filter', () => {
    const nextState = appStateReducer(
      {
        ...initialAppState,
        runsOffset: 40
      },
      { type: 'setRunsFilterStatus', status: 'infeasible' }
    );

    expect(nextState.runsFilterStatus).toBe('infeasible');
    expect(nextState.runsOffset).toBe(0);
  });

  it('changes optimization objective and clears stale solve state', () => {
    const nextState = appStateReducer(
      {
        ...initialAppState,
        lastSolveResult: runDetail.response,
        isSolving: true
      },
      { type: 'setOptimizationObjective', objective: 'fairness' }
    );

    expect(nextState.optimizationObjective).toBe('fairness');
    expect(nextState.lastSolveResult).toBeNull();
    expect(nextState.lastSolveError).toBeNull();
    expect(nextState.isSolving).toBe(false);
  });

  it('restores a selected run as the active draft and clears solve state', () => {
    const nextState = appStateReducer(
      {
        ...initialAppState,
        lastSolveResult: runDetail.response,
        lastSolveError: {
          requestId: 'test',
          timestamp: '2026-07-10T12:00:00.000Z',
          code: 'INVALID_INPUT',
          message: 'broken'
        }
      },
      { type: 'restoreRunDraft', run: runDetail }
    );

    expect(nextState.instanceDraft).toEqual(FIXTURE_DRAFT);
    expect(nextState.lastSolveResult).toBeNull();
    expect(nextState.lastSolveError).toBeNull();
    expect(nextState.activeSection).toBe('planner');
    expect(nextState.selectedRun).toEqual(runDetail);
  });

  it('restores optimization objective from a selected run input', () => {
    const optimizedRun: RunDetailV1 = {
      ...runDetail,
      input: {
        ...FIXTURE_DRAFT,
        optimization: {
          objective: 'fairness'
        }
      }
    };

    const nextState = appStateReducer(initialAppState, { type: 'restoreRunDraft', run: optimizedRun });

    expect(nextState.optimizationObjective).toBe('fairness');
  });
});
