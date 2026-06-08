# Analytics Pipeline Contract

Contrato operativo para que la capa analytics tenga el mismo nivel de especificacion que la API HTTP y el motor C++: comandos estables, entradas/salidas claras, metricas comparables y criterios explicitos para optimizar sin reescribir a ciegas.

## 1. Objetivo

El pipeline analytics debe resolver muchas instancias sinteticas de forma reproducible y producir evidencia sobre:

- factibilidad por escenario,
- rendimiento del engine C++,
- costo de generacion, ejecucion, agregacion y reporte,
- impacto de parametros como cantidad de dias, medicos, periodos, densidad y limite `C`,
- cuellos reales antes de introducir cambios estructurales.

El objetivo no es convertir analytics en producto interactivo. Analytics sigue siendo un pipeline offline separado de `web -> api -> engine`.

## 2. Contrato De Etapas

El flujo canonico es:

```text
generate -> run -> aggregate -> report
```

Cada etapa debe poder ejecutarse de forma individual desde la raiz del monorepo.

| Etapa | Comando | Responsabilidad | Output canonico |
| --- | --- | --- | --- |
| `generate` | `pnpm analytics:generate` | Crear manifest reproducible de instancias sinteticas. | `data/generated/manifest.json`, `data/generated/manifest/part-*.jsonl` |
| `run` | `pnpm analytics:run` | Ejecutar instancias contra el solver target y persistir records por corrida. | `data/analytics/latest-run.json`, `data/analytics/latest-runs.jsonl` o `data/analytics/runs/` |
| `aggregate` | `pnpm analytics:aggregate` | Calcular agregados, quality checks, queries DuckDB y comparacion historica. | `data/analytics/latest-summary.json`, `data/analytics/latest-summary.csv`, `data/analytics/duckdb/` |
| `report` | `pnpm analytics:report` | Generar reporte legible desde outputs agregados. | `analytics/reports/latest-report.md` |

Comando compuesto:

```bash
pnpm analytics
```

Equivale a:

```text
analytics:generate && analytics:run && analytics:aggregate && analytics:report
```

Medicion completa por etapa:

```bash
pnpm analytics:timed
```

Debe ejecutar las mismas cuatro etapas y escribir `data/analytics/latest-timing.json`.

## 3. Solver Target

Target obligatorio para analytics v1:

```text
solverTarget = engine
```

La ejecucion por defecto debe llamar al engine C++ directamente, no a la API HTTP.

Motivos:

- reduce overhead de HTTP,
- no requiere levantar servicios,
- mide mejor el comportamiento del solver,
- mantiene el pipeline offline desacoplado del producto interactivo.

Target opcional:

```text
solverTarget = api
```

El target `api` solo debe usarse para validar el camino end-to-end `batch runner -> API -> engine` o comparar overhead. No debe bloquear la primera entrega ni ser el camino recomendado para corridas grandes.

## 4. Manifest De Entrada

El manifest debe representar trabajo compacto, no inputs completos materializados.

Archivo canonico:

```text
data/generated/manifest.json
```

Shards canonicos:

```text
data/generated/manifest/part-000001.jsonl
data/generated/manifest/part-000002.jsonl
```

Cada entrada compacta debe incluir, como minimo:

```json
{
  "scenarioName": "large-balanced",
  "seed": 3101,
  "instanceId": "large-balanced-0001",
  "daysCount": 200,
  "medicsCount": 200,
  "periodsCount": 20,
  "availabilityDensity": 0.3,
  "maxDaysPerMedic": 2
}
```

Reglas:

- la misma combinacion de escenario y seed debe generar la misma instancia,
- `instanceId` debe ser estable dentro de una corrida generada,
- los analisis no deben depender del orden fisico de las lineas,
- los shards son unidades validas de trabajo para ejecucion parcial o futura distribucion.

Para procesar un shard especifico:

```bash
ANALYTICS_MANIFEST_SHARD=data/generated/manifest/part-000001.jsonl pnpm analytics:run
```

## 5. Ejecucion Contra Engine

El modo recomendado de `analytics:run` es batch compacto:

```text
ANALYTICS_RUN_MODE=batch
```

En este modo, el runner envia JSONL compacto al engine y el engine reconstruye la instancia sintetica internamente.

Flags esperados del engine:

```bash
maxflow_engine --analytics-jsonl --summary-only
```

`--summary-only` es el modo recomendado para corridas grandes. Debe conservar las metricas necesarias para analytics y omitir payloads grandes como asignaciones completas cuando no sean necesarias.

Modo legacy:

```text
ANALYTICS_RUN_MODE=legacy
```

Solo debe usarse para comparar contra el runner anterior o depurar una diferencia de comportamiento. No es el camino esperado para 50k o 500k instancias.

## 6. Registro Por Corrida

Cada instancia resuelta debe producir un record independiente. El record puede escribirse en JSONL o Parquet, pero el contenido analitico debe mantenerse compatible.

Campos minimos:

```json
{
  "runId": "analytics-large-balanced-0001-3101",
  "scenarioName": "large-balanced",
  "instanceId": "large-balanced-0001",
  "seed": 3101,
  "solverTarget": "engine",
  "daysCount": 200,
  "medicsCount": 200,
  "periodsCount": 20,
  "availabilityDensity": 0.3,
  "maxDaysPerMedic": 2,
  "feasible": true,
  "requiredFlow": 200,
  "maxFlow": 200,
  "uncoveredDaysCount": 0,
  "availabilityPairs": 12000,
  "runtimeMs": 16,
  "engineTotalMs": 18,
  "normalizeMs": 8,
  "buildNetworkMs": 4,
  "maxFlowMs": 2,
  "wallTimeMs": 22,
  "status": "ok",
  "errorCode": null
}
```

Reglas:

- errores del engine deben persistirse como records analizables, no perderse silenciosamente,
- `status=ok` representa una ejecucion tecnica exitosa, incluso si `feasible=false`,
- la infactibilidad se modela con `feasible=false`, no como error del pipeline,
- `errorCode` debe ser estable para agregaciones,
- `wallTimeMs` mide el costo observado por el runner,
- `runtimeMs` mide el tiempo de solver reportado por el engine,
- `engineTotalMs`, `normalizeMs`, `buildNetworkMs` y `maxFlowMs` deben persistirse cuando el engine emita timings internos,
- `ANALYTICS_RUN_ID` agrupa outputs de una corrida completa; el `runId` del record puede mantenerse como identificador por instancia/request si esa es la convencion activa del runner.

## 7. Outputs Canonicos

Para datasets chicos o debug:

```text
data/analytics/latest-runs.jsonl
```

Para corridas grandes:

```text
data/analytics/runs/runId=<run-id>/
```

El formato recomendado para corridas grandes es:

```text
ANALYTICS_OUTPUT_FORMAT=parquet
```

Reglas:

- `latest-*` representa la corrida activa o mas reciente, no un historial confiable,
- `runId` es obligatorio para corridas que se quieran comparar, reanudar o reportar despues,
- los outputs pesados quedan fuera de git,
- los reportes generados son reproducibles y tambien pueden quedar fuera de git salvo que se decida versionar un resultado chico y estable.

## 8. Variables Estables

Variables principales del contrato:

| Variable | Default esperado | Uso |
| --- | --- | --- |
| `ANALYTICS_RUN_ID` | timestamp de corrida | Identificador para agrupar outputs y reintentos. |
| `ANALYTICS_RUNS_PER_SCENARIO` | `10` | Cantidad de instancias por escenario. |
| `ANALYTICS_SCENARIOS` | todos | Lista separada por coma de escenarios. |
| `ANALYTICS_MANIFEST_ORDER` | `scenario` | Orden de trabajo; `interleaved` balancea mejor escenarios. |
| `ANALYTICS_MANIFEST_SHARD_SIZE` | `1000` | Entradas por shard JSONL. |
| `ANALYTICS_MANIFEST_SHARD` | unset | Shard especifico a procesar. |
| `ANALYTICS_RUN_MODE` | `batch` | `batch` compacto o `legacy`. |
| `ANALYTICS_OUTPUT_FORMAT` | `jsonl` | `jsonl` para debug, `parquet` para corridas grandes. |
| `ANALYTICS_SUMMARY_ONLY` | `true` | Omite payloads grandes del engine en analytics. |
| `ANALYTICS_BATCH_SIZE` | `250` | Instancias por proceso del engine en modo batch. |
| `ANALYTICS_CONCURRENCY` | `auto` | Procesos paralelos del solver. |
| `ANALYTICS_ENGINE_TIMEOUT_MS` | `30000` | Timeout por corrida individual del solver. |
| `ANALYTICS_RUNS_FILE` | autodetectado | Input para agregacion y reporte. |

Variables de tuning:

| Variable | Default esperado | Uso |
| --- | --- | --- |
| `ANALYTICS_TUNE_RUNS_PER_SCENARIO` | `1000` | Muestra por escenario para tuning local. |
| `ANALYTICS_TUNE_BATCH_SIZES` | `50,100,150,250` | Batch sizes a comparar. |
| `ANALYTICS_TUNE_CONCURRENCIES` | `auto,4,6,8` | Concurrencias a comparar. |
| `ANALYTICS_TUNE_OUTPUT_FORMAT` | `jsonl` | Formato usado por el tuner. |
| `ANALYTICS_TUNE_SCENARIOS` | todos | Escenarios incluidos en tuning. |

## 9. Corridas Recomendadas

Smoke local chico:

```bash
pnpm analytics
```

Corrida de 50k instancias:

```bash
ANALYTICS_RUN_ID=run-50k-001 \
ANALYTICS_RUNS_PER_SCENARIO=5000 \
ANALYTICS_MANIFEST_ORDER=interleaved \
ANALYTICS_OUTPUT_FORMAT=parquet \
ANALYTICS_BATCH_SIZE=100 \
ANALYTICS_CONCURRENCY=auto \
pnpm analytics:timed
```

Corrida de 500k instancias:

```bash
ANALYTICS_RUN_ID=run-500k-001 \
ANALYTICS_RUNS_PER_SCENARIO=50000 \
ANALYTICS_MANIFEST_ORDER=interleaved \
ANALYTICS_OUTPUT_FORMAT=parquet \
ANALYTICS_BATCH_SIZE=100 \
ANALYTICS_CONCURRENCY=auto \
pnpm analytics:timed
```

Reagregar o reportar una corrida existente:

```bash
ANALYTICS_RUN_ID=run-500k-001 pnpm analytics:aggregate
ANALYTICS_RUN_ID=run-500k-001 pnpm analytics:report
```

Tuning local antes de una corrida grande:

```bash
pnpm analytics:tune
```

Prueba rapida del tuner:

```bash
ANALYTICS_TUNE_RUNS_PER_SCENARIO=100 \
ANALYTICS_TUNE_BATCH_SIZES=50,100 \
ANALYTICS_TUNE_CONCURRENCIES=auto,4,8 \
pnpm analytics:tune
```

## 10. Metricas Obligatorias

`analytics:run` debe reportar y persistir, como minimo:

```text
rowsPerSecond
totalWallTimeSeconds
engineRuntimeSecondsTotal
amortizedWallTimeSecondsTotal
estimatedRunnerOverheadSeconds
estimatedIdealSecondsAtConcurrency
```

`analytics:timed` debe escribir `data/analytics/latest-timing.json` con:

```text
totalSeconds
stages.generate.seconds
stages.run.seconds
stages.aggregate.seconds
stages.report.seconds
```

Para optimizar engine, los reportes de breakdown deben separar cuando sea posible:

```text
parse
syntheticGenerate
normalize
buildNetwork
maxFlow
finalize
```

Regla de decision:

- si `runSeconds` domina, mirar engine/runner/output writer,
- si `aggregateSeconds` domina, mirar lectura Parquet/JSONL y operaciones lazy,
- si `estimatedRunnerOverheadSeconds` domina, reducir overhead de Node, procesos, JSON o writer,
- si `normalize` o `buildNetwork` dominan, optimizar C++ antes de tocar Dinic.

## 11. Criterios De Optimizacion

Antes de optimizar:

1. correr `pnpm analytics:tune`,
2. registrar configuracion usada,
3. correr una muestra comparable con `pnpm analytics:timed`,
4. guardar `runId`, `rowsPerSecond`, `totalWallTimeSeconds` y breakdown disponible.

Una optimizacion cuenta como mejora si reduce al menos uno de:

```text
totalWallTimeSeconds
runSeconds
engineRuntimeSecondsTotal
estimatedRunnerOverheadSeconds
normalize
buildNetwork
```

sin degradar:

```text
errores tecnicos
correctitud de factibilidad
compatibilidad de records
reproducibilidad por seed
```

## 12. Criterio Para Runner C++ Nativo

No implementar un runner C++ dedicado solo porque el pipeline parece lento.

Implementarlo solo si las mediciones muestran que el costo dominante esta fuera del solver o que Node/procesos/JSON/writer limitan el throughput de forma material.

Umbral recomendado:

```text
runner C++ nativo solo si se espera una mejora >= 2x en analytics:run
```

Contrato minimo del runner nativo:

- leer manifest compacto o shards JSONL,
- generar instancias sinteticas de forma compatible,
- resolver con el mismo solver,
- emitir records compatibles con `analytics:aggregate`,
- conservar `runId`, `scenarioName`, `instanceId` y `seed`,
- no depender de API, DB ni frontend.

## 13. Fuera De Alcance

Fuera del contrato actual:

- dashboard web,
- endpoints `GET /v1/runs`,
- persistencia productiva en API,
- autenticacion,
- Kafka,
- Spark,
- Airflow,
- Kubernetes,
- distribucion multi-maquina obligatoria.

Estos temas pertenecen a evoluciones posteriores y deben justificarse con volumen, necesidad operacional o valor de producto.

## 14. Relacion Con Otros Documentos

- `AnalyticsSpec.md`: alcance funcional y motivacion de analytics.
- `AnalyticsImplementationRoute.md`: ruta historica de implementacion inicial.
- `PipelineOptimizationPlan.md`: backlog incremental de optimizacion.
- `BigDataPipelinePlan.md`: escalamiento hacia millones de instancias.
- `EngineBreakdownFindings.md`: hallazgos actuales sobre cuellos internos del engine.
