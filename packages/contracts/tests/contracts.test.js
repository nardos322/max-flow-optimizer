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

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
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

test('request schema rejects representative structural violations', () => {
  const baseRequest = readJson('input/tiny-feasible.json');
  const cases = [
    {
      name: 'additional root property',
      mutate(payload) {
        payload.unexpected = true;
      },
      expected: { keyword: 'additionalProperties', path: '$' }
    },
    {
      name: 'empty instance id',
      mutate(payload) {
        payload.instanceId = '';
      },
      expected: { keyword: 'minimum', path: 'instanceId' }
    },
    {
      name: 'decimal maxDaysPerMedic',
      mutate(payload) {
        payload.maxDaysPerMedic = 1.5;
      },
      expected: { keyword: 'invalid_type', path: 'maxDaysPerMedic' }
    },
    {
      name: 'invalid date',
      mutate(payload) {
        payload.days[0].date = '2026-02-30';
      },
      expected: { keyword: 'custom', path: 'days.0.date' }
    },
    {
      name: 'empty periods',
      mutate(payload) {
        payload.periods = [];
      },
      expected: { keyword: 'minItems', path: 'periods' }
    },
    {
      name: 'additional nested property',
      mutate(payload) {
        payload.medics[0].role = 'backup';
      },
      expected: { keyword: 'additionalProperties', path: 'medics.0' }
    }
  ];

  for (const { name, mutate, expected } of cases) {
    const payload = cloneJson(baseRequest);
    mutate(payload);

    assert.equal(validators.validateSolveRequest(payload), false, name);
    assert.match(
      JSON.stringify(validators.formatErrors(validators.validateSolveRequest.errors)),
      new RegExp(`"keyword":"${expected.keyword}".*"path":"${expected.path.replace(/\$/g, '\\$')}"`),
      name
    );
  }
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

test('response schema rejects representative structural violations', () => {
  const feasibleResponse = readJson('expected/tiny-feasible.response.json');
  const infeasibleResponse = readJson('expected/tiny-infeasible-availability.response.json');
  const cases = [
    {
      name: 'infeasible response without diagnostics',
      payload: (() => {
        const payload = cloneJson(infeasibleResponse);
        delete payload.diagnostics;
        return payload;
      })(),
      expected: { keyword: 'required', path: 'diagnostics' }
    },
    {
      name: 'infeasible response with assignments',
      payload: (() => {
        const payload = cloneJson(infeasibleResponse);
        payload.assignments = [{ dayId: 'd1', medicId: 'm1', periodId: 'p1' }];
        return payload;
      })(),
      expected: { keyword: 'maxItems', path: 'assignments' }
    },
    {
      name: 'duplicate uncovered days',
      payload: (() => {
        const payload = cloneJson(infeasibleResponse);
        payload.diagnostics.uncoveredDays = ['d1', 'd1'];
        return payload;
      })(),
      expected: { keyword: 'custom', path: 'diagnostics.uncoveredDays' }
    },
    {
      name: 'additional stats property',
      payload: (() => {
        const payload = cloneJson(feasibleResponse);
        payload.stats.extra = 1;
        return payload;
      })(),
      expected: { keyword: 'additionalProperties', path: 'stats' }
    }
  ];

  for (const { name, payload, expected } of cases) {
    assert.equal(validators.validateSolveResponse(payload), false, name);
    assert.match(
      JSON.stringify(validators.formatErrors(validators.validateSolveResponse.errors)),
      new RegExp(`"keyword":"${expected.keyword}".*"path":"${expected.path}"`),
      name
    );
  }
});

test('error schema rejects invalid error envelopes', () => {
  const baseError = readJson('expected/invalid-duplicate-id.error.json');
  const cases = [
    {
      name: 'invalid error code',
      mutate(payload) {
        payload.error.code = 'NOT_A_CODE';
      },
      expected: { keyword: 'enum', path: 'error.code' }
    },
    {
      name: 'invalid timestamp',
      mutate(payload) {
        payload.error.timestamp = 'not-a-date';
      },
      expected: { keyword: 'invalid_string', path: 'error.timestamp' }
    },
    {
      name: 'additional envelope property',
      mutate(payload) {
        payload.extra = true;
      },
      expected: { keyword: 'additionalProperties', path: '$' }
    }
  ];

  for (const { name, mutate, expected } of cases) {
    const payload = cloneJson(baseError);
    mutate(payload);

    assert.equal(validators.validateApiError(payload), false, name);
    assert.match(
      JSON.stringify(validators.formatErrors(validators.validateApiError.errors)),
      new RegExp(`"keyword":"${expected.keyword}".*"path":"${expected.path.replace(/\$/g, '\\$')}"`),
      name
    );
  }
});
