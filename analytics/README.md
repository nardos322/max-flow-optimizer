# Analytics

Pipeline offline para generar escenarios sinteticos, ejecutar el motor C++ en batch y analizar factibilidad/rendimiento.

## Flujo

```bash
pnpm analytics:setup
pnpm run build:engine
pnpm analytics:generate
pnpm analytics:run
pnpm analytics:aggregate
pnpm analytics:verify
pnpm analytics:report
```

Comando completo:

```bash
pnpm analytics
```

## Arquitectura

```text
analytics:generate
  -> Node escribe un manifest reproducible en data/generated/manifest.json
  -> Node escribe shards JSONL en data/generated/manifest/

analytics:run
  -> Node lee el manifest o un shard y envia payloads compactos JSONL al engine
  -> C++ reconstruye cada instancia sintetica en --analytics-jsonl --summary-only
  -> C++ resuelve max-flow
  -> Node escribe JSONL en streaming o envia records a un writer Parquet persistente
  -> en modo parquet, Python escribe particiones sin crear un JSONL temporal gigante

analytics:aggregate
  -> Python/Polars lee JSONL o Parquet particionado con LazyFrame
  -> calcula agregados, quality checks e historico
  -> escribe Parquet de compatibilidad
  -> DuckDB ejecuta queries sobre una vista analytics_runs
  -> Matplotlib genera charts

analytics:report
  -> Node genera analytics/reports/latest-report.md
```

## Outputs Locales

Los resultados se escriben en:

```text
data/generated/
data/analytics/
analytics/reports/
```

Artefactos principales:

```text
data/generated/manifest.json
data/generated/manifest/part-*.jsonl
data/analytics/latest-runs.jsonl
data/analytics/latest-runs.parquet
data/analytics/runs/
data/analytics/latest-summary.json
data/analytics/latest-summary.csv
data/analytics/latest-quality.json
data/analytics/latest-comparison.json
data/analytics/duckdb/
data/analytics/history/
data/analytics/runs/runId=<id>/run.json
analytics/reports/latest-report.md
analytics/reports/charts/
```

Esos outputs estan ignorados por git. Se versionan los scripts, queries y documentacion; los datasets se regeneran con comandos.

## Variables Utiles

| Variable | Default | Uso |
| --- | --- | --- |
| `ANALYTICS_RUNS_PER_SCENARIO` | `10` | Instancias generadas por escenario. |
| `ANALYTICS_SCENARIOS` | todos | Lista separada por coma de escenarios a generar. |
| `ANALYTICS_MANIFEST_ORDER` | `scenario` | Orden del manifest. Usar `interleaved` para mezclar escenarios por indice y balancear mejor los workers. |
| `ANALYTICS_MANIFEST_SHARD_SIZE` | `1000` | Cantidad de entradas por shard JSONL generado en `data/generated/manifest`. |
| `ANALYTICS_MANIFEST_SHARD` | unset | Shard JSONL especifico que `analytics:run` debe procesar, por ejemplo `data/generated/manifest/part-000001.jsonl`. |
| `ANALYTICS_RUN_ID` | timestamp de la corrida | Identificador de corrida. Escribe bajo `data/analytics/runs/runId=<id>/`. |
| `ANALYTICS_RESUME` | `false` | Si es `true`, omite records ya escritos para el mismo `ANALYTICS_RUN_ID`; sirve para reintentar una corrida interrumpida sin duplicar records. |
| `ANALYTICS_FORCE_RESUME` | `false` | Permite reanudar aunque existan records previos sin metadata o con fingerprint de manifest distinto. Usar solo para overrides intencionales. |
| `ANALYTICS_UPDATE_LATEST` | `true` | Actualiza `latest-run.json`, `latest-runs.jsonl` o `latest-runs.parquet`. El tuner lo desactiva para no contaminar la ultima corrida. |
| `ANALYTICS_UPDATE_LATEST_OUTPUT` | igual a `ANALYTICS_UPDATE_LATEST` | Controla solo el artefacto pesado `latest-runs.jsonl` o `latest-runs.parquet`. Usar `false` en corridas grandes si se trabajara por `runId`. |
| `ANALYTICS_WRITE_INPUT_FILES` | `false` | Escribir un JSON por instancia en `data/generated`. Usar solo para depuracion o muestras chicas. |
| `ANALYTICS_ENGINE_PATH` | ruta estandar del repo | Override del binario C++. |
| `ANALYTICS_RUN_MODE` | `batch` | Modo de ejecucion de `analytics:run`. Usar `legacy` para lanzar un proceso del engine por instancia. |
| `ANALYTICS_OUTPUT_FORMAT` | `jsonl` | Formato principal de salida de `analytics:run`. Usar `parquet` para escribir `data/analytics/runs/scenarioName=*/runDate=*/*.parquet`. |
| `ANALYTICS_SUMMARY_ONLY` | `true` | En modo compacto, pedir al engine `--summary-only` para omitir assignments y diagnosticos extensos que analytics no persiste. |
| `ANALYTICS_PARQUET_FLUSH_ROWS` | `10000` | Filas por escenario que el writer Parquet acumula antes de escribir una parte. Solo aplica con `ANALYTICS_OUTPUT_FORMAT=parquet`. |
| `ANALYTICS_CONCURRENCY` | `auto` | Procesos del solver ejecutados en paralelo por `analytics:run`. `auto` usa hasta `8` workers, dejando un core libre. |
| `ANALYTICS_BATCH_SIZE` | `250` | Instancias por proceso del engine cuando `ANALYTICS_RUN_MODE=batch`. |
| `ANALYTICS_CHUNK_STRATEGY` | `cost-balanced` | Estrategia para armar chunks en modo batch. `cost-balanced` distribuye escenarios pesados; `sequential` conserva el orden del manifest. |
| `ANALYTICS_ENGINE_TIMEOUT_MS` | `30000` | Timeout por corrida individual del solver. |
| `ANALYTICS_RUNS_FILE` | autodetecta `data/analytics/runs` o `data/analytics/latest-runs.jsonl` | Input para `analytics:aggregate`; puede ser JSONL, Parquet o directorio Parquet particionado. `analytics:report` lo muestra como referencia del reporte. |
| `ANALYTICS_EXPECTED_MANIFEST` | manifest de `latest-run.json` cuando coincide | Manifest o shard usado por `analytics:aggregate` para validar completitud y conteos por escenario. |
| `ANALYTICS_ALLOW_PARTIAL` | `false` | Permite que quality pase cuando la corrida tiene menos filas que el manifest esperado. Usar solo para agregaciones parciales intencionales. |
| `ANALYTICS_MAX_ERROR_RATE` | `0` | Tasa maxima de records con `status=error` permitida por quality, entre `0` y `1`. |
| `ANALYTICS_VERIFY_REQUIRE_REPORT` | `false` | Hace que `analytics:verify` falle si `analytics/reports/latest-report.md` no existe. |
| `PYTHON` | `.venv/bin/python` si existe; si no, `python3` | Ejecutable Python usado por `analytics:aggregate`. |

Antes de correr `analytics:run`, compilar el engine:

```bash
pnpm run build:engine
```

Antes de correr `analytics:aggregate`, preparar el entorno Python:

```bash
pnpm analytics:setup
```

Ese comando crea `.venv` e instala `polars==1.14.0`, `matplotlib==3.9.2` y `duckdb==1.1.3`, que son las dependencias usadas por `analytics/python/analyze_runs.py`. Si tu Python no trae `venv` o `pip`, instala `python3-venv` y `python3-pip` con el gestor de paquetes de tu sistema.

La agregacion, export Parquet, quality checks y comparacion historica se implementan con Polars/Python. Los graficos se generan con Matplotlib y las consultas SQL se ejecutan con DuckDB Python. El CLI principal esta en:

```text
analytics/python/analyze_runs.py
```

La implementacion esta separada por responsabilidad:

```text
analytics/python/analytics_io.py
analytics/python/summarizer.py
analytics/python/quality.py
analytics/python/comparison.py
analytics/python/charts.py
analytics/python/duckdb_queries.py
```

Escenarios incluidos por defecto:

```text
small-sparse
small-balanced
small-dense
medium-sparse
medium-balanced
medium-dense
large-sparse
large-balanced
large-dense
xlarge-balanced
```

Corrida recomendada de 50k instancias:

```bash
ANALYTICS_RUNS_PER_SCENARIO=5000 ANALYTICS_MANIFEST_ORDER=interleaved ANALYTICS_BATCH_SIZE=100 ANALYTICS_CONCURRENCY=auto pnpm analytics
```

`ANALYTICS_BATCH_SIZE=500` y `ANALYTICS_CONCURRENCY=8` son la configuracion recomendada medida para corridas de `500k` en esta maquina. La corrida final `run-500k-batch500-concurrency8-final` proceso `500000` instancias en `120.11s`, `4162.85 rows/s`, con `0` errores. Como referencia, `BATCH_SIZE=250`, `CONCURRENCY=8` proceso la misma escala en `152.14s`, `3286.45 rows/s`, con `0` errores. En otra maquina, volver a medir con `pnpm analytics:tune`.

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

Para reagregar o reportar una corrida especifica:

```bash
ANALYTICS_RUN_ID=run-500k-001 pnpm analytics:aggregate
ANALYTICS_RUN_ID=run-500k-001 pnpm analytics:report
```

Si `ANALYTICS_RUN_ID` no esta definido, `analytics:aggregate` y `analytics:report` usan `data/analytics/latest-run.json` cuando existe. Esto evita sumar accidentalmente corridas acumuladas en `data/analytics/runs/`.

Para reintentar una corrida interrumpida con el mismo `runId`:

```bash
ANALYTICS_RUN_ID=run-500k-001 \
ANALYTICS_RESUME=true \
ANALYTICS_OUTPUT_FORMAT=parquet \
pnpm analytics:run
```

`ANALYTICS_RESUME=true` lee los records existentes bajo `data/analytics/runs/runId=<id>/` y solo ejecuta las instancias faltantes.

Para medir tiempos por etapa:

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

`analytics:timed` ejecuta las mismas cuatro etapas que `pnpm analytics` y escribe `data/analytics/latest-timing.json` con `generate`, `run`, `aggregate`, `report` y `total`.

`analytics:run` escribe diagnosticos de rendimiento en `data/analytics/latest-run.json`:

```text
rowsPerSecond
engineRuntimeSecondsTotal
amortizedWallTimeSecondsTotal
estimatedRunnerOverheadSeconds
estimatedIdealSecondsAtConcurrency
```

Estos campos separan el tiempo reportado por el engine del wall time amortizado del runner. Son aproximados, pero sirven para decidir si el siguiente cuello esta en solver, runner/JSON/procesos o escritura.

`latest-run.json` tambien guarda `manifestFingerprint` con el hash SHA-256 del manifest, el total de entradas y los conteos por escenario. `analytics:aggregate` usa esa metadata, cuando coincide con el `ANALYTICS_RUN_ID` solicitado, para activar checks de completitud en `latest-quality.json`.

Cada corrida tambien escribe `data/analytics/runs/runId=<id>/run.json`. Ese archivo permite que `ANALYTICS_RESUME=true` compare el manifest actual contra la corrida existente antes de omitir records. Si existen records previos pero no existe metadata de la corrida, o el fingerprint no coincide, resume falla salvo que se use `ANALYTICS_FORCE_RESUME=true`.

Los checks de calidad incluyen:

- columnas requeridas y valores validos,
- unicidad por `scenarioName`, `instanceId` y `seed`,
- tasa de errores contra `ANALYTICS_MAX_ERROR_RATE`,
- cantidad total de records contra el manifest esperado,
- conteos por escenario contra el manifest esperado,
- consistencia entre `manifestFingerprint` y el manifest usado.

Para verificar que los artefactos principales son coherentes despues de `analytics:aggregate`:

```bash
pnpm analytics:verify
```

`analytics:verify` valida metadata de corrida, estado de quality, existencia del output principal, conteos del summary y fingerprint del manifest. Por defecto el reporte markdown es opcional para permitir correr verify antes de `analytics:report`; usar `ANALYTICS_VERIFY_REQUIRE_REPORT=true` para exigirlo.

Antes de una corrida grande, se puede medir la mejor combinacion local de batch y concurrencia:

```bash
pnpm analytics:tune
```

Para una prueba rapida del tuner:

```bash
ANALYTICS_TUNE_RUNS_PER_SCENARIO=100 \
ANALYTICS_TUNE_BATCH_SIZES=50,100 \
ANALYTICS_TUNE_CONCURRENCIES=auto,4,8 \
pnpm analytics:tune
```

Variables del tuner:

| Variable | Default | Uso |
| --- | --- | --- |
| `ANALYTICS_TUNE_RUNS_PER_SCENARIO` | `1000` | Instancias por escenario para la muestra temporal. |
| `ANALYTICS_TUNE_BATCH_SIZES` | `50,100,150,250,500` | Lista de batch sizes a probar. |
| `ANALYTICS_TUNE_CONCURRENCIES` | `auto,4,6,8` | Lista de concurrencias a probar. |
| `ANALYTICS_TUNE_OUTPUT_FORMAT` | `jsonl` | Formato usado por las pruebas del tuner. |
| `ANALYTICS_TUNE_SCENARIOS` | todos | Escenarios a incluir en la muestra temporal. |

`analytics:generate` escribe por defecto un manifest liviano en `data/generated/manifest.json` y shards JSONL en `data/generated/manifest/`; no materializa un JSON por instancia. `analytics:run` envia payloads compactos al engine con `scenarioName`, `seed`, `instanceId` y parametros del escenario, y el engine reconstruye cada instancia sintetica internamente en modo `--analytics-jsonl`. El engine no conoce perfiles hardcodeados; solo genera desde los parametros recibidos.

Para procesar solo una unidad de trabajo shardeada:

```bash
ANALYTICS_MANIFEST_SHARD=data/generated/manifest/part-000001.jsonl pnpm analytics:run
```

En el modo compacto, `analytics:run` agrega `--summary-only` por defecto. Esa salida mantiene las metricas necesarias para analytics (`feasible`, flujos, `stats`, `uncoveredDaysCount` y `analytics.availabilityPairs`) y evita serializar `assignments` o diagnosticos completos. Para comparar contra la salida completa:

```bash
ANALYTICS_SUMMARY_ONLY=false pnpm analytics:run
```

El resumen final de `analytics:run` debe incluir:

```json
{
  "runMode": "batch",
  "compactAnalytics": true,
  "totalWallTimeSeconds": 0
}
```

Si hace falta inspeccionar inputs individuales, `ANALYTICS_WRITE_INPUT_FILES=1` conserva el modo anterior, pero no es recomendable para corridas grandes porque puede escribir decenas de GB y desactiva el camino compacto.

`analytics:run` usa por defecto `ANALYTICS_RUN_MODE=batch`: procesa grupos de payloads JSONL por proceso del engine y escribe cada resultado al JSONL de salida mientras terminan los chunks. Esto evita retener todas las corridas en memoria. Para comparar contra el runner anterior, que lanza un proceso por instancia:

```bash
ANALYTICS_RUN_MODE=legacy ANALYTICS_CONCURRENCY=8 pnpm analytics:run
```

Con `ANALYTICS_CONCURRENCY > 1`, el orden fisico de las lineas puede seguir el orden de finalizacion de chunks. Los analisis no deben depender de ese orden; cada record incluye `scenarioName`, `instanceId` y `seed`.

Las consultas SQL en `analytics/queries/` se ejecutan durante `analytics:aggregate` con DuckDB y leen:

```text
analytics_runs
```

Sus resultados se escriben como JSON y CSV en:

```text
data/analytics/duckdb/
```

## Politica De Datos

- No commitear datasets generados ni outputs batch completos.
- Si hace falta un ejemplo pequeno y estable, agregarlo explicitamente como fixture.
- Los reportes generados se consideran reproducibles y quedan fuera de git por defecto.
