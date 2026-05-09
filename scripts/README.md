# scripts

Scripts de desarrollo local y automatizaciones pequenas.

## Scripts actuales
- `smoke-api.mjs`: verifica `GET /health` y corridas `tiny-feasible`, `tiny-infeasible-availability` y `medium-random-50x50` contra una API local.
- `benchmark-api.mjs`: ejecuta warmups + corridas medidas para `medium-random-50x50` y `large-random-200x200`, y reporta p50/p95/maximo.
- `analytics-generate.mjs`: genera escenarios sinteticos reproducibles en `data/generated`.
- `analytics-run.mjs`: ejecuta escenarios generados contra el engine C++ y escribe JSONL en `data/analytics`.
- `analytics-aggregate.mjs`: ejecuta `analytics/python/analyze_runs.py` para calcular agregados por escenario con Polars.
- `analytics-report.mjs`: genera un reporte markdown local desde los agregados.

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

## Analytics offline
Compilar engine y correr pipeline completo:

```bash
pnpm analytics:setup
pnpm run build:engine
pnpm analytics
```

`pnpm analytics:setup` crea `.venv` e instala `polars==1.14.0`. `analytics:aggregate` usa automaticamente `.venv/bin/python` si existe.

Corrida pequena para desarrollo:

```bash
ANALYTICS_SCENARIOS=small-sparse ANALYTICS_RUNS_PER_SCENARIO=1 pnpm analytics:generate
pnpm analytics:run
pnpm analytics:aggregate
pnpm analytics:report
```
