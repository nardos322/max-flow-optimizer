import { once } from 'node:events';

export function createBaseRecord(entry, wallTimeMs) {
  return {
    runId: createRequestId(entry),
    scenarioName: entry.scenarioName,
    seed: entry.seed,
    solverTarget: 'engine',
    instanceId: entry.instanceId,
    daysCount: entry.daysCount,
    medicsCount: entry.medicsCount,
    periodsCount: entry.periodsCount,
    availabilityPairs: entry.availabilityPairs,
    availabilityDensity: entry.availabilityDensity,
    maxDaysPerMedic: entry.maxDaysPerMedic,
    wallTimeMs
  };
}

export function createErrorRecord(entry, { wallTimeMs, errorCode }) {
  return {
    ...createBaseRecord(entry, wallTimeMs),
    feasible: null,
    requiredFlow: null,
    maxFlow: null,
    uncoveredDaysCount: null,
    nodes: null,
    edges: null,
    edgesPerNode: null,
    runtimeMs: null,
    status: 'error',
    errorCode
  };
}

export function createOkRecord(entry, response, wallTimeMs) {
  const nodes = response.stats?.nodes ?? null;
  const edges = response.stats?.edges ?? null;

  return {
    ...createBaseRecord(entry, wallTimeMs),
    feasible: response.feasible,
    requiredFlow: response.requiredFlow,
    maxFlow: response.maxFlow,
    uncoveredDaysCount: response.uncoveredDaysCount ?? response.diagnostics?.uncoveredDays?.length ?? 0,
    nodes,
    edges,
    edgesPerNode:
      typeof nodes === 'number' && nodes > 0 && typeof edges === 'number' ? Number((edges / nodes).toFixed(4)) : null,
    runtimeMs: response.stats?.runtimeMs ?? null,
    status: 'ok',
    errorCode: null
  };
}

export function createRequestId(entry) {
  return `analytics-${entry.instanceId}-${entry.seed}`;
}

export function applyAnalyticsMetadata(entry, response) {
  const availabilityPairs = response.analytics?.availabilityPairs;
  if (typeof availabilityPairs === 'number') {
    entry.availabilityPairs = availabilityPairs;
  }
  return entry;
}

export function createRunStats() {
  return {
    runs: 0,
    ok: 0,
    errors: 0
  };
}

export async function writeRecord(outputStream, stats, record) {
  stats.runs += 1;
  if (record.status === 'ok') {
    stats.ok += 1;
  } else {
    stats.errors += 1;
  }

  if (!outputStream.write(`${JSON.stringify(record)}\n`)) {
    await once(outputStream, 'drain');
  }
}
