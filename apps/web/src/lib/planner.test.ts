import { describe, expect, it } from 'vitest';

import { FIXTURE_DRAFT, parseDraftFile } from './fixture.js';
import { buildAssignmentRows, buildCsvContent, getDraftIssue } from './planner.js';

describe('planner helpers', () => {
  it('builds CSV rows enriched with dates and medic names', () => {
    const csv = buildCsvContent(FIXTURE_DRAFT, {
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
        'dayId,date,periodId,medicId,medicName',
        'd1,2026-04-17,p1,m1,Ana',
        'd2,2026-04-18,p1,m2,Luis',
        'd3,2026-04-20,p2,m1,Ana'
      ].join('\n')
    );
  });

  it('returns the first draft issue for incomplete input', () => {
    const issue = getDraftIssue({
      ...FIXTURE_DRAFT,
      medics: []
    });

    expect(issue).toMatchObject({
      source: 'schema'
    });
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

  it('parses a valid draft file for import', async () => {
    const file = new File([JSON.stringify(FIXTURE_DRAFT)], 'fixture.json', {
      type: 'application/json'
    });

    await expect(parseDraftFile(file)).resolves.toEqual(FIXTURE_DRAFT);
  });
});
