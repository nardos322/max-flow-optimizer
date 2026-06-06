import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(__dirname, '../..');
export const manifestPath = path.join(repoRoot, 'data/generated/manifest.json');
export const outputRoot = path.join(repoRoot, 'data/analytics');

export function resolveManifestShardPath() {
  const value = process.env.ANALYTICS_MANIFEST_SHARD;
  if (!value?.trim()) {
    return null;
  }
  return path.isAbsolute(value) ? value : path.join(repoRoot, value);
}

export async function resolveEnginePath() {
  const candidate =
    process.env.ANALYTICS_ENGINE_PATH ??
    process.env.ENGINE_PATH ??
    path.join(repoRoot, 'services/engine-cpp/build/maxflow_engine');

  try {
    await fs.access(candidate);
  } catch {
    throw new Error(`Engine binary not found at ${candidate}. Run pnpm run build:engine first.`);
  }

  return candidate;
}

export function resolvePython() {
  if (process.env.PYTHON) {
    return process.env.PYTHON;
  }

  const localVenvPython = path.join(repoRoot, '.venv/bin/python');
  return existsSync(localVenvPython) ? localVenvPython : 'python3';
}

export function readPositiveIntegerEnv(name, fallback) {
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

export function readOutputFormatEnv() {
  const value = process.env.ANALYTICS_OUTPUT_FORMAT ?? 'jsonl';
  if (['jsonl', 'parquet'].includes(value)) {
    return value;
  }
  throw new Error('ANALYTICS_OUTPUT_FORMAT must be jsonl or parquet.');
}

export function createTimestamp() {
  return new Date().toISOString().replaceAll(':', '').replaceAll('.', '').replace('Z', 'Z');
}
