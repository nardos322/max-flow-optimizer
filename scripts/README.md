# scripts

Scripts de desarrollo local y automatizaciones pequenas.

## Scripts actuales
- `smoke-api.mjs`: verifica `GET /health` y corridas `tiny-feasible`, `tiny-infeasible-availability` y `medium-random-50x50` contra una API local.
- `benchmark-api.mjs`: ejecuta warmups + corridas medidas para `medium-random-50x50` y `large-random-200x200`, y reporta p50/p95/maximo.
- `analytics-generate.mjs`: genera un manifest reproducible de escenarios sinteticos en `data/generated`.
- `analytics-run.mjs`: ejecuta escenarios generados contra el engine C++ y escribe JSONL en `data/analytics`.
- `analytics-aggregate.mjs`: ejecuta el pipeline Python modular en `analytics/python/` para calcular agregados por escenario, exportar Parquet, correr quality checks, guardar historico, ejecutar queries DuckDB y generar graficos con Matplotlib.
- `analytics-report.mjs`: genera un reporte markdown local desde los agregados, quality checks, comparacion historica y graficos.
- `analytics-compare.mjs`: compara performance por fixture/dataset contra el engine y genera `performance-comparison` en `analytics/reports`.
- `analytics-verify.mjs`: valida metadata, outputs, quality checks, summary y fingerprint de manifest de la ultima corrida o de `ANALYTICS_RUN_ID`.
- `analytics-profile.mjs`: ejecuta `pnpm analytics` con presets `small`, `50k`, `500k` o `benchmark`.
- `analytics-tune.mjs`: prueba combinaciones de `ANALYTICS_BATCH_SIZE` y `ANALYTICS_CONCURRENCY` sobre una muestra temporal para recomendar valores por maquina.
- `analytics-timed.mjs`: ejecuta `generate`, `run`, `aggregate` y `report`, midiendo segundos por etapa.

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

Comparativa rapida por dataset sin levantar API:

```bash
pnpm run build:engine
pnpm analytics:compare
```

Por defecto incluye fixtures canonicos validos y hasta 10 escenarios de `data/generated/manifest.json` si existe. Para omitir generados:

```bash
ANALYTICS_COMPARE_GENERATED_LIMIT=0 pnpm analytics:compare
```

`pnpm analytics:setup` crea `.venv` e instala `polars==1.14.0`, `matplotlib==3.9.2` y `duckdb==1.1.3`. `analytics:aggregate` usa automaticamente `.venv/bin/python` si existe.

`analytics:generate` escribe por defecto `data/generated/manifest.json` y shards JSONL en `data/generated/manifest/part-*.jsonl`; `analytics:run` envia payloads compactos al engine con `scenarioName`, `seed`, `instanceId` y parametros del escenario. El engine reconstruye cada instancia sintetica internamente en modo `--analytics-jsonl`, sin conocer perfiles hardcodeados. Si hace falta inspeccionar los inputs generados como archivos JSON, usar `ANALYTICS_WRITE_INPUT_FILES=1`, pero no es recomendable para corridas grandes porque puede escribir decenas de GB y desactiva el camino compacto.

Para ejecutar solo un shard:

```bash
ANALYTICS_MANIFEST_SHARD=data/generated/manifest/part-000001.jsonl pnpm analytics:run
```

`analytics:run` usa por defecto `ANALYTICS_RUN_MODE=batch`, que envia grupos de instancias al engine en JSONL para evitar lanzar un proceso por instancia. El runner escribe cada resultado al JSONL de salida mientras procesa chunks, sin retener todas las corridas en memoria. `ANALYTICS_BATCH_SIZE` controla el tamano de esos grupos y por defecto vale `250`. Para comparar con el runner anterior:

```bash
ANALYTICS_RUN_MODE=legacy ANALYTICS_CONCURRENCY=8 pnpm analytics:run
```

En modo batch, `ANALYTICS_CHUNK_STRATEGY=cost-balanced` es el default y reparte escenarios pesados entre chunks usando tamano de escenario, densidad y pares de disponibilidad. Para comparar contra el orden fisico del manifest:

```bash
ANALYTICS_CHUNK_STRATEGY=sequential pnpm analytics:run
```

El JSON final impreso por `analytics:run` incluye `totalWallTimeMs`, `totalWallTimeSeconds`, `startedAt` y `finishedAt` para medir la duracion total de la etapa.
Tambien incluye diagnosticos de throughput y overhead:

```text
rowsPerSecond
engineRuntimeSecondsTotal
amortizedWallTimeSecondsTotal
estimatedRunnerOverheadSeconds
estimatedIdealSecondsAtConcurrency
```

`engineRuntimeSecondsTotal` suma `stats.runtimeMs` reportado por el engine. `amortizedWallTimeSecondsTotal` suma el wall time del batch repartido entre sus instancias. La diferencia es una estimacion del overhead del runner/proceso/serializacion/escritura.

Corrida pequena para desarrollo:

```bash
pnpm analytics:small
```

Corrida de 50k instancias con los 10 escenarios por defecto:

```bash
ANALYTICS_RUNS_PER_SCENARIO=5000 \
ANALYTICS_MANIFEST_ORDER=interleaved \
ANALYTICS_OUTPUT_FORMAT=parquet \
ANALYTICS_BATCH_SIZE=100 \
ANALYTICS_CONCURRENCY=auto \
ANALYTICS_UPDATE_LATEST_OUTPUT=false \
pnpm analytics
```

Preset equivalente:

```bash
pnpm analytics:50k
```

Corrida de 500k instancias con salida Parquet:

```bash
ANALYTICS_RUN_ID=run-500k-001 \
ANALYTICS_RUNS_PER_SCENARIO=50000 \
ANALYTICS_MANIFEST_ORDER=interleaved \
ANALYTICS_OUTPUT_FORMAT=parquet \
ANALYTICS_BATCH_SIZE=500 \
ANALYTICS_CONCURRENCY=8 \
ANALYTICS_UPDATE_LATEST_OUTPUT=false \
pnpm analytics
```

Preset equivalente:

```bash
pnpm analytics:500k
```

La medicion local recomendada para `500k` es `ANALYTICS_BATCH_SIZE=500` con `ANALYTICS_CONCURRENCY=8`: `run-500k-batch500-concurrency8-final` completo `500000` instancias en `120.11s`, `4162.85 rows/s`, `0` errores. La comparacion directa con `BATCH_SIZE=250`, `CONCURRENCY=8` fue `152.14s`, `3286.45 rows/s`, `0` errores.

`ANALYTICS_RUN_ID` aisla la corrida bajo `data/analytics/runs/runId=<id>/`. `analytics:aggregate` y `analytics:report` usan esa corrida si se pasa el mismo id, o la ultima corrida registrada en `data/analytics/latest-run.json` si no se pasa ninguno. `ANALYTICS_UPDATE_LATEST_OUTPUT=false` evita crear el archivo pesado de compatibilidad `latest-runs.parquet`; el output por `runId` sigue quedando disponible para aggregate/report.

`analytics:aggregate` escribe `data/analytics/runs/runId=<id>/summary.json` cuando puede asociar el agregado con una corrida. Para benchmarks estables, usar:

```bash
ANALYTICS_BASELINE_RUN_ID=run-500k-known-good \
ANALYTICS_MAX_P95_RUNTIME_REGRESSION_PCT=10 \
ANALYTICS_MIN_P95_RUNTIME_REGRESSION_MS=1 \
pnpm analytics:aggregate
pnpm analytics:verify
```

Para reintentar una corrida interrumpida con el mismo `runId`:

```bash
ANALYTICS_RUN_ID=run-500k-001 \
ANALYTICS_RESUME=true \
ANALYTICS_OUTPUT_FORMAT=parquet \
pnpm analytics:run
```

`ANALYTICS_RESUME=true` salta records ya escritos para ese `runId`, tanto en Parquet particionado como en JSONL. Antes de saltar records, compara el manifest actual contra `data/analytics/runs/runId=<id>/run.json`; si no hay metadata o el fingerprint no coincide, falla salvo que se use `ANALYTICS_FORCE_RESUME=true`.

Para medir tiempos por etapa en la misma corrida:

```bash
ANALYTICS_RUN_ID=run-500k-001 \
ANALYTICS_RUNS_PER_SCENARIO=50000 \
ANALYTICS_MANIFEST_ORDER=interleaved \
ANALYTICS_OUTPUT_FORMAT=parquet \
ANALYTICS_BATCH_SIZE=500 \
ANALYTICS_CONCURRENCY=8 \
ANALYTICS_UPDATE_LATEST_OUTPUT=false \
pnpm analytics:timed
```

El resumen se guarda en `data/analytics/latest-timing.json`.

Para medir una configuracion recomendada en la maquina local:

```bash
pnpm analytics:tune
```

El tuner no pisa `data/generated/manifest.json`; crea un shard temporal en `/tmp` y ejecuta `analytics:run` contra ese shard. Si se quiere una prueba mas rapida:

```bash
ANALYTICS_TUNE_RUNS_PER_SCENARIO=100 \
ANALYTICS_TUNE_BATCH_SIZES=50,100 \
ANALYTICS_TUNE_CONCURRENCIES=auto,4,8 \
pnpm analytics:tune
```

Con `ANALYTICS_CONCURRENCY > 1`, las lineas de `latest-runs.jsonl` pueden quedar en orden de finalizacion de chunks. No depender del orden fisico del archivo; usar `scenarioName`, `instanceId` y `seed` para filtrar o agrupar.
