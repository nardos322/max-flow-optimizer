import type { z } from 'zod';
import { validateSolveRequestDomain } from '@maxflow/domain';
import { SolveRequestSchema } from '@maxflow/contracts/v1/schemas';

import type { InstanceDraft } from '../../types.js';

export type DraftIssue = {
  code: string;
  message: string;
  path?: string;
  source: 'schema' | 'domain';
};

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
