export const profiles = [
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

export function selectProfiles(rawSelection) {
  if (!rawSelection?.trim()) {
    return profiles;
  }

  const requested = new Set(rawSelection.split(',').map((value) => value.trim()).filter(Boolean));
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

export function createManifestEntry(profile, index, { includeInputPath = false, availabilityPairs = null } = {}) {
  const seed = profile.seed + index;
  const instanceId = createInstanceId(profile, index);
  const entry = {
    scenarioName: profile.name,
    seed,
    instanceId,
    inputPath: null,
    daysCount: profile.daysCount,
    medicsCount: profile.medicsCount,
    periodsCount: profile.periodsCount,
    availabilityDensity: profile.availabilityDensity,
    maxDaysPerMedic: profile.maxDaysPerMedic,
    availabilityPairs
  };

  if (includeInputPath) {
    entry.inputPath = `data/generated/${profile.name}/${instanceId}.json`;
  }

  return entry;
}

export function generateInstance(profile, seed, index) {
  const random = createPrng(seed);
  const instanceId = createInstanceId(profile, index);
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

export function findProfile(name) {
  const profile = profiles.find((candidate) => candidate.name === name);
  if (!profile) {
    throw new Error(`Unknown analytics scenario in manifest: ${name}`);
  }
  return profile;
}

function createInstanceId(profile, index) {
  return `${profile.name}-${String(index + 1).padStart(4, '0')}`;
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
