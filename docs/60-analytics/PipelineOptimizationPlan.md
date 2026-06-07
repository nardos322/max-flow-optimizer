# Pipeline Optimization Plan

Plan para reducir el tiempo de corridas analytics masivas sin perder reproducibilidad, trazabilidad ni reportes.

## Objetivo

Bajar el tiempo de corridas de `500k` instancias en dos etapas:

- corto plazo: mejorar `analytics:run` con tuning automatico, medicion por etapa y configuraciones recomendadas por maquina,
- mediano plazo: reducir overhead estructural moviendo mas trabajo hacia el engine C++ si las mediciones muestran que Node/JSON/Parquet dominan el costo.

## Principios

- Medir antes de reescribir.
- Mantener compatibilidad con el pipeline actual: `generate -> run -> aggregate -> report`.
- No materializar inputs individuales para corridas grandes.
- Preferir cambios reversibles y comparables contra un baseline.
- Cada optimizacion debe reportar `rowsPerSecond`, `totalWallTimeSeconds` y configuracion usada.

## Baseline Actual

Configuracion recomendada al inicio de esta fase:

```bash
ANALYTICS_RUNS_PER_SCENARIO=50000 \
ANALYTICS_MANIFEST_ORDER=interleaved \
ANALYTICS_OUTPUT_FORMAT=parquet \
ANALYTICS_BATCH_SIZE=100 \
ANALYTICS_CONCURRENCY=auto \
pnpm analytics
```

Mediciones locales preliminares con `10k` instancias:

| Configuracion | Tiempo |
| --- | ---: |
| `BATCH_SIZE=100`, `CONCURRENCY=4` | `~11.9s` |
| `BATCH_SIZE=100`, `CONCURRENCY=8` | `~8.9s` |
| `BATCH_SIZE=100`, `CONCURRENCY=auto` | `~9.4s` |

Estas mediciones indican que la concurrencia aporta mas que aumentar demasiado el batch. Batches muy grandes pueden empeorar el balance entre workers.

## Fase 1 - Tuning Medible

### 1.1 Agregar `analytics:tune`

Crear un script que:

- genere una muestra chica reproducible,
- pruebe combinaciones de `ANALYTICS_BATCH_SIZE` y `ANALYTICS_CONCURRENCY`,
- ejecute solo `analytics:run`,
- reporte ranking por `totalWallTimeSeconds` y `rowsPerSecond`.

Configuracion inicial:

```text
runsPerScenario: 1000
batchSize: 50,100,150,250
concurrency: auto,4,6,8
outputFormat: jsonl
```

DoD:

```bash
pnpm analytics:tune
```

imprime una tabla y una recomendacion para la maquina local.

### 1.2 Medir tiempos por etapa

Agregar medicion de:

```text
generateSeconds
runSeconds
aggregateSeconds
reportSeconds
totalSeconds
```

DoD:

```bash
pnpm analytics:timed
```

ejecuta el pipeline completo y escribe `data/analytics/latest-timing.json`.

### 1.3 Ajustar defaults y documentacion

Actualizar defaults recomendados segun resultados de `analytics:tune`.

DoD: `analytics/README.md` y `scripts/README.md` muestran comandos actuales para `50k` y `500k`.

## Fase 2 - Reducir Overhead Del Pipeline Actual

### 2.1 Output Parquet mas eficiente

Evaluar:

- subir `ANALYTICS_PARQUET_FLUSH_ROWS`,
- evitar `latest-runs.parquet` cuando no sea necesario,
- reducir columnas redundantes si no se usan en aggregate/report.

DoD: menor tiempo de escritura sin romper `analytics:aggregate`.

### 2.2 Balanceo por costo

El manifest interleaved balancea por escenario, pero no por costo real. Escenarios como `large-dense` y `xlarge-balanced` pesan mas.

Opciones:

- ordenar chunks mezclando costo estimado,
- reducir `batchSize` para escenarios costosos,
- generar shards con peso aproximado uniforme.

DoD: menor tail latency de workers y menor diferencia entre primer y ultimo worker.

### 2.3 Modo resumible por run id

Agregar `ANALYTICS_RUN_ID` para agrupar outputs y reintentos.

DoD: una corrida puede reanudarse o limpiarse por `runId` sin borrar todo el datalake.

## Fase 3 - Runner Nativo

Si Fase 1 y 2 no alcanzan el objetivo, implementar un runner C++ dedicado:

```text
C++ lee manifest -> genera instancia -> resuelve -> escribe metricas compactas
```

Primera version aceptable:

- entrada: `data/generated/manifest.json` o shard JSONL,
- salida: JSONL compacto compatible con `analytics:aggregate`.

Version posterior:

- salida directa CSV/Arrow/Parquet,
- menor serializacion intermedia,
- menor overhead de Node.

DoD: mejora material frente al runner Node, idealmente `2x` o mas en `analytics:run`.

## Orden Recomendado

1. Implementar `analytics:tune`.
2. Medir `50k` con configuracion recomendada.
3. Agregar medicion por etapa.
4. Optimizar writer Parquet y configuracion de flush.
5. Implementar balanceo por costo si los workers terminan desparejos.
6. Evaluar runner C++ nativo con datos comparativos.
