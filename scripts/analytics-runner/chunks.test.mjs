import test from 'node:test';
import assert from 'node:assert/strict';

import { estimateEntryCost, planJsonlChunks } from './chunks.mjs';

function entry(name, index, overrides = {}) {
  return {
    scenarioName: name,
    instanceId: `${name}-${index}`,
    seed: index,
    daysCount: 10,
    medicsCount: 10,
    periodsCount: 2,
    availabilityDensity: 0.1,
    availabilityPairs: null,
    ...overrides
  };
}

test('estimateEntryCost uses graph size inputs', () => {
  const sparse = entry('sparse', 1, { availabilityDensity: 0.1 });
  const dense = entry('dense', 1, { availabilityDensity: 0.9 });

  assert.ok(estimateEntryCost(dense) > estimateEntryCost(sparse));
});

test('sequential chunk strategy preserves manifest order', () => {
  const entries = [entry('a', 1), entry('b', 2), entry('c', 3), entry('d', 4), entry('e', 5)];
  const chunks = planJsonlChunks(entries, 2, 'sequential');

  assert.deepEqual(
    chunks.map((chunk) => chunk.entries.map((item) => item.instanceId)),
    [['a-1', 'b-2'], ['c-3', 'd-4'], ['e-5']]
  );
});

test('cost-balanced chunk strategy spreads expensive entries across chunks', () => {
  const entries = [
    entry('heavy-a', 1, { daysCount: 200, medicsCount: 240, availabilityDensity: 0.7 }),
    entry('heavy-b', 2, { daysCount: 200, medicsCount: 240, availabilityDensity: 0.7 }),
    entry('light-a', 3, { daysCount: 25, medicsCount: 10, availabilityDensity: 0.1 }),
    entry('light-b', 4, { daysCount: 25, medicsCount: 10, availabilityDensity: 0.1 })
  ];

  const chunks = planJsonlChunks(entries, 2, 'cost-balanced');

  assert.equal(chunks.length, 2);
  assert.ok(chunks.every((chunk) => chunk.entries.length === 2));
  assert.ok(chunks.every((chunk) => chunk.entries.some((item) => item.scenarioName.startsWith('heavy'))));
});

test('invalid chunk strategy is rejected', () => {
  assert.throws(() => planJsonlChunks([], 10, 'unknown'), /ANALYTICS_CHUNK_STRATEGY/);
});
