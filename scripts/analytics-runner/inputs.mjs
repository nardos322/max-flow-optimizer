import fs from 'node:fs/promises';
import path from 'node:path';

import { findProfile, generateInstance } from '../analytics-scenarios.mjs';
import { repoRoot } from './config.mjs';
import { createRequestId } from './records.mjs';

export async function loadInput(entry) {
  if (entry.inputPath) {
    return JSON.parse(await fs.readFile(path.join(repoRoot, entry.inputPath), 'utf8'));
  }

  const profile = findProfile(entry.scenarioName);
  const input = generateInstance(profile, entry.seed, parseInstanceIndex(entry.instanceId));
  entry.availabilityPairs = input.availability.length;
  return input;
}

export function createCompactAnalyticsPayload(entry) {
  const profile = findProfile(entry.scenarioName);
  return {
    requestId: createRequestId(entry),
    scenarioName: entry.scenarioName,
    seed: entry.seed,
    instanceId: entry.instanceId,
    daysCount: entry.daysCount ?? profile.daysCount,
    medicsCount: entry.medicsCount ?? profile.medicsCount,
    periodsCount: entry.periodsCount ?? profile.periodsCount,
    availabilityDensity: entry.availabilityDensity ?? profile.availabilityDensity,
    maxDaysPerMedic: entry.maxDaysPerMedic ?? profile.maxDaysPerMedic
  };
}

function parseInstanceIndex(instanceId) {
  const match = instanceId.match(/-(\d+)$/);
  if (!match) {
    throw new Error(`Invalid analytics instanceId: ${instanceId}`);
  }
  return Number.parseInt(match[1], 10) - 1;
}
