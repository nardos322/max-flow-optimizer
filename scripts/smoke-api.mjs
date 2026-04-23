import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';

const fixtures = [
  {
    name: 'tiny-feasible',
    inputPath: 'packages/test-data/input/tiny-feasible.json',
    expectedFeasible: true
  },
  {
    name: 'tiny-infeasible-availability',
    inputPath: 'packages/test-data/input/tiny-infeasible-availability.json',
    expectedFeasible: false
  },
  {
    name: 'medium-random-50x50',
    inputPath: 'packages/test-data/input/medium-random-50x50.json',
    expectedFeasible: null
  }
];

async function main() {
  const healthResponse = await fetch(`${baseUrl}/health`);
  if (!healthResponse.ok) {
    throw new Error(`Health check failed with status ${healthResponse.status}.`);
  }

  const healthPayload = await healthResponse.json();
  if (!isHealthPayload(healthPayload)) {
    throw new Error('Health response failed schema validation.');
  }

  const results = [];

  for (const fixture of fixtures) {
    const payload = JSON.parse(await fs.readFile(path.join(repoRoot, fixture.inputPath), 'utf8'));
    const startedAt = performance.now();
    const response = await fetch(`${baseUrl}/v1/solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const durationMs = Number((performance.now() - startedAt).toFixed(2));
    const responseBody = await response.json();

    if (!response.ok) {
      throw new Error(`${fixture.name} returned HTTP ${response.status}: ${JSON.stringify(responseBody)}`);
    }

    if (!isSolveResponsePayload(responseBody)) {
      throw new Error(`${fixture.name} returned an invalid solve response.`);
    }

    if (fixture.expectedFeasible !== null && responseBody.feasible !== fixture.expectedFeasible) {
      throw new Error(
        `${fixture.name} expected feasible=${fixture.expectedFeasible} but received feasible=${responseBody.feasible}.`
      );
    }

    results.push({
      fixture: fixture.name,
      feasible: responseBody.feasible,
      requiredFlow: responseBody.requiredFlow,
      maxFlow: responseBody.maxFlow,
      runtimeMs: responseBody.stats.runtimeMs,
      durationMs
    });
  }

  console.log(JSON.stringify({ baseUrl, health: healthPayload, results }, null, 2));
}

function isHealthPayload(value) {
  return typeof value === 'object' && value !== null && value.status === 'ok';
}

function isSolveResponsePayload(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.instanceId === 'string' &&
    typeof value.feasible === 'boolean' &&
    typeof value.requiredFlow === 'number' &&
    typeof value.maxFlow === 'number' &&
    Array.isArray(value.assignments) &&
    typeof value.stats === 'object' &&
    value.stats !== null &&
    typeof value.stats.runtimeMs === 'number'
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
