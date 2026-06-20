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

Configuracion recomendada despues del tuning local de `500k`:

```bash
ANALYTICS_RUNS_PER_SCENARIO=50000 \
ANALYTICS_MANIFEST_ORDER=interleaved \
ANALYTICS_OUTPUT_FORMAT=parquet \
ANALYTICS_BATCH_SIZE=500 \
ANALYTICS_CONCURRENCY=8 \
pnpm analytics
```

Mediciones locales:

| Configuracion | Tiempo |
| --- | ---: |
| `BATCH_SIZE=100`, `CONCURRENCY=4` | `~11.9s` |
| `BATCH_SIZE=100`, `CONCURRENCY=8` | `~8.9s` |
| `BATCH_SIZE=100`, `CONCURRENCY=auto` | `~9.4s` |
| `BATCH_SIZE=250`, `CONCURRENCY=8`, `500k` | `152.14s`, `3286.45 rows/s` |
| `BATCH_SIZE=500`, `CONCURRENCY=8`, `500k` | `120.11s`, `4162.85 rows/s` |

Estas mediciones indican que la concurrencia aporta mas que aumentar demasiado el batch en muestras chicas, pero para `500k` la corrida completa favorecio `BATCH_SIZE=500` con `CONCURRENCY=8`. En otra maquina se debe volver a medir con `analytics:tune`.

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
batchSize: 50,100,150,250,500
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

Estado: implementada en el runner actual. Mantener esta fase como superficie de tuning; nuevas optimizaciones deben compararse contra `run-50k-engine-breakdown`.

### 2.1 Output Parquet mas eficiente

Implementado:

- `ANALYTICS_PARQUET_FLUSH_ROWS` controla filas acumuladas por escenario antes de escribir partes.
- `ANALYTICS_UPDATE_LATEST_OUTPUT=false` evita crear `latest-runs.parquet` o copiar `latest-runs.jsonl` cuando solo interesa el output aislado por `runId`.
- el writer Parquet escribe particiones en streaming bajo `data/analytics/runs/runId=<id>/`.

DoD: menor tiempo de escritura sin romper `analytics:aggregate`.

### 2.2 Balanceo por costo

El manifest interleaved balancea por escenario, pero no por costo real. Escenarios como `large-dense` y `xlarge-balanced` pesan mas.

Implementado:

- `ANALYTICS_CHUNK_STRATEGY=cost-balanced` distribuye entradas pesadas entre chunks usando tamano del escenario, densidad y pares de disponibilidad cuando estan disponibles.
- `ANALYTICS_CHUNK_STRATEGY=sequential` conserva el comportamiento anterior para comparar.
- `ANALYTICS_MANIFEST_ORDER=interleaved` sigue siendo util, pero el balance fino ahora ocurre en `analytics:run`.

DoD: menor tail latency de workers y menor diferencia entre primer y ultimo worker.

### 2.3 Modo resumible por run id

Implementado:

- `ANALYTICS_RUN_ID` agrupa outputs de corrida.
- `ANALYTICS_RESUME=true` omite records ya presentes para el mismo `runId`, tanto en JSONL como en Parquet particionado.
- `analytics:aggregate` y `analytics:report` pueden apuntar al mismo `ANALYTICS_RUN_ID`.

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
4. Medir Fase 2 contra `run-50k-engine-breakdown`.
5. Optimizar `normalized_instance.cpp` y `problem_network.cpp` si `runSeconds` sigue dominando.
6. Evaluar runner C++ nativo solo con datos comparativos.
