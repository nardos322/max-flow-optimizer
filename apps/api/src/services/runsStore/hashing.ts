import crypto from 'node:crypto';

import type { SolveRequestV1 } from '@maxflow/contracts';

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

export function createInputHash(input: SolveRequestV1): string {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(input)).digest('hex')}`;
}

