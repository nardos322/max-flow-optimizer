import type { z } from 'zod';
import { findPrimaryDomainError } from '@maxflow/domain';
import { validateSolveRequestDomain } from '@maxflow/domain';
import { SolveRequestSchema } from '@maxflow/contracts/v1/schemas';
import type { SolveResponseV1 } from '@maxflow/contracts/v1';

import type { DayAssignmentRow, InstanceDraft } from '../types.js';

export type DraftIssue = {
  code: string;
  message: string;
  path?: string;
  source: 'schema' | 'domain';
};

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

export function getDraftIssue(draft: InstanceDraft): DraftIssue | null {
  return getDraftIssues(draft)[0] ?? null;
}

export function getDraftIssues(draft: InstanceDraft): DraftIssue[] {
  const structuralResult = SolveRequestSchema.safeParse(draft);
  if (!structuralResult.success) {
    const issues = formatZodIssues(structuralResult.error.issues);
    if (issues.length === 0) {
      return [
        {
          code: 'INVALID_INPUT',
          message: 'Complete the required fields before solving.',
          source: 'schema'
        }
      ];
    }

    return issues.map((issue) => ({
      code: issue.keyword.toUpperCase(),
      message: issue.message,
      path: issue.path,
      source: 'schema' as const
    }));
  }

  const domainErrors = validateSolveRequestDomain(draft);
  if (domainErrors.length === 0) {
    return [];
  }

  return domainErrors.map((domainError) => ({
    code: domainError.code,
    message: domainError.message ?? 'Input failed semantic validation.',
    source: 'domain' as const
  }));
}

export function describeIssue(issue: DraftIssue | null): string {
  if (!issue) {
    return 'Ready to solve.';
  }

  if (issue.source === 'schema' && issue.path) {
    return `${issue.message} (${issue.path})`;
  }

  return issue.message;
}

export function formatValidationIssue(issue?: FormattedValidationError): string {
  if (!issue) {
    return 'Validation error.';
  }

  return issue.path === '$' ? issue.message : `${issue.message} (${issue.path})`;
}

export function getPeriodIdForDay(periods: InstanceDraft['periods'], dayId: string): string | null {
  const period = periods.find((entry) => entry.dayIds.includes(dayId));
  return period?.id ?? null;
}

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

export function buildCsvContent(draft: InstanceDraft, result: SolveResponseV1 | null): string | null {
  const rows = buildAssignmentRows(draft, result);
  if (rows.length === 0) {
    return null;
  }

  const header = ['dayId', 'date', 'periodId', 'medicId', 'medicName'];
  const body = rows.map((row) => [row.dayId, row.date, row.periodId, row.medicId, row.medicName].map(escapeCsv).join(','));

  return [header.join(','), ...body].join('\n');
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.split('"').join('""')}"`;
  }

  return value;
}

type FormattedValidationError = {
  keyword: string;
  path: string;
  message: string;
};

function formatZodIssues(errors: z.ZodIssue[]): FormattedValidationError[] {
  return errors.map((issue) => ({
    keyword: getIssueKeyword(issue),
    path: issue.path.length > 0 ? issue.path.join('.') : '$',
    message: getIssueMessage(issue)
  }));
}

function getIssueKeyword(issue: z.ZodIssue): string {
  if (issue.code === 'invalid_type' && issue.received === 'undefined') {
    return 'required';
  }

  if (issue.code === 'invalid_type' && issue.expected === 'never') {
    return 'not';
  }

  if (issue.code === 'unrecognized_keys') {
    return 'additionalProperties';
  }

  if (issue.code === 'too_small') {
    return issue.type === 'array' ? 'minItems' : 'minimum';
  }

  if (issue.code === 'too_big') {
    return issue.type === 'array' ? 'maxItems' : 'maximum';
  }

  if (issue.code === 'invalid_literal') {
    return 'const';
  }

  if (issue.code === 'invalid_enum_value') {
    return 'enum';
  }

  return issue.code ?? 'custom';
}

function getIssueMessage(issue: z.ZodIssue): string {
  if (issue.code === 'invalid_type' && issue.received === 'undefined') {
    return `must have required property '${issue.path.at(-1)}'`;
  }

  if (issue.code === 'invalid_type' && issue.expected === 'never') {
    return 'must NOT be valid';
  }

  return issue.message ?? 'Validation error.';
}
