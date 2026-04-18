import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createValidatorSet, loadOpenApiDocument, SolveRequestSchema } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const testDataRoot = path.resolve(repoRoot, 'packages', 'test-data');
const manifest = JSON.parse(
  fs.readFileSync(path.resolve(testDataRoot, 'fixtures.manifest.json'), 'utf8')
);

const validators = createValidatorSet();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(testDataRoot, relativePath), 'utf8'));
}

test('openapi document exposes v1 endpoints', () => {
  const openapi = loadOpenApiDocument();
  assert.match(openapi, /\/health:/);
  assert.match(openapi, /\/v1\/solve:/);
});

test('health response schema accepts the canonical payload', () => {
  const payload = { status: 'ok' };
  assert.equal(validators.validateHealthResponse(payload), true);
});

test('request schema accepts all canonical input fixtures', () => {
  for (const fixture of manifest.fixtures) {
    const payload = readJson(fixture.inputPath);
    const valid = validators.validateSolveRequest(payload);
    assert.equal(valid, true, `${fixture.id}: ${JSON.stringify(validators.formatErrors(validators.validateSolveRequest.errors))}`);
  }
});

test('zod request schema is exported for direct consumers', () => {
  const payload = readJson('input/tiny-feasible.json');
  assert.equal(SolveRequestSchema.safeParse(payload).success, true);
});

test('response and error schemas accept canonical expected fixtures', () => {
  for (const fixture of manifest.fixtures) {
    if (!fixture.expectedPath) {
      continue;
    }

    const payload = readJson(fixture.expectedPath);
    if (fixture.assertionMode === 'exact-error') {
      const validError = validators.validateApiError(payload);
      assert.equal(validError, true, `${fixture.id}: ${JSON.stringify(validators.formatErrors(validators.validateApiError.errors))}`);
      continue;
    }

    const validResponse = validators.validateSolveResponse(payload);
    assert.equal(validResponse, true, `${fixture.id}: ${JSON.stringify(validators.formatErrors(validators.validateSolveResponse.errors))}`);
  }
});

test('request schema rejects malformed payloads', () => {
  const invalidRequest = {
    instanceId: 'broken',
    maxDaysPerMedic: 1,
    periods: [
      { id: 'p1', dayIds: ['d1'] }
    ],
    days: [
      { id: 'd1' }
    ],
    medics: [
      { id: 'm1', name: 'Ana' }
    ],
    availability: []
  };

  assert.equal(validators.validateSolveRequest(invalidRequest), false);
  assert.deepEqual(validators.formatErrors(validators.validateSolveRequest.errors), [
    {
      keyword: 'required',
      path: 'days.0.date',
      message: "must have required property 'date'"
    }
  ]);
});

test('response schema rejects inconsistent feasible payloads', () => {
  const invalidResponse = {
    instanceId: 'broken',
    feasible: true,
    requiredFlow: 1,
    maxFlow: 1,
    assignments: [],
    stats: {
      nodes: 1,
      edges: 1,
      runtimeMs: 0
    },
    diagnostics: {
      summaryCode: 'INSUFFICIENT_COVERAGE',
      message: 'should not exist',
      uncoveredDays: ['d1']
    }
  };

  assert.equal(validators.validateSolveResponse(invalidResponse), false);
  const paths = validators.formatErrors(validators.validateSolveResponse.errors).map((error) => error.keyword);
  assert.ok(paths.includes('not'));
});
