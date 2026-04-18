import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { z } from 'zod';
import {
  ApiErrorSchema,
  HealthResponseSchema,
  SolveRequestSchema,
  SolveResponseSchema
} from './schemas.js';
import type {
  ApiErrorV1,
  HealthResponseV1,
  SolveRequestV1,
  SolveResponseV1
} from './schemas.js';

export * from './schemas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const SCHEMAS_DIR = path.resolve(PACKAGE_ROOT, 'v1', 'schemas');
const OPENAPI_PATH = path.resolve(PACKAGE_ROOT, 'v1', 'openapi.yaml');

export const SCHEMA_FILENAMES = {
  solveRequest: 'solve.request.schema.json',
  solveResponse: 'solve.response.schema.json',
  apiError: 'error.schema.json',
  healthResponse: 'health.response.schema.json'
} as const;

export type SchemaNameV1 = keyof typeof SCHEMA_FILENAMES;
export type ZodValidationIssue = z.ZodIssue;

export type FormattedValidationError = {
  keyword: string;
  path: string;
  message: string;
};

export type ValidateFunction<T> = ((data: unknown) => data is T) & {
  errors?: ZodValidationIssue[] | null;
};

export type ValidatorSet = {
  validateSolveRequest: ValidateFunction<SolveRequestV1>;
  validateSolveResponse: ValidateFunction<SolveResponseV1>;
  validateApiError: ValidateFunction<ApiErrorV1>;
  validateHealthResponse: ValidateFunction<HealthResponseV1>;
  formatErrors(errors?: ZodValidationIssue[] | null): FormattedValidationError[];
};

const schemaCache = new Map<SchemaNameV1, Record<string, unknown>>();

function readJsonFile(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

export function loadSchema(schemaName: SchemaNameV1): Record<string, unknown> {
  const filename = SCHEMA_FILENAMES[schemaName];
  if (!filename) {
    throw new Error(`Unknown schema name: ${schemaName}`);
  }

  if (!schemaCache.has(schemaName)) {
    schemaCache.set(schemaName, readJsonFile(path.resolve(SCHEMAS_DIR, filename)));
  }

  return schemaCache.get(schemaName) as Record<string, unknown>;
}

export function loadOpenApiDocument(): string {
  return fs.readFileSync(OPENAPI_PATH, 'utf8');
}

function formatPath(pathSegments: ZodValidationIssue['path'] = []): string {
  return pathSegments.length > 0 ? pathSegments.join('.') : '$';
}

function getIssueKeyword(issue: ZodValidationIssue): string {
  if ('params' in issue && typeof issue.params?.keyword === 'string') {
    return issue.params.keyword;
  }

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

function getIssueMessage(issue: ZodValidationIssue): string {
  if (issue.code === 'invalid_type' && issue.received === 'undefined') {
    const missingProperty = issue.path.at(-1);
    return `must have required property '${missingProperty}'`;
  }

  if (issue.code === 'invalid_type' && issue.expected === 'never') {
    return 'must NOT be valid';
  }

  return issue.message ?? 'Validation error.';
}

export function formatZodErrors(errors: ZodValidationIssue[] | null = []): FormattedValidationError[] {
  const normalizedErrors = Array.isArray(errors) ? errors : [];
  return normalizedErrors.map((issue) => ({
    keyword: getIssueKeyword(issue),
    path: formatPath(issue.path),
    message: getIssueMessage(issue)
  }));
}

function createZodValidator<T>(schema: z.ZodType<T>): ValidateFunction<T> {
  const validate = ((data: unknown): data is T => {
    const result = schema.safeParse(data);
    validate.errors = result.success ? null : result.error.issues;
    return result.success;
  }) as ValidateFunction<T>;

  validate.errors = null;
  return validate;
}

export function createValidatorSet(): ValidatorSet {
  const validateSolveRequest = createZodValidator(SolveRequestSchema);
  const validateSolveResponse = createZodValidator(SolveResponseSchema);
  const validateApiError = createZodValidator(ApiErrorSchema);
  const validateHealthResponse = createZodValidator(HealthResponseSchema);

  return {
    validateSolveRequest,
    validateSolveResponse,
    validateApiError,
    validateHealthResponse,
    formatErrors(errors) {
      return formatZodErrors(errors);
    }
  };
}
