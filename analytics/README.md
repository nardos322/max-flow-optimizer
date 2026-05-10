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
| `ANALYTICS_ENGINE_PATH` | ruta estandar del repo | Override del binario C++. |
| `ANALYTICS_CONCURRENCY` | `1` | Procesos del solver ejecutados en paralelo por `analytics:run`. |
| `ANALYTICS_ENGINE_TIMEOUT_MS` | `30000` | Timeout por corrida individual del solver. |
| `ANALYTICS_RUNS_FILE` | `data/analytics/latest-runs.jsonl` | Input para agregacion/reporte. |
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

Corrida de 50k instancias:

```bash
ANALYTICS_RUNS_PER_SCENARIO=5000 ANALYTICS_CONCURRENCY=8 pnpm analytics
```

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
