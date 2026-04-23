import type { InstanceDraft } from '../types.js';
import { SolveRequestSchema } from '@maxflow/contracts/v1/schemas';

export const FIXTURE_DRAFT: InstanceDraft = {
  instanceId: 'tiny-feasible',
  maxDaysPerMedic: 2,
  periods: [
    { id: 'p1', dayIds: ['d1', 'd2'] },
    { id: 'p2', dayIds: ['d3'] }
  ],
  days: [
    { id: 'd1', date: '2026-04-17' },
    { id: 'd2', date: '2026-04-18' },
    { id: 'd3', date: '2026-04-20' }
  ],
  medics: [
    { id: 'm1', name: 'Ana' },
    { id: 'm2', name: 'Luis' }
  ],
  availability: [
    { medicId: 'm1', dayId: 'd1' },
    { medicId: 'm1', dayId: 'd3' },
    { medicId: 'm2', dayId: 'd2' }
  ]
};

export const INFEASIBLE_FIXTURE_DRAFT: InstanceDraft = {
  instanceId: 'tiny-infeasible-availability',
  maxDaysPerMedic: 2,
  periods: [
    { id: 'p1', dayIds: ['d1', 'd2'] },
    { id: 'p2', dayIds: ['d3'] }
  ],
  days: [
    { id: 'd1', date: '2026-04-17' },
    { id: 'd2', date: '2026-04-18' },
    { id: 'd3', date: '2026-04-20' }
  ],
  medics: [
    { id: 'm1', name: 'Ana' },
    { id: 'm2', name: 'Luis' }
  ],
  availability: [
    { medicId: 'm1', dayId: 'd1' },
    { medicId: 'm2', dayId: 'd2' }
  ]
};

export function createEmptyDraft(): InstanceDraft {
  return {
    instanceId: 'draft-001',
    maxDaysPerMedic: 1,
    periods: [],
    days: [],
    medics: [],
    availability: []
  };
}

export async function parseDraftFile(file: File): Promise<InstanceDraft> {
  const rawText = await file.text();
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  const result = SolveRequestSchema.safeParse(parsed);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path.length ? ` (${firstIssue.path.join('.')})` : '';
    throw new Error(`${firstIssue?.message ?? 'The selected file is not a valid solve request.'}${path}`);
  }

  return result.data;
}
