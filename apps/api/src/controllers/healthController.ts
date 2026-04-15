import type { RequestHandler } from 'express';

import type { HealthResponseV1 } from '@maxflow/contracts';

export function createHealthController(): RequestHandler {
  return (_request, response) => {
    const payload: HealthResponseV1 = { status: 'ok' };
    response.status(200).json(payload);
  };
}
