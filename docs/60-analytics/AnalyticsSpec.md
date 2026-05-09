# Analytics Spec - Batch Simulation & Solver Analytics

## 1. Objetivo

Agregar una capa analitica para simular muchas instancias del problema de asignacion y estudiar:

- factibilidad bajo distintas condiciones,
- rendimiento del motor C++,
- crecimiento del grafo generado,
- sensibilidad frente a parametros como disponibilidad, cantidad de medicos, cantidad de dias y limite `C`.

La pregunta central deja de ser solo:

```text
Dada esta instancia, existe una asignacion factible?
```

y pasa a incluir:

```text
Que patrones aparecen al resolver miles de instancias generadas bajo distintos escenarios?
```

## 2. Motivacion

El MVP actual resuelve una instancia puntual. La capa analytics permite convertir el proyecto en una herramienta de experimentacion:

- validar empiricamente limites de rendimiento,
- detectar casos que generan infactibilidad,
- comparar escenarios sinteticos,
- producir reportes reproducibles para portfolio,
- preparar una futura capa de historial o dashboard sin acoplarla al MVP desde el inicio.

## 3. Alcance Inicial

Incluido en la primera iteracion analytics:

- generador de escenarios sinteticos,
- runner batch offline,
- ejecucion contra el engine C++ o contra la API local,
- salida de resultados en formato analitico,
- metricas por corrida,
- agregaciones con DuckDB o Polars,
- reporte local con hallazgos basicos.

Fuera de alcance inicial:

- autenticacion,
- dashboard web,
- persistencia productiva en API,
- endpoint `GET /v1/runs`,
- Kafka,
- Spark,
- Airflow,
- despliegue cloud,
- procesamiento distribuido real.

La DB de corridas puede ser una evolucion posterior. No bloquea el inicio de analytics.

## 4. Arquitectura Propuesta

```text
scenario generator
  -> generated input files
  -> batch runner
  -> engine/API
  -> raw run records
  -> analytics dataset
  -> DuckDB/Polars queries
  -> reports
```

Estructura sugerida:

```text
scripts/
  generate-scenarios.mjs
  run-batch.mjs

analytics/
  README.md
  queries/
    feasibility.sql
    performance.sql
  reports/

data/
  generated/
  analytics/
```

Regla de separacion:

- `apps/web` y `apps/api` no deben depender de `analytics`.
- `analytics` puede consumir contratos, fixtures y scripts existentes.
- Los datos generados no deben bloquear el build ni los tests del MVP.

## 4.1 Target De Ejecucion

La primera implementacion debe ejecutar contra el engine C++ directamente.

Target inicial:

```text
solverTarget = engine
```

Motivos:

- no requiere levantar la API,
- reduce overhead HTTP,
- permite correr batches mas grandes,
- mide de forma mas directa el comportamiento del solver,
- mantiene el pipeline offline separado del producto interactivo.

Target opcional posterior:

```text
solverTarget = api
```

Este modo sirve para validar el flujo end-to-end `batch runner -> API -> engine`, pero no debe bloquear la primera entrega analytics.

Regla:

- `engine` es obligatorio para la primera version.
- `api` es opcional y puede agregarse despues si aporta valor de comparacion.

## 5. Stack Recomendado

Primera etapa:

- Node.js/TypeScript o Node.js ESM para generacion y batch runner.
- JSONL como formato inicial de resultados.
- CSV para inspeccion manual simple.
- DuckDB para consultas SQL locales sobre archivos.
- Polars/Python para analisis programatico y transformaciones.

Segunda etapa opcional:

- Parquet como formato columnar.
- Jupyter notebooks para exploracion.
- SQLite/PostgreSQL si se decide persistir corridas reales del producto.

No usar inicialmente:

- Spark,
- Kafka,
- Airflow,
- Hadoop,
- Kubernetes.

Esas herramientas pueden aparecer cuando exista volumen o necesidad real de orquestacion/distribucion.

## 5.1 Comandos Propuestos

Los comandos deben ejecutarse desde la raiz del monorepo.

Comandos objetivo:

```bash
pnpm analytics:generate
pnpm analytics:run
pnpm analytics:aggregate
pnpm analytics:report
```

Responsabilidad esperada:

| Comando | Responsabilidad |
| --- | --- |
| `pnpm analytics:generate` | Generar instancias sinteticas reproducibles en `data/generated`. |
| `pnpm analytics:run` | Ejecutar las instancias contra el engine y guardar registros por corrida. |
| `pnpm analytics:aggregate` | Calcular agregados por escenario usando DuckDB, Polars o ambos. |
| `pnpm analytics:report` | Producir un reporte markdown con resultados principales. |

Comando compuesto opcional:

```bash
pnpm analytics
```

Ese comando puede ejecutar el flujo completo:

```text
generate -> run -> aggregate -> report
```

La implementacion inicial puede empezar con scripts directos en `scripts/` y luego conectarlos a `package.json`.

## 6. Tipos De Escenarios

Cada escenario sintetico debe controlar al menos:

- `daysCount`: cantidad de dias.
- `medicsCount`: cantidad de medicos.
- `periodsCount`: cantidad de periodos.
- `maxDaysPerMedic`: limite global `C`.
- `availabilityDensity`: probabilidad de que un medico este disponible para un dia.
- `seed`: semilla para reproducibilidad.

Escenarios base recomendados:

| Nombre | Dias | Medicos | Periodos | Densidad | Objetivo |
| --- | ---: | ---: | ---: | ---: | --- |
| `small-sparse` | 25 | 10 | 5 | 0.15 | Infactibilidad frecuente. |
| `small-balanced` | 25 | 15 | 5 | 0.35 | Casos mixtos. |
| `medium-balanced` | 100 | 80 | 10 | 0.30 | Benchmark realista. |
| `medium-dense` | 100 | 80 | 10 | 0.70 | Grafo con muchas aristas. |
| `large-balanced` | 200 | 200 | 20 | 0.30 | Limite objetivo v1. |

## 7. Registro Por Corrida

Cada corrida batch debe producir un registro independiente. Formato conceptual:

```json
{
  "runId": "2026-05-09T120000Z-medium-balanced-0001",
  "scenarioName": "medium-balanced",
  "seed": 1234,
  "solverTarget": "engine",
  "instanceId": "medium-balanced-0001",
  "daysCount": 100,
  "medicsCount": 80,
  "periodsCount": 10,
  "availabilityPairs": 2400,
  "availabilityDensity": 0.3,
  "maxDaysPerMedic": 2,
  "feasible": true,
  "requiredFlow": 100,
  "maxFlow": 100,
  "uncoveredDaysCount": 0,
  "nodes": 903,
  "edges": 2580,
  "runtimeMs": 18,
  "wallTimeMs": 24,
  "status": "ok",
  "errorCode": null
}
```

## 8. Metricas

Metricas de input:

- `daysCount`
- `medicsCount`
- `periodsCount`
- `availabilityPairs`
- `availabilityDensity`
- `maxDaysPerMedic`
- `seed`

Metricas de resultado:

- `feasible`
- `requiredFlow`
- `maxFlow`
- `uncoveredDaysCount`

Metricas de grafo:

- `nodes`
- `edges`
- `edgesPerNode`

Metricas de performance:

- `runtimeMs`: reportado por el engine.
- `wallTimeMs`: medido por el runner batch.
- p50, p95, p99 por escenario.
- tasa de errores por escenario.

## 9. Preguntas Analiticas

La primera version debe permitir responder:

1. Que densidad de disponibilidad empieza a producir alta factibilidad?
2. Como cambia la factibilidad al aumentar `maxDaysPerMedic`?
3. Como crece `runtimeMs` con `daysCount`, `medicsCount` y `edges`?
4. Que escenarios generan mas `uncoveredDays`?
5. El limite v1 de p95 <= 1s se mantiene en escenarios sinteticos grandes?
6. Hay diferencia relevante entre medir solo `runtimeMs` del engine y `wallTimeMs` del batch?

## 10. Salidas Esperadas

Artefactos iniciales:

- dataset JSONL con corridas batch,
- CSV agregado por escenario,
- queries SQL reproducibles,
- reporte markdown con resultados principales.

Ejemplo de reportes:

- tasa de factibilidad por escenario,
- percentiles de runtime por escenario,
- runtime vs edges,
- uncovered days promedio por escenario infactible.

## 10.1 Politica De Datos

Los datasets generados pueden crecer rapido. La politica inicial es:

Versionar:

- scripts,
- configs de escenarios,
- queries SQL,
- codigo de agregacion,
- reportes pequenos en markdown,
- muestras pequenas de datos si ayudan a documentar el formato.

No versionar:

- datasets grandes,
- outputs batch completos,
- archivos Parquet grandes,
- dumps temporales,
- resultados generados repetibles.

Carpetas sugeridas:

```text
data/
  generated/
  analytics/
```

Estas carpetas deben considerarse output local. Si se necesita mantenerlas en el repo, usar `.gitkeep`, pero ignorar su contenido pesado con `.gitignore`.

Regla practica:

- Un archivo de datos solo debe versionarse si es pequeno, estable y necesario como fixture o ejemplo.
- Los resultados reproducibles deben regenerarse con comandos documentados en lugar de commitearse.

## 11. Criterios De Aceptacion

La primera entrega analytics se considera completa si:

- existe un generador reproducible con `seed`,
- existe un runner batch que ejecuta al menos 5 escenarios,
- cada corrida produce un registro analitico estable,
- los resultados se guardan en `data/analytics`,
- hay al menos 3 queries o agregaciones documentadas,
- existe un reporte local con hallazgos,
- el MVP interactivo sigue funcionando sin depender del pipeline analytics.

## 12. Ruta De Implementacion

### Bloque A - Especificacion

- Definir alcance, stack, metricas y estructura.
- DoD: `docs/60-analytics` documenta que se va a construir y que queda fuera.

### Bloque B - Generador De Escenarios

- Crear generador reproducible por seed.
- Soportar perfiles de escenario.
- DoD: genera instancias validas compatibles con `POST /v1/solve`.

### Bloque C - Batch Runner

- Ejecutar N instancias contra engine o API local.
- Medir `wallTimeMs`.
- Capturar respuestas y errores.
- DoD: produce JSONL con un registro por corrida.

### Bloque D - Queries Y Agregaciones

- Agregar queries DuckDB o scripts Polars.
- Calcular factibilidad, percentiles y errores por escenario.
- DoD: las queries corren sobre el dataset generado.

### Bloque E - Reporte

- Generar reporte markdown con resultados.
- Incluir lectura de hallazgos y limites.
- DoD: reporte reproducible desde comandos documentados.

La ruta ejecutable detallada vive en [AnalyticsImplementationRoute.md](AnalyticsImplementationRoute.md).

## 13. Evoluciones Posteriores

Posibles pasos despues de la primera entrega:

- persistir corridas reales de la API en SQLite/PostgreSQL,
- endpoint `GET /v1/runs`,
- dashboard historico en la UI,
- exportar Parquet,
- notebooks exploratorios,
- comparacion entre versiones del motor,
- PySpark para practicar procesamiento distribuido sobre datasets mas grandes.
