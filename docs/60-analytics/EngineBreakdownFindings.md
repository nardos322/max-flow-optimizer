# Engine Breakdown Findings

Notas para retomar la optimizacion del pipeline analytics despues de instrumentar timings internos del engine.

## Corrida Base

Run analizado:

```text
runId: run-50k-engine-breakdown
runs: 50000
output: data/analytics/runs/runId=run-50k-engine-breakdown
```

Comando usado:

```bash
ANALYTICS_RUN_ID=run-50k-engine-breakdown \
ANALYTICS_RUNS_PER_SCENARIO=5000 \
ANALYTICS_MANIFEST_ORDER=interleaved \
ANALYTICS_OUTPUT_FORMAT=parquet \
ANALYTICS_BATCH_SIZE=100 \
ANALYTICS_CONCURRENCY=8 \
pnpm analytics:timed
```

## Timing Del Pipeline

```text
generate: 0.40s
run: 36.53s
aggregate: 2.92s
report: 0.19s
total: 40.04s
```

Conclusion: el cuello principal sigue en `analytics:run`; `aggregate` y `report` no son el problema para 50k.

## Breakdown Interno Del Engine

Acumulado sobre 50k instancias:

```text
engine total: 244.27s
parse: 0.04s
syntheticGenerate: 16.67s
solveEnvelope: 214.48s
normalize: 113.51s
buildNetwork: 46.81s
maxFlow: 10.64s
finalize: 0.28s
```

Porcentaje aproximado sobre `engine total`:

```text
normalize: ~46%
buildNetwork: ~19%
syntheticGenerate: ~7%
maxFlow: ~4%
```

Conclusion tecnica: `maxFlow` no es el cuello principal. La mayor parte del costo esta antes del algoritmo de flujo, especialmente en normalizacion y construccion de red.

## Escenarios Que Dominan El Costo

Los escenarios pesados en la muestra son:

```text
large-dense
xlarge-balanced
large-balanced
```

Lectura: cualquier optimizacion debe medirse especialmente contra esos escenarios, porque dominan el tiempo acumulado.

## Hipotesis De Optimizacion

Prioridad 1: revisar `services/engine-cpp/src/normalized_instance.cpp`.

Buscar:

- `unordered_map<string, ...>` o `unordered_set<string>` en loops calientes,
- copias repetidas de ids,
- busquedas por string que puedan resolverse una vez a indices enteros,
- validaciones duplicadas entre contrato/domain y normalizacion,
- conversiones de `dayId`, `medicId` y `periodId` repetidas por instancia.

Prioridad 2: revisar `services/engine-cpp/src/problem_network.cpp`.

Buscar:

- construccion de edges con reallocations,
- lookups repetidos durante el armado de red,
- calculo repetido de capacidades o relaciones periodo-dia,
- oportunidades para reservar memoria con tamanos conocidos.

Prioridad 3: revisar `GenerateSyntheticInput` en `services/engine-cpp/src/analytics.cpp`.

No es el mayor costo, pero aporta `16.67s` acumulados en 50k. Posibles mejoras:

- evitar strings de fecha si analytics no las usa,
- reutilizar ids precomputados por perfil,
- generar directamente una forma normalizada para analytics si se crea un runner nativo futuro.

## Proximo Paso Recomendado

1. Abrir `normalized_instance.cpp`.
2. Agregar una optimizacion pequena y local.
3. Correr:

```bash
ANALYTICS_RUN_ID=run-50k-normalize-test \
ANALYTICS_RUNS_PER_SCENARIO=5000 \
ANALYTICS_MANIFEST_ORDER=interleaved \
ANALYTICS_OUTPUT_FORMAT=parquet \
ANALYTICS_BATCH_SIZE=100 \
ANALYTICS_CONCURRENCY=8 \
pnpm analytics:timed
```

4. Comparar contra `run-50k-engine-breakdown`:

```text
normalize
buildNetwork
maxFlow
run stage seconds
rowsPerSecond
```

## Criterio De Exito

Una mejora vale la pena si reduce al menos uno de estos sin degradar correctness:

```text
normalize acumulado
buildNetwork acumulado
analytics:run seconds
total pipeline seconds
```

Validacion minima despues de cada cambio:

```bash
cmake --build services/engine-cpp/build
ctest --test-dir services/engine-cpp/build --output-on-failure
pnpm -r --workspace-concurrency=1 --if-present run test
```

