import type { SolveResponseV1 } from '@maxflow/contracts/v1';

import type { InstanceDraft } from '../../types.js';
import { buildAssignmentRows } from './assignmentRows.js';

export function buildCsvContent(draft: InstanceDraft, result: SolveResponseV1 | null): string | null {
  const rows = buildAssignmentRows(draft, result);
  if (rows.length === 0) {
    return null;
  }

  const header = ['dayId', 'date', 'periodId', 'medicId', 'medicName'];
  const body = rows.map((row) => [row.dayId, row.date, row.periodId, row.medicId, row.medicName].map(escapeCsv).join(','));

  return [header.join(','), ...body].join('\n');
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.split('"').join('""')}"`;
  }

  return value;
}
