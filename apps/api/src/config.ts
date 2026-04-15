import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_DOMAIN_LIMITS } from '@maxflow/domain';

export type ApiConfig = {
  nodeEnv: string;
  port: number;
  repoRoot: string;
  enginePath: string;
  engineTimeoutMs: number;
  maxRequestBytes: number;
  logLevel: string;
  limits: {
    maxDays: number;
    maxMedics: number;
    maxPeriods: number;
    maxAvailabilityPairs: number;
  };
};

type LoadConfigOptions = {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
};

function findRepoRoot(startDir: string): string {
  let current = path.resolve(startDir);

  while (true) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Unable to locate repo root from ${startDir}`);
    }
    current = parent;
  }
}

function parseIntegerEnv(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const rawValue = env[name];
  if (rawValue === undefined || rawValue === '') {
    return fallback;
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return value;
}

export function loadConfig(options: LoadConfigOptions = {}): ApiConfig {
  const env = options.env ?? process.env;
  const repoRoot = findRepoRoot(options.cwd ?? process.cwd());
  const defaultEnginePath = path.join(repoRoot, 'services', 'engine-cpp', 'build', 'maxflow_engine');

  return {
    nodeEnv: env.NODE_ENV ?? 'development',
    port: parseIntegerEnv(env, 'PORT', 3000),
    repoRoot,
    enginePath: env.ENGINE_PATH && env.ENGINE_PATH.length > 0 ? env.ENGINE_PATH : defaultEnginePath,
    engineTimeoutMs: parseIntegerEnv(env, 'ENGINE_TIMEOUT_MS', 2000),
    maxRequestBytes: parseIntegerEnv(env, 'MAX_REQUEST_BYTES', 1000000),
    logLevel: env.LOG_LEVEL ?? 'info',
    limits: {
      maxDays: parseIntegerEnv(env, 'MAX_DAYS', DEFAULT_DOMAIN_LIMITS.maxDays),
      maxMedics: parseIntegerEnv(env, 'MAX_MEDICS', DEFAULT_DOMAIN_LIMITS.maxMedics),
      maxPeriods: parseIntegerEnv(env, 'MAX_PERIODS', DEFAULT_DOMAIN_LIMITS.maxPeriods),
      maxAvailabilityPairs: parseIntegerEnv(
        env,
        'MAX_AVAILABILITY_PAIRS',
        DEFAULT_DOMAIN_LIMITS.maxAvailabilityPairs
      )
    }
  };
}

export function assertRuntimeConfig(config: ApiConfig): void {
  if (!fs.existsSync(config.enginePath)) {
    throw new Error(`Engine binary was not found at ${config.enginePath}. Run pnpm run build:engine first.`);
  }
}
