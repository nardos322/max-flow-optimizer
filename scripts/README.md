# scripts

Scripts de desarrollo local y automatizaciones pequenas.

## Scripts actuales
- `smoke-api.mjs`: verifica `GET /health` y corridas `tiny-feasible`, `tiny-infeasible-availability` y `medium-random-50x50` contra una API local.
- `benchmark-api.mjs`: ejecuta warmups + corridas medidas para `medium-random-50x50` y `large-random-200x200`, y reporta p50/p95/maximo.

## Uso
Con API local en `http://127.0.0.1:3000`:

```bash
pnpm smoke:api
pnpm benchmark:api
```

Para otra URL:

```bash
API_BASE_URL=http://127.0.0.1:3100 pnpm smoke:api
API_BASE_URL=http://127.0.0.1:3100 pnpm benchmark:api
```
