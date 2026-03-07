import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

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

function createAjv() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false
  });
  addFormats(ajv);

  for (const schemaName of Object.keys(SCHEMA_FILENAMES)) {
    ajv.addSchema(loadSchema(schemaName));
  }

  return ajv;
}

export function formatAjvErrors(errors = []) {
  const normalizedErrors = Array.isArray(errors) ? errors : [];
  return normalizedErrors.map((error) => {
    const basePath = error.instancePath ? error.instancePath.slice(1).replace(/\//g, '.') : '$';
    const missingProperty = error.keyword === 'required' ? error.params.missingProperty : null;
    const pathLabel = missingProperty
      ? basePath === '$'
        ? missingProperty
        : `${basePath}.${missingProperty}`
      : basePath;

    return {
      keyword: error.keyword,
      path: pathLabel,
      message: error.message ?? 'Validation error.'
    };
  });
}

export function createValidatorSet() {
  const ajv = createAjv();

  const validateSolveRequest = ajv.getSchema(loadSchema('solveRequest').$id);
  const validateSolveResponse = ajv.getSchema(loadSchema('solveResponse').$id);
  const validateApiError = ajv.getSchema(loadSchema('apiError').$id);
  const validateHealthResponse = ajv.getSchema(loadSchema('healthResponse').$id);

  return {
    validateSolveRequest,
    validateSolveResponse,
    validateApiError,
    validateHealthResponse,
    formatErrors(errors) {
      return formatAjvErrors(errors);
    }
  };
}
