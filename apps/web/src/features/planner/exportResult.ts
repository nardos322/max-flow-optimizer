import type { RunDetailV1, SolveResponseV1 } from '@maxflow/contracts/v1';

import type { InstanceDraft } from '../../types.js';
import { buildAssignmentRows } from './assignmentRows.js';

export function buildCsvContent(draft: InstanceDraft, result: SolveResponseV1 | null): string | null {
  const rows = buildAssignmentRows(draft, result);
  if (rows.length === 0) {
    return null;
  }
  const optimizationLoadByMedic = new Map(
    result?.optimization?.loadByMedic.map((load) => [load.medicId, load.assignedDays]) ?? []
  );

  const body = rows.map((row) =>
    [
      result?.runId ?? '',
      result?.createdAt ?? '',
      result?.instanceId ?? '',
      result?.feasible ? 'feasible' : 'infeasible',
      row.dayId,
      row.date,
      row.periodId,
      row.medicId,
      row.medicName,
      result?.requiredFlow ?? '',
      result?.maxFlow ?? '',
      result?.stats.runtimeMs ?? '',
      result?.optimization?.objective ?? '',
      result?.optimization?.score ?? '',
      result?.optimization?.totalCost ?? '',
      optimizationLoadByMedic.get(row.medicId) ?? '',
      result?.optimization?.spread ?? ''
    ]
      .map(escapeCsv)
      .join(',')
  );

  return [CSV_HEADER.join(','), ...body].join('\n');
}

export function buildRunCsvContent(run: RunDetailV1): string | null {
  return buildCsvContent(run.input, run.response);
}

const CSV_HEADER = [
  'runId',
  'createdAt',
  'instanceId',
  'status',
  'dayId',
  'date',
  'periodId',
  'medicId',
  'medicName',
  'requiredFlow',
  'maxFlow',
  'runtimeMs',
  'optimizationObjective',
  'optimizationScore',
  'optimizationTotalCost',
  'medicAssignedDays',
  'loadSpread'
];

function escapeCsv(value: string | number): string {
  const serializedValue = String(value);
  if (serializedValue.includes(',') || serializedValue.includes('"') || serializedValue.includes('\n')) {
    return `"${serializedValue.split('"').join('""')}"`;
  }

  return serializedValue;
}
