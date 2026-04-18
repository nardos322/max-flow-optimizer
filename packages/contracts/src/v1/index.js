import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ApiErrorSchema,
  HealthResponseSchema,
  SolveRequestSchema,
  SolveResponseSchema
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
};

const schemaCache = new Map();

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function loadSchema(schemaName) {
  const filename = SCHEMA_FILENAMES[schemaName];
  if (!filename) {
    throw new Error(`Unknown schema name: ${schemaName}`);
  }

  if (!schemaCache.has(schemaName)) {
    schemaCache.set(schemaName, readJsonFile(path.resolve(SCHEMAS_DIR, filename)));
  }

  return schemaCache.get(schemaName);
}

export function loadOpenApiDocument() {
  return fs.readFileSync(OPENAPI_PATH, 'utf8');
}

function formatPath(pathSegments = []) {
  return pathSegments.length > 0 ? pathSegments.join('.') : '$';
}

function getIssueKeyword(issue) {
  if (issue.params?.keyword) {
    return issue.params.keyword;
  }

  if (issue.code === 'invalid_type' && issue.received === 'undefined') {
    return 'required';
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

function getIssueMessage(issue) {
  if (issue.code === 'invalid_type' && issue.received === 'undefined') {
    const missingProperty = issue.path.at(-1);
    return `must have required property '${missingProperty}'`;
  }

  return issue.message ?? 'Validation error.';
}

export function formatZodErrors(errors = []) {
  const normalizedErrors = Array.isArray(errors) ? errors : [];
  return normalizedErrors.map((issue) => ({
    keyword: getIssueKeyword(issue),
    path: formatPath(issue.path),
    message: getIssueMessage(issue)
  }));
}

function createZodValidator(schema) {
  const validate = (data) => {
    const result = schema.safeParse(data);
    validate.errors = result.success ? null : result.error.issues;
    return result.success;
  };
  validate.errors = null;
  return validate;
}

export function createValidatorSet() {
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
