import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createManifestEntry, generateInstance, selectProfiles } from './analytics-scenarios.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(repoRoot, 'data/generated');

async function main() {
  const selectedProfiles = selectProfiles(process.env.ANALYTICS_SCENARIOS);
  const runsPerScenario = readPositiveIntegerEnv('ANALYTICS_RUNS_PER_SCENARIO', 10);
  const writeInputFiles = readBooleanEnv('ANALYTICS_WRITE_INPUT_FILES', false);
  await fs.mkdir(outputRoot, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    runsPerScenario,
    inputMode: writeInputFiles ? 'files' : 'generated',
    scenarios: []
  };

  for (const profile of selectedProfiles) {
    if (writeInputFiles) {
      await fs.mkdir(path.join(outputRoot, profile.name), { recursive: true });
    }

    for (let index = 0; index < runsPerScenario; index += 1) {
      const entry = createManifestEntry(profile, index, { includeInputPath: writeInputFiles });
      if (writeInputFiles) {
        const instance = generateInstance(profile, entry.seed, index);
        entry.availabilityPairs = instance.availability.length;
        await fs.writeFile(path.join(repoRoot, entry.inputPath), `${JSON.stringify(instance)}\n`);
      }
      manifest.scenarios.push(entry);
    }
  }

  await fs.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        output: path.relative(repoRoot, outputRoot),
        scenarios: selectedProfiles.map((profile) => profile.name),
        generatedInstances: manifest.scenarios.length,
        inputMode: manifest.inputMode
      },
      null,
      2
    )
  );
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

function readBooleanEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }

  if (['1', 'true', 'yes'].includes(value.toLowerCase())) {
    return true;
  }
  if (['0', 'false', 'no'].includes(value.toLowerCase())) {
    return false;
  }
  throw new Error(`${name} must be a boolean value: true/false or 1/0.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
