# Big Data Pipeline Plan

Plan de evolucion para que la capa analytics soporte cientos de miles o millones de instancias sin depender de un unico archivo grande ni de agregaciones completas en memoria.

## Objetivo

Escalar el pipeline offline actual para ejecutar muchas instancias del problema, resolverlas contra el engine C++ y analizar resultados con buen throughput, capacidad de reanudacion y costos de I/O controlados.

Este plan no cambia el flujo interactivo `web -> api -> engine`. La evolucion aplica al pipeline batch de analytics.

## Punto De Partida

El pipeline actual ya tiene bases utiles:

- `scripts/analytics-generate.mjs` genera manifests reproducibles.
- `scripts/analytics-run.mjs` ejecuta el engine en modo batch JSONL.
- `ANALYTICS_CONCURRENCY` permite paralelismo local.
- `ANALYTICS_BATCH_SIZE` amortiza el costo de levantar procesos.
- `--analytics-jsonl` permite payload compacto sin escribir cada input completo.
- `analytics/python/analyze_runs.py` agrega resultados con Polars y DuckDB.

El limite principal para millones no es solo el algoritmo de max-flow. Los cuellos probables son:

- archivos JSONL enormes,
- agregacion con `pl.read_ndjson(...)` cargando todo en memoria,
- manifest central unico,
- poca capacidad de reanudar por shard,
- falta de metricas de throughput y costo de I/O.

## Recomendacion General

Implementar la evolucion en fases. Primero hacer que resultados y agregaciones escalen localmente; despues agregar sharding reanudable; finalmente distribuir workers si el volumen lo justifica.

## Fase 1 - Resultados Parquet Particionados

### Objetivo

Reemplazar el archivo gigante `latest-runs.jsonl` como artefacto principal por resultados particionados en Parquet.

### Cambios Propuestos

- Escribir resultados por particion:

```text
data/analytics/runs/
  scenarioName=large-balanced/
    runDate=YYYY-MM-DD/
      part-000001.parquet
      part-000002.parquet
```

- Mantener JSONL solo como formato temporal o modo debug.
- Agregar una opcion de runner, por ejemplo:

```bash
ANALYTICS_OUTPUT_FORMAT=parquet pnpm analytics:run
```

- Cambiar la agregacion para leer con `scan_parquet` o DuckDB sobre particiones, evitando cargar todo el dataset.

### Resultado Esperado

- Menos uso de disco.
- Menos memoria en agregacion.
- Lecturas por escenario/tamano mucho mas baratas.
- Base preparada para queries historicas.

## Fase 2 - Agregacion Lazy

### Objetivo

Evitar `pl.read_ndjson(path)` como ruta principal para datasets grandes.

### Cambios Propuestos

- Crear una ruta de agregacion para Parquet:

```python
pl.scan_parquet("data/analytics/runs/**/*.parquet")
```

- Mantener compatibilidad con JSONL para datasets chicos.
- Ejecutar percentiles, promedios y tasas por escenario usando LazyFrame o DuckDB.
- Evitar convertir todos los resultados a listas Python salvo para outputs finales pequenos.

### Resultado Esperado

La agregacion puede procesar millones de filas con memoria estable, siempre que los calculos sean agregados y no materialicen todos los registros.

## Fase 3 - Manifests Shardeados

### Objetivo

Eliminar el manifest central unico como unidad de trabajo.

### Cambios Propuestos

Generar manifests por shard:

```text
data/generated/manifest/
  part-000001.jsonl
  part-000002.jsonl
  part-000003.jsonl
```

Cada linea representa una instancia compacta:

```json
{"scenarioName":"large-balanced","seed":3101,"instanceId":"large-balanced-0001","daysCount":200,"medicsCount":200,"periodsCount":20,"availabilityDensity":0.3,"maxDaysPerMedic":2}
```

Agregar variables de ejecucion:

```bash
ANALYTICS_MANIFEST_SHARD=data/generated/manifest/part-000001.jsonl pnpm analytics:run
```

### Resultado Esperado

- Trabajos mas chicos y asignables a workers.
- Menor memoria al leer trabajo pendiente.
- Mas facil paralelizar entre maquinas.

## Fase 4 - Checkpoints Y Reanudacion

### Objetivo

Permitir retomar una corrida grande sin repetir shards completos.

### Cambios Propuestos

Por cada shard, escribir estado:

```text
data/analytics/checkpoints/
  part-000001.json
```

Contenido conceptual:

```json
{
  "shard": "part-000001.jsonl",
  "status": "running",
  "processed": 25000,
  "ok": 24980,
  "errors": 20,
  "updatedAt": "2026-06-03T00:00:00Z"
}
```

Reglas:

- Si un shard esta completo, no reprocesarlo.
- Si falla, reanudar desde el ultimo offset confirmado.
- Escribir outputs por lote para que un fallo pierda poco trabajo.

### Resultado Esperado

El pipeline puede correr durante horas o dias con recuperacion razonable ante fallos.

## Fase 5 - Worker Pool

### Objetivo

Distribuir shards cuando una sola maquina no alcance.

### Opcion Local

- Ejecutar varios procesos sobre shards distintos.
- Limitar `ANALYTICS_CONCURRENCY` por proceso para no saturar CPU/memoria.

### Opcion Distribuida

Usar una cola simple:

- Redis,
- RabbitMQ,
- SQS,
- u otra cola operacionalmente disponible.

Cada worker debe ser stateless:

- toma un shard o rango,
- ejecuta engine C++ en batch,
- escribe Parquet,
- actualiza checkpoint,
- reporta errores.

### Resultado Esperado

Escalado horizontal sin acoplar analytics al API ni al frontend.

## Fase 6 - Modo Summary-Only Del Engine

### Objetivo

Reducir serializacion y memoria cuando analytics solo necesita metricas.

### Cambios Propuestos

Agregar un flag del engine, por ejemplo:

```bash
maxflow_engine --stdin --analytics-jsonl --summary-only
```

En este modo la respuesta omitiria:

- `assignments`,
- diagnosticos extensos si no son necesarios,
- cualquier payload grande no requerido por agregacion.

Mantener:

- `feasible`,
- `requiredFlow`,
- `maxFlow`,
- `stats.runtimeMs`,
- `stats.nodes`,
- `stats.edges`,
- conteo de uncovered days,
- codigo de error si aplica.

### Resultado Esperado

Menor costo por instancia y menor volumen de datos escritos.

## Fase 7 - Optimizaciones Del Engine

### Objetivo

Optimizar cuando las mediciones indiquen que el engine es el cuello principal.

### Candidatos

- Reservar memoria del grafo antes de insertar aristas.
- Evitar DFS recursivo en Dinic para reducir riesgo de stack en grafos grandes.
- No crear nodos `medic_period` para combinaciones imposibles si no tienen uso.
- Reducir trabajo de ordenamiento de asignaciones en modo analytics.
- Agregar benchmarks de stress por tamano y densidad.

### Resultado Esperado

Mejor runtime por instancia sin cambiar el contrato funcional del solver.

## Metricas Nuevas Recomendadas

Ademas de las metricas actuales, registrar:

- `instancesPerSecond`
- `batchWallTimeMs`
- `engineRuntimeMs`
- `serializationWallTimeMs`
- `outputBytes`
- `rowsWritten`
- `workerId`
- `shardId`
- `retryCount`
- `checkpointOffset`

Estas metricas ayudan a separar tiempo de engine, generacion, serializacion, escritura y agregacion.

## Orden De Implementacion Recomendado

1. Parquet particionado para resultados.
2. Agregacion lazy con Polars/DuckDB.
3. Manifests shardeados.
4. Checkpoints por shard.
5. Worker pool local.
6. Worker pool distribuido si hace falta.
7. Modo `summary-only` y optimizaciones del engine.

## Criterios De Exito

- Ejecutar al menos `1_000_000` instancias sin un archivo JSONL unico gigante.
- Reanudar una corrida interrumpida sin repetir todo el dataset.
- Agregar resultados con memoria estable.
- Consultar resultados por escenario, tamano y fecha.
- Mantener el MVP interactivo desacoplado del pipeline big data.

## Fuera De Alcance Inicial

- Dashboard en tiempo real.
- Integracion con el API productivo.
- Spark o Airflow antes de necesitar distribucion real.
- Guardar cada input completo si puede regenerarse por seed.
- Base de datos transaccional para cada corrida individual.
