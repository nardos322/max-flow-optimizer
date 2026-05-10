import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(repoRoot, 'data/generated');

const profiles = [
  {
    name: 'small-sparse',
    daysCount: 25,
    medicsCount: 10,
    periodsCount: 5,
    availabilityDensity: 0.15,
    maxDaysPerMedic: 3,
    seed: 1101
  },
  {
    name: 'small-balanced',
    daysCount: 25,
    medicsCount: 15,
    periodsCount: 5,
    availabilityDensity: 0.35,
    maxDaysPerMedic: 3,
    seed: 1201
  },
  {
    name: 'small-dense',
    daysCount: 25,
    medicsCount: 20,
    periodsCount: 5,
    availabilityDensity: 0.75,
    maxDaysPerMedic: 3,
    seed: 1301
  },
  {
    name: 'medium-sparse',
    daysCount: 100,
    medicsCount: 60,
    periodsCount: 10,
    availabilityDensity: 0.15,
    maxDaysPerMedic: 2,
    seed: 2001
  },
  {
    name: 'medium-balanced',
    daysCount: 100,
    medicsCount: 80,
    periodsCount: 10,
    availabilityDensity: 0.3,
    maxDaysPerMedic: 2,
    seed: 2101
  },
  {
    name: 'medium-dense',
    daysCount: 100,
    medicsCount: 80,
    periodsCount: 10,
    availabilityDensity: 0.7,
    maxDaysPerMedic: 2,
    seed: 2201
  },
  {
    name: 'large-sparse',
    daysCount: 200,
    medicsCount: 150,
    periodsCount: 20,
    availabilityDensity: 0.15,
    maxDaysPerMedic: 2,
    seed: 3001
  },
  {
    name: 'large-balanced',
    daysCount: 200,
    medicsCount: 200,
    periodsCount: 20,
    availabilityDensity: 0.3,
    maxDaysPerMedic: 2,
    seed: 3101
  },
  {
    name: 'large-dense',
    daysCount: 200,
    medicsCount: 240,
    periodsCount: 20,
    availabilityDensity: 0.7,
    maxDaysPerMedic: 2,
    seed: 3201
  },
  {
    name: 'xlarge-balanced',
    daysCount: 260,
    medicsCount: 260,
    periodsCount: 26,
    availabilityDensity: 0.3,
    maxDaysPerMedic: 3,
    seed: 4101
  }
];

async function main() {
  const selectedProfiles = getSelectedProfiles();
  const runsPerScenario = readPositiveIntegerEnv('ANALYTICS_RUNS_PER_SCENARIO', 10);
  await fs.mkdir(outputRoot, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    runsPerScenario,
    scenarios: []
  };

  for (const profile of selectedProfiles) {
    const scenarioDir = path.join(outputRoot, profile.name);
    await fs.mkdir(scenarioDir, { recursive: true });

    for (let index = 0; index < runsPerScenario; index += 1) {
      const runSeed = profile.seed + index;
      const instance = generateInstance(profile, runSeed, index);
      const relativePath = path.join('data/generated', profile.name, `${instance.instanceId}.json`);
      await fs.writeFile(path.join(repoRoot, relativePath), `${JSON.stringify(instance, null, 2)}\n`);

      manifest.scenarios.push({
        scenarioName: profile.name,
        seed: runSeed,
        instanceId: instance.instanceId,
        inputPath: relativePath,
        daysCount: profile.daysCount,
        medicsCount: profile.medicsCount,
        periodsCount: profile.periodsCount,
        availabilityDensity: profile.availabilityDensity,
        maxDaysPerMedic: profile.maxDaysPerMedic,
        availabilityPairs: instance.availability.length
      });
    }
  }

  await fs.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        output: path.relative(repoRoot, outputRoot),
        scenarios: selectedProfiles.map((profile) => profile.name),
        generatedInstances: manifest.scenarios.length
      },
      null,
      2
    )
  );
}

function getSelectedProfiles() {
  const raw = process.env.ANALYTICS_SCENARIOS?.trim();
  if (!raw) {
    return profiles;
  }

  const requested = new Set(raw.split(',').map((value) => value.trim()).filter(Boolean));
  const selected = profiles.filter((profile) => requested.has(profile.name));
  const missing = [...requested].filter((name) => !profiles.some((profile) => profile.name === name));

  if (missing.length > 0) {
    throw new Error(`Unknown analytics scenarios: ${missing.join(', ')}`);
  }
  if (selected.length === 0) {
    throw new Error('ANALYTICS_SCENARIOS did not select any scenario.');
  }

  return selected;
}

function generateInstance(profile, seed, index) {
  const random = createPrng(seed);
  const instanceId = `${profile.name}-${String(index + 1).padStart(4, '0')}`;
  const days = createDays(profile.daysCount);
  const periods = createPeriods(profile.periodsCount, days);
  const medics = Array.from({ length: profile.medicsCount }, (_, medicIndex) => ({
    id: `m${medicIndex + 1}`,
    name: `Medic ${medicIndex + 1}`
  }));
  const availability = [];

  for (const medic of medics) {
    for (const day of days) {
      if (random() < profile.availabilityDensity) {
        availability.push({ medicId: medic.id, dayId: day.id });
      }
    }
  }

  return {
    instanceId,
    maxDaysPerMedic: profile.maxDaysPerMedic,
    periods,
    days,
    medics,
    availability
  };
}

function createDays(daysCount) {
  const start = Date.UTC(2026, 0, 1);
  const dayMs = 24 * 60 * 60 * 1000;

  return Array.from({ length: daysCount }, (_, index) => ({
    id: `d${index + 1}`,
    date: new Date(start + index * dayMs).toISOString().slice(0, 10)
  }));
}

function createPeriods(periodsCount, days) {
  const periods = Array.from({ length: periodsCount }, (_, index) => ({
    id: `p${index + 1}`,
    dayIds: []
  }));

  for (let index = 0; index < days.length; index += 1) {
    periods[index % periods.length].dayIds.push(days[index].id);
  }

  return periods;
}

function createPrng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function readPositiveIntegerEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
