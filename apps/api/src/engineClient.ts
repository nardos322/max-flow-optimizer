import { spawn } from 'node:child_process';
import fs from 'node:fs';

import type { Logger } from 'pino';

import type { SolveRequestV1, SolveResponseV1, ValidatorSet } from '@maxflow/contracts';

import type { ApiConfig } from './config.js';
import { ApiHttpError } from './errors.js';

export type EngineClient = {
  solve(requestId: string, input: SolveRequestV1): Promise<SolveResponseV1>;
};

type ChildResult = {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

function parseEngineErrorMessage(stderr: string): string {
  if (!stderr.trim()) {
    return 'Engine returned an error without stderr details.';
  }

  try {
    const parsed = JSON.parse(stderr) as { error?: { message?: string } };
    return parsed.error?.message ?? stderr.trim();
  } catch {
    return stderr.trim();
  }
}

export class CliEngineClient implements EngineClient {
  constructor(
    private readonly config: ApiConfig,
    private readonly validators: ValidatorSet,
    private readonly logger: Logger
  ) {}

  async solve(requestId: string, input: SolveRequestV1): Promise<SolveResponseV1> {
    if (!fs.existsSync(this.config.enginePath)) {
      throw new ApiHttpError(500, 'ENGINE_EXECUTION_FAILED', 'Engine binary was not found.', {
        enginePath: this.config.enginePath
      });
    }

    const payload = JSON.stringify({ requestId, input });
    const startedAt = Date.now();
    const result = await this.runChild(payload);
    const runtimeMs = Date.now() - startedAt;

    this.logger.info(
      {
        requestId,
        engineExitCode: result.exitCode,
        engineSignal: result.signal,
        runtimeMs,
        payloadBytes: Buffer.byteLength(payload)
      },
      'engine run completed'
    );

    if (result.timedOut) {
      throw new ApiHttpError(500, 'ENGINE_TIMEOUT', 'Engine execution timed out.', {
        timeoutMs: this.config.engineTimeoutMs
      });
    }

    if (result.exitCode === 2) {
      throw new ApiHttpError(400, 'INVALID_INPUT', parseEngineErrorMessage(result.stderr));
    }

    if (result.exitCode !== 0) {
      throw new ApiHttpError(500, 'ENGINE_INTERNAL_ERROR', parseEngineErrorMessage(result.stderr), {
        exitCode: result.exitCode,
        signal: result.signal
      });
    }

    let parsedOutput: unknown;
    try {
      parsedOutput = JSON.parse(result.stdout);
    } catch {
      throw new ApiHttpError(500, 'ENGINE_INVALID_OUTPUT', 'Engine returned invalid JSON.', {
        stdout: result.stdout.slice(0, 500)
      });
    }

    if (!this.validators.validateSolveResponse(parsedOutput)) {
      throw new ApiHttpError(500, 'ENGINE_INVALID_OUTPUT', 'Engine output failed response schema validation.', {
        errors: this.validators.formatErrors(this.validators.validateSolveResponse.errors)
      });
    }

    return parsedOutput;
  }

  private runChild(payload: string): Promise<ChildResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.config.enginePath, ['--stdin'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let settled = false;

      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, this.config.engineTimeoutMs);

      const settle = (callback: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        callback();
      };

      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk: string) => {
        stderr += chunk;
      });

      child.on('error', (error) => {
        settle(() => reject(new ApiHttpError(500, 'ENGINE_EXECUTION_FAILED', error.message)));
      });

      child.on('close', (exitCode, signal) => {
        settle(() =>
          resolve({
            exitCode,
            signal,
            stdout,
            stderr,
            timedOut
          })
        );
      });

      child.stdin.end(payload);
    });
  }
}
