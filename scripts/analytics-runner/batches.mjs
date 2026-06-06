import { loadInput } from './inputs.mjs';
import { parseEngineError, runBatchEngine, runEngine } from './engine.mjs';
import {
  applyAnalyticsMetadata,
  createErrorRecord,
  createOkRecord,
  createRequestId,
  createRunStats,
  writeRecord
} from './records.mjs';

export async function runLegacyBatch(enginePath, entries, concurrency, engineTimeoutMs, outputStream) {
  const stats = createRunStats();
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, entries.length);

  async function worker() {
    while (nextIndex < entries.length) {
      const index = nextIndex;
      nextIndex += 1;
      const entry = entries[index];
      const input = await loadInput(entry);
      await writeRecord(outputStream, stats, await runInstance(enginePath, entry, input, engineTimeoutMs));
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return stats;
}

export async function runJsonlBatch(enginePath, entries, concurrency, engineTimeoutMs, batchSize, outputStream) {
  const stats = createRunStats();
  const workerCount = Math.min(concurrency, entries.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < entries.length) {
        const startIndex = nextIndex;
        nextIndex += batchSize;
        const chunk = entries
          .slice(startIndex, Math.min(startIndex + batchSize, entries.length))
          .map((entry) => ({ entry }));
        await runJsonlChunk(enginePath, chunk, outputStream, stats, engineTimeoutMs);
      }
    })
  );

  return stats;
}

async function runJsonlChunk(enginePath, chunk, outputStream, stats, engineTimeoutMs) {
  const startedAt = performance.now();
  const result = await runBatchEngine(enginePath, chunk, engineTimeoutMs * chunk.length);
  const batchWallTimeMs = Number((performance.now() - startedAt).toFixed(2));
  const amortizedWallTimeMs = Number((batchWallTimeMs / chunk.length).toFixed(2));

  if (result.exitCode !== 0 || result.timedOut) {
    for (const { entry } of chunk) {
      await writeRecord(
        outputStream,
        stats,
        createErrorRecord(entry, {
          wallTimeMs: amortizedWallTimeMs,
          errorCode: result.timedOut ? 'ENGINE_BATCH_TIMEOUT' : `EXIT_${result.exitCode}`
        })
      );
    }
    return;
  }

  const lines = result.stdoutLines;
  if (lines.length !== chunk.length) {
    for (const { entry } of chunk) {
      await writeRecord(
        outputStream,
        stats,
        createErrorRecord(entry, {
          wallTimeMs: amortizedWallTimeMs,
          errorCode: 'ENGINE_BATCH_OUTPUT_MISMATCH'
        })
      );
    }
    return;
  }

  for (const [lineIndex, line] of lines.entries()) {
    const { entry } = chunk[lineIndex];
    let response;
    try {
      response = JSON.parse(line);
    } catch {
      await writeRecord(
        outputStream,
        stats,
        createErrorRecord(entry, {
          wallTimeMs: amortizedWallTimeMs,
          errorCode: 'ENGINE_BATCH_INVALID_JSON'
        })
      );
      continue;
    }
    await writeRecord(
      outputStream,
      stats,
      response.error !== undefined
        ? createErrorRecord(entry, {
            wallTimeMs: amortizedWallTimeMs,
            errorCode: response.error.code ?? 'ENGINE_BATCH_ERROR'
          })
        : createOkRecord(applyAnalyticsMetadata(entry, response), response, amortizedWallTimeMs)
    );
  }
}

async function runInstance(enginePath, entry, input, engineTimeoutMs) {
  const requestId = createRequestId(entry);
  const startedAt = performance.now();
  const result = await runEngine(
    enginePath,
    {
      requestId,
      input
    },
    engineTimeoutMs
  );
  const wallTimeMs = Number((performance.now() - startedAt).toFixed(2));

  if (result.exitCode !== 0 || result.timedOut) {
    return createErrorRecord(entry, {
      wallTimeMs,
      errorCode:
        result.timedOut ? 'ENGINE_TIMEOUT' : parseEngineError(result.stderr)?.error?.code ?? `EXIT_${result.exitCode}`
    });
  }

  const response = JSON.parse(result.stdout);
  return createOkRecord(entry, response, wallTimeMs);
}
