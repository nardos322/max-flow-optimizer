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
    engineParseMs: null,
    syntheticGenerateMs: null,
    engineSolveMs: null,
    engineTotalMs: null,
    normalizeMs: null,
    buildNetworkMs: null,
    maxFlowMs: null,
    finalizeMs: null,
    solveTotalMs: null,
    status: 'error',
    errorCode
  };
}

export function createOkRecord(entry, response, wallTimeMs) {
  const nodes = response.stats?.nodes ?? null;
  const edges = response.stats?.edges ?? null;
  const timings = response.analytics?.timings ?? {};

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
    engineParseMs: timings.parseMs ?? null,
    syntheticGenerateMs: timings.generateMs ?? null,
    engineSolveMs: timings.solveMs ?? null,
    engineTotalMs: timings.totalMs ?? null,
    normalizeMs: timings.normalizeMs ?? null,
    buildNetworkMs: timings.buildNetworkMs ?? null,
    maxFlowMs: timings.maxFlowMs ?? null,
    finalizeMs: timings.finalizeMs ?? null,
    solveTotalMs: timings.solveTotalMs ?? null,
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
    errors: 0,
    runtimeMsTotal: 0,
    engineTotalMsTotal: 0,
    engineSolveMsTotal: 0,
    syntheticGenerateMsTotal: 0,
    engineParseMsTotal: 0,
    normalizeMsTotal: 0,
    buildNetworkMsTotal: 0,
    maxFlowMsTotal: 0,
    finalizeMsTotal: 0,
    wallTimeMsTotal: 0,
    recordsWithRuntime: 0,
    recordsWithEngineTimings: 0,
    recordsWithWallTime: 0
  };
}

export async function writeRecord(outputStream, stats, record) {
  stats.runs += 1;
  if (record.status === 'ok') {
    stats.ok += 1;
  } else {
    stats.errors += 1;
  }
  if (typeof record.runtimeMs === 'number') {
    stats.runtimeMsTotal += record.runtimeMs;
    stats.recordsWithRuntime += 1;
  }
  if (typeof record.engineTotalMs === 'number') {
    stats.engineTotalMsTotal += record.engineTotalMs;
    stats.engineSolveMsTotal += record.engineSolveMs ?? 0;
    stats.syntheticGenerateMsTotal += record.syntheticGenerateMs ?? 0;
    stats.engineParseMsTotal += record.engineParseMs ?? 0;
    stats.normalizeMsTotal += record.normalizeMs ?? 0;
    stats.buildNetworkMsTotal += record.buildNetworkMs ?? 0;
    stats.maxFlowMsTotal += record.maxFlowMs ?? 0;
    stats.finalizeMsTotal += record.finalizeMs ?? 0;
    stats.recordsWithEngineTimings += 1;
  }
  if (typeof record.wallTimeMs === 'number') {
    stats.wallTimeMsTotal += record.wallTimeMs;
    stats.recordsWithWallTime += 1;
  }

  if (!outputStream.write(`${JSON.stringify(record)}\n`)) {
    await once(outputStream, 'drain');
  }
}
