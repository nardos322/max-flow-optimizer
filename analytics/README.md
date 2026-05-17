# Analytics

Pipeline offline para generar escenarios sinteticos, ejecutar el motor C++ en batch y analizar factibilidad/rendimiento.

## Flujo

```bash
pnpm analytics:setup
pnpm run build:engine
pnpm analytics:generate
pnpm analytics:run
pnpm analytics:aggregate
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

analytics:run
  -> Node lee el manifest y envia payloads compactos JSONL al engine
  -> C++ reconstruye cada instancia sintetica en --analytics-jsonl
  -> C++ resuelve max-flow
  -> Node escribe data/analytics/latest-runs.jsonl en streaming

analytics:aggregate
  -> Python/Polars calcula agregados, quality checks e historico
  -> escribe Parquet
  -> DuckDB ejecuta queries sobre data/analytics/latest-runs.parquet
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
data/analytics/latest-runs.jsonl
data/analytics/latest-runs.parquet
data/analytics/latest-summary.json
data/analytics/latest-summary.csv
data/analytics/latest-quality.json
data/analytics/latest-comparison.json
data/analytics/duckdb/
data/analytics/history/
analytics/reports/latest-report.md
analytics/reports/charts/
```

Esos outputs estan ignorados por git. Se versionan los scripts, queries y documentacion; los datasets se regeneran con comandos.

## Variables Utiles

| Variable | Default | Uso |
| --- | --- | --- |
| `ANALYTICS_RUNS_PER_SCENARIO` | `10` | Instancias generadas por escenario. |
| `ANALYTICS_SCENARIOS` | todos | Lista separada por coma de escenarios a generar. |
| `ANALYTICS_WRITE_INPUT_FILES` | `false` | Escribir un JSON por instancia en `data/generated`. Usar solo para depuracion o muestras chicas. |
| `ANALYTICS_ENGINE_PATH` | ruta estandar del repo | Override del binario C++. |
| `ANALYTICS_RUN_MODE` | `batch` | Modo de ejecucion de `analytics:run`. Usar `legacy` para lanzar un proceso del engine por instancia. |
| `ANALYTICS_CONCURRENCY` | `1` | Procesos del solver ejecutados en paralelo por `analytics:run`. |
| `ANALYTICS_BATCH_SIZE` | `250` | Instancias por proceso del engine cuando `ANALYTICS_RUN_MODE=batch`. |
| `ANALYTICS_ENGINE_TIMEOUT_MS` | `30000` | Timeout por corrida individual del solver. |
| `ANALYTICS_RUNS_FILE` | `data/analytics/latest-runs.jsonl` | Input para `analytics:aggregate`; `analytics:report` lo muestra como referencia del reporte. |
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
ANALYTICS_RUNS_PER_SCENARIO=5000 ANALYTICS_BATCH_SIZE=50 ANALYTICS_CONCURRENCY=4 pnpm analytics
```

`ANALYTICS_BATCH_SIZE=50` y `ANALYTICS_CONCURRENCY=4` son valores conservadores para corridas grandes. En maquinas con mas margen se puede subir gradualmente, por ejemplo `ANALYTICS_BATCH_SIZE=75` y `ANALYTICS_CONCURRENCY=6`, midiendo el `totalWallTimeSeconds` que imprime `analytics:run`.

`analytics:generate` escribe por defecto un manifest liviano en `data/generated/manifest.json`; no materializa un JSON por instancia. `analytics:run` envia payloads compactos al engine con `scenarioName`, `seed`, `instanceId` y parametros del escenario, y el engine reconstruye cada instancia sintetica internamente en modo `--analytics-jsonl`. El engine no conoce perfiles hardcodeados; solo genera desde los parametros recibidos.

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
data/analytics/latest-runs.parquet
```

Sus resultados se escriben como JSON y CSV en:

```text
data/analytics/duckdb/
```

## Politica De Datos

- No commitear datasets generados ni outputs batch completos.
- Si hace falta un ejemplo pequeno y estable, agregarlo explicitamente como fixture.
- Los reportes generados se consideran reproducibles y quedan fuera de git por defecto.
