import { describe, expect, it } from 'vitest';

import type { RunDetailV1 } from '@maxflow/contracts/v1';

import { FIXTURE_DRAFT } from '../../lib/fixture.js';
import { buildAssignmentRows } from './assignmentRows.js';
import { buildCsvContent, buildRunCsvContent } from './exportResult.js';

describe('planner result helpers', () => {
  it('builds CSV rows enriched with dates and medic names', () => {
    const csv = buildCsvContent(FIXTURE_DRAFT, {
      runId: 'run-001',
      createdAt: '2026-07-10T12:00:00.000Z',
      instanceId: 'tiny-feasible',
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
    });

    expect(csv).toBe(
      [
        'runId,createdAt,instanceId,status,dayId,date,periodId,medicId,medicName,requiredFlow,maxFlow,runtimeMs',
        'run-001,2026-07-10T12:00:00.000Z,tiny-feasible,feasible,d1,2026-04-17,p1,m1,Ana,3,3,1',
        'run-001,2026-07-10T12:00:00.000Z,tiny-feasible,feasible,d2,2026-04-18,p1,m2,Luis,3,3,1',
        'run-001,2026-07-10T12:00:00.000Z,tiny-feasible,feasible,d3,2026-04-20,p2,m1,Ana,3,3,1'
      ].join('\n')
    );
  });

  it('builds historical CSV from persisted run input and response', () => {
    const run: RunDetailV1 = {
      runId: 'run-002',
      instanceId: 'tiny-feasible',
      createdAt: '2026-07-10T12:01:00.000Z',
      status: 'feasible',
      input: FIXTURE_DRAFT,
      response: {
        runId: 'run-002',
        createdAt: '2026-07-10T12:01:00.000Z',
        instanceId: 'tiny-feasible',
        feasible: true,
        requiredFlow: 3,
        maxFlow: 3,
        assignments: [{ dayId: 'd1', medicId: 'm1', periodId: 'p1' }],
        stats: {
          nodes: 13,
          edges: 18,
          runtimeMs: 2
        }
      }
    };

    const mutatedCurrentDraft = {
      ...FIXTURE_DRAFT,
      days: FIXTURE_DRAFT.days.map((day) => (day.id === 'd1' ? { ...day, date: '2099-01-01' } : day)),
      medics: FIXTURE_DRAFT.medics.map((medic) => (medic.id === 'm1' ? { ...medic, name: 'Changed' } : medic))
    };

    expect(buildRunCsvContent(run)).toBe(
      [
        'runId,createdAt,instanceId,status,dayId,date,periodId,medicId,medicName,requiredFlow,maxFlow,runtimeMs',
        'run-002,2026-07-10T12:01:00.000Z,tiny-feasible,feasible,d1,2026-04-17,p1,m1,Ana,3,3,2'
      ].join('\n')
    );
    expect(buildCsvContent(mutatedCurrentDraft, run.response)).toContain('2099-01-01');
  });

  it('returns no assignment rows for infeasible results', () => {
    expect(
      buildAssignmentRows(FIXTURE_DRAFT, {
        instanceId: 'tiny-feasible',
        feasible: false,
        requiredFlow: 3,
        maxFlow: 2,
        assignments: [],
        stats: {
          nodes: 13,
          edges: 18,
          runtimeMs: 1
        },
        diagnostics: {
          summaryCode: 'INSUFFICIENT_COVERAGE',
          message: 'Unable to cover all days under current constraints.',
          uncoveredDays: ['d3']
        }
      })
    ).toEqual([]);
  });
});
