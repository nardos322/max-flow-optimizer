import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const profiles = {
  small: {
    ANALYTICS_SCENARIOS: 'small-sparse',
    ANALYTICS_RUNS_PER_SCENARIO: '2',
    ANALYTICS_MANIFEST_ORDER: 'interleaved',
    ANALYTICS_BATCH_SIZE: '2',
    ANALYTICS_CONCURRENCY: '1'
  },
  '50k': {
    ANALYTICS_RUNS_PER_SCENARIO: '5000',
    ANALYTICS_MANIFEST_ORDER: 'interleaved',
    ANALYTICS_OUTPUT_FORMAT: 'parquet',
    ANALYTICS_BATCH_SIZE: '100',
    ANALYTICS_CONCURRENCY: 'auto',
    ANALYTICS_UPDATE_LATEST_OUTPUT: 'false'
  },
  '500k': {
    ANALYTICS_RUNS_PER_SCENARIO: '50000',
    ANALYTICS_MANIFEST_ORDER: 'interleaved',
    ANALYTICS_OUTPUT_FORMAT: 'parquet',
    ANALYTICS_BATCH_SIZE: '500',
    ANALYTICS_CONCURRENCY: '8',
    ANALYTICS_UPDATE_LATEST_OUTPUT: 'false'
  },
  benchmark: {
    ANALYTICS_RUNS_PER_SCENARIO: '5000',
    ANALYTICS_MANIFEST_ORDER: 'interleaved',
    ANALYTICS_OUTPUT_FORMAT: 'parquet',
    ANALYTICS_BATCH_SIZE: '500',
    ANALYTICS_CONCURRENCY: '8',
    ANALYTICS_UPDATE_LATEST_OUTPUT: 'false',
    ANALYTICS_MAX_ERROR_RATE: '0'
  }
};

async function main() {
  const profileName = process.argv[2];
  const profile = profiles[profileName];
  if (!profile) {
    throw new Error(`Unknown analytics profile: ${profileName ?? '(missing)'}. Use one of: ${Object.keys(profiles).join(', ')}.`);
  }

  const env = {
    ...profile,
    ...process.env,
    ANALYTICS_PROFILE: profileName
  };

  console.log(`Running analytics profile: ${profileName}`);
  for (const [name, value] of Object.entries(profile)) {
    console.log(`${name}=${env[name]}`);
  }

  await runPnpmAnalytics(env);
}

function runPnpmAnalytics(env) {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['analytics'], {
      cwd: repoRoot,
      env,
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }
      reject(new Error(`analytics profile failed with exit code ${exitCode}.`));
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
