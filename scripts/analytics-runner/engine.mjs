import { spawn } from 'node:child_process';
import { once } from 'node:events';
import readline from 'node:readline';

import { repoRoot } from './config.mjs';
import { createCompactAnalyticsPayload, loadInput } from './inputs.mjs';
import { createRequestId } from './records.mjs';

export function runEngine(enginePath, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(enginePath, ['--stdin'], {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (exitCode) => {
      clearTimeout(timeout);
      resolve({
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timedOut
      });
    });
    child.stdin.end(`${JSON.stringify(payload)}\n`);
  });
}

export function runBatchEngine(enginePath, chunk, timeoutMs) {
  return new Promise((resolve, reject) => {
    const usesCompactAnalytics = chunk.every(({ entry }) => !entry.inputPath);
    const args = ['--stdin', usesCompactAnalytics ? '--analytics-jsonl' : '--batch-jsonl'];
    if (usesCompactAnalytics && summaryOnlyEnabled()) {
      args.push('--summary-only');
    }
    const child = spawn(enginePath, args, {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const stdoutLines = [];
    let stderr = '';
    let timedOut = false;
    const stdout = readline.createInterface({
      input: child.stdout,
      crlfDelay: Infinity
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stderr.setEncoding('utf8');
    stdout.on('line', (line) => {
      if (line.length > 0) {
        stdoutLines.push(line);
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (exitCode) => {
      clearTimeout(timeout);
      stdout.close();
      resolve({
        exitCode,
        stdoutLines,
        stderr: stderr.trim(),
        timedOut
      });
    });

    writeBatchPayloads(child.stdin, chunk).catch((error) => {
      child.kill('SIGTERM');
      reject(error);
    });
  });
}

function summaryOnlyEnabled() {
  const value = process.env.ANALYTICS_SUMMARY_ONLY ?? 'true';
  if (['1', 'true', 'yes'].includes(value.toLowerCase())) {
    return true;
  }
  if (['0', 'false', 'no'].includes(value.toLowerCase())) {
    return false;
  }
  throw new Error('ANALYTICS_SUMMARY_ONLY must be a boolean value: true/false or 1/0.');
}

export function parseEngineError(stderr) {
  try {
    return JSON.parse(stderr);
  } catch {
    return null;
  }
}

async function writeBatchPayloads(stdin, chunk) {
  stdin.setDefaultEncoding('utf8');
  const usesCompactAnalytics = chunk.every(({ entry }) => !entry.inputPath);
  for (const { entry } of chunk) {
    const payload = usesCompactAnalytics
      ? createCompactAnalyticsPayload(entry)
      : {
          requestId: createRequestId(entry),
          input: await loadInput(entry)
        };

    if (!stdin.write(`${JSON.stringify(payload)}\n`)) {
      await once(stdin, 'drain');
    }
  }
  stdin.end();
}
