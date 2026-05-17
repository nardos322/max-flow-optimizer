# scripts

Scripts de desarrollo local y automatizaciones pequenas.

## Scripts actuales
- `smoke-api.mjs`: verifica `GET /health` y corridas `tiny-feasible`, `tiny-infeasible-availability` y `medium-random-50x50` contra una API local.
- `benchmark-api.mjs`: ejecuta warmups + corridas medidas para `medium-random-50x50` y `large-random-200x200`, y reporta p50/p95/maximo.
- `analytics-generate.mjs`: genera un manifest reproducible de escenarios sinteticos en `data/generated`.
- `analytics-run.mjs`: ejecuta escenarios generados contra el engine C++ y escribe JSONL en `data/analytics`.
- `analytics-aggregate.mjs`: ejecuta el pipeline Python modular en `analytics/python/` para calcular agregados por escenario, exportar Parquet, correr quality checks, guardar historico, ejecutar queries DuckDB y generar graficos con Matplotlib.
- `analytics-report.mjs`: genera un reporte markdown local desde los agregados, quality checks, comparacion historica y graficos.

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

`pnpm analytics:setup` crea `.venv` e instala `polars==1.14.0`, `matplotlib==3.9.2` y `duckdb==1.1.3`. `analytics:aggregate` usa automaticamente `.venv/bin/python` si existe.

`analytics:generate` escribe por defecto solo `data/generated/manifest.json`; `analytics:run` envia payloads compactos al engine con `scenarioName`, `seed`, `instanceId` y parametros del escenario. El engine reconstruye cada instancia sintetica internamente en modo `--analytics-jsonl`, sin conocer perfiles hardcodeados. Si hace falta inspeccionar los inputs generados como archivos JSON, usar `ANALYTICS_WRITE_INPUT_FILES=1`, pero no es recomendable para corridas grandes porque puede escribir decenas de GB y desactiva el camino compacto.

`analytics:run` usa por defecto `ANALYTICS_RUN_MODE=batch`, que envia grupos de instancias al engine en JSONL para evitar lanzar un proceso por instancia. El runner escribe cada resultado al JSONL de salida mientras procesa chunks, sin retener todas las corridas en memoria. `ANALYTICS_BATCH_SIZE` controla el tamano de esos grupos y por defecto vale `250`. Para comparar con el runner anterior:

```bash
ANALYTICS_RUN_MODE=legacy ANALYTICS_CONCURRENCY=8 pnpm analytics:run
```

El JSON final impreso por `analytics:run` incluye `totalWallTimeMs`, `totalWallTimeSeconds`, `startedAt` y `finishedAt` para medir la duracion total de la etapa.

Corrida pequena para desarrollo:

```bash
ANALYTICS_SCENARIOS=small-sparse ANALYTICS_RUNS_PER_SCENARIO=1 pnpm analytics:generate
pnpm analytics:run
pnpm analytics:aggregate
pnpm analytics:report
```

Corrida de 50k instancias con los 10 escenarios por defecto:

```bash
ANALYTICS_RUNS_PER_SCENARIO=5000 ANALYTICS_BATCH_SIZE=50 ANALYTICS_CONCURRENCY=4 pnpm analytics
```

Con `ANALYTICS_CONCURRENCY > 1`, las lineas de `latest-runs.jsonl` pueden quedar en orden de finalizacion de chunks. No depender del orden fisico del archivo; usar `scenarioName`, `instanceId` y `seed` para filtrar o agrupar.
