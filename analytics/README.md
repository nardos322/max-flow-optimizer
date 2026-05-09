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

Esos outputs estan ignorados por git. Se versionan los scripts, queries y documentacion; los datasets se regeneran con comandos.

## Variables Utiles

| Variable | Default | Uso |
| --- | --- | --- |
| `ANALYTICS_RUNS_PER_SCENARIO` | `10` | Instancias generadas por escenario. |
| `ANALYTICS_SCENARIOS` | todos | Lista separada por coma de escenarios a generar. |
| `ANALYTICS_ENGINE_PATH` | ruta estandar del repo | Override del binario C++. |
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

Ese comando crea `.venv` e instala `polars==1.14.0`, que es la dependencia usada por `analytics/python/analyze_runs.py`. Si tu Python no trae `venv` o `pip`, instala `python3-venv` y `python3-pip` con el gestor de paquetes de tu sistema.

La agregacion se implementa con Polars en:

```text
analytics/python/analyze_runs.py
```

## Politica De Datos

- No commitear datasets generados ni outputs batch completos.
- Si hace falta un ejemplo pequeno y estable, agregarlo explicitamente como fixture.
- Los reportes generados se consideran reproducibles y quedan fuera de git por defecto.
