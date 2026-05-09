# Analytics

Pipeline offline para generar escenarios sinteticos, ejecutar el motor C++ en batch y analizar factibilidad/rendimiento.

## Flujo

```bash
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

Antes de correr `analytics:run`, compilar el engine:

```bash
pnpm run build:engine
```

## Politica De Datos

- No commitear datasets generados ni outputs batch completos.
- Si hace falta un ejemplo pequeno y estable, agregarlo explicitamente como fixture.
- Los reportes generados se consideran reproducibles y quedan fuera de git por defecto.
