import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_DOMAIN_LIMITS,
  findPrimaryDomainError,
  toApiErrorEnvelope,
  validateSolveRequestDomain
} from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const testDataRoot = path.resolve(repoRoot, 'packages', 'test-data');
const manifest = JSON.parse(
  fs.readFileSync(path.resolve(testDataRoot, 'fixtures.manifest.json'), 'utf8')
);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(testDataRoot, relativePath), 'utf8'));
}

const context = {
  requestId: '00000000-0000-0000-0000-000000000000',
  timestamp: '2026-03-07T00:00:00.000Z'
};

test('canonical invalid fixtures map to exact error snapshots', () => {
  const invalidFixtures = manifest.fixtures.filter((fixture) => fixture.category === 'invalid');

  for (const fixture of invalidFixtures) {
    const input = readJson(fixture.inputPath);
    const expected = readJson(fixture.expectedPath);
    const primaryError = findPrimaryDomainError(input, { limits: DEFAULT_DOMAIN_LIMITS });

    assert.ok(primaryError, `${fixture.id}: expected a domain error`);
    assert.deepEqual(toApiErrorEnvelope(primaryError, context), expected, fixture.id);
  }
});

test('canonical valid, infeasible, smoke and benchmark fixtures pass domain validation', () => {
  const allowedCategories = new Set(['feasible', 'infeasible', 'smoke', 'benchmark']);
  const fixtures = manifest.fixtures.filter((fixture) => allowedCategories.has(fixture.category));

  for (const fixture of fixtures) {
    const input = readJson(fixture.inputPath);
    const errors = validateSolveRequestDomain(input, { limits: DEFAULT_DOMAIN_LIMITS });
    assert.deepEqual(errors, [], fixture.id);
  }
});

test('domain validator catches negative capacity when schema layer is bypassed', () => {
  const input = readJson('input/tiny-feasible.json');
  input.maxDaysPerMedic = -1;

  const primaryError = findPrimaryDomainError(input, { limits: DEFAULT_DOMAIN_LIMITS });

  assert.deepEqual(toApiErrorEnvelope(primaryError, context), {
    error: {
      requestId: context.requestId,
      timestamp: context.timestamp,
      code: 'INVALID_CAPACITY',
      message: 'maxDaysPerMedic must be greater than or equal to 0.',
      details: {
        field: 'maxDaysPerMedic',
        value: -1
      }
    }
  });
});

test('domain validator catches operational limits with INVALID_INPUT', () => {
  const input = readJson('input/tiny-feasible.json');
  const primaryError = findPrimaryDomainError(input, {
    limits: {
      ...DEFAULT_DOMAIN_LIMITS,
      maxDays: 2
    }
  });

  assert.deepEqual(toApiErrorEnvelope(primaryError, context), {
    error: {
      requestId: context.requestId,
      timestamp: context.timestamp,
      code: 'INVALID_INPUT',
      message: 'Operational limit exceeded for maxDays.',
      details: {
        limit: 'maxDays',
        max: 2,
        actual: 3
      }
    }
  });
});

test('domain validator maps unknown references in availability', () => {
  const input = readJson('input/tiny-feasible.json');
  input.availability.push({ medicId: 'm1', dayId: 'd99' });

  const primaryError = findPrimaryDomainError(input, { limits: DEFAULT_DOMAIN_LIMITS });

  assert.deepEqual(toApiErrorEnvelope(primaryError, context), {
    error: {
      requestId: context.requestId,
      timestamp: context.timestamp,
      code: 'UNKNOWN_REFERENCE',
      message: 'Unknown reference found in availability.dayId.',
      details: {
        entity: 'availability',
        field: 'dayId',
        value: 'd99'
      }
    }
  });
});
