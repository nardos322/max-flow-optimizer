# Analytics Implementation Route

Ruta ejecutable para implementar la capa analytics sin mezclarla con el MVP interactivo.

## Regla De Ejecucion

- Completar los bloques en orden.
- Mantener `apps/web`, `apps/api` y `services/engine-cpp` desacoplados de `analytics`.
- No introducir DB, auth, dashboard ni Spark en la primera entrega.
- Todo output grande debe quedar fuera de git.
- Cada bloque debe dejar comandos o instrucciones reproducibles.

## Estado Por Bloque

- [x] Bloque A - Especificacion
- [x] Bloque B - Politica de datos y estructura base
- [x] Bloque C - Generador de escenarios
- [x] Bloque D - Batch runner contra engine
- [x] Bloque E - Agregaciones
- [x] Bloque F - Reporte analytics
- [ ] Bloque G - Cierre y documentacion operativa

## Bloque A - Especificacion

### [x] A1. Definir alcance analytics

- Documentar objetivo, motivacion, alcance inicial y fuera de alcance.
- DoD: `AnalyticsSpec.md` deja claro que analytics inicia como pipeline offline.

### [x] A2. Definir stack inicial

- Elegir JSONL/CSV como salida inicial.
- Elegir DuckDB/Polars para analisis local.
- Dejar Spark/Kafka/Airflow fuera de la primera entrega.
- DoD: stack documentado con justificacion practica.

### [x] A3. Definir metricas y registro por corrida

- Documentar input metrics, result metrics, graph metrics y performance metrics.
- Definir shape conceptual de registro por corrida.
- DoD: cualquier implementacion futura puede producir records compatibles.

## Bloque B - Politica De Datos Y Estructura Base

### [x] B1. Crear estructura analytics

Crear:

```text
analytics/
  README.md
  queries/
  reports/

data/
  generated/
  analytics/
```

DoD:

- carpetas base existen,
- outputs pesados quedan ignorados,
- si se versionan carpetas vacias, usar `.gitkeep`.

### [x] B2. Actualizar `.gitignore`

- Ignorar datasets generados y outputs grandes.
- Permitir fixtures pequenos si se agregan explicitamente.

DoD:

- `data/generated/**` queda ignorado salvo `.gitkeep`,
- `data/analytics/**` queda ignorado salvo `.gitkeep`,
- no se agregan archivos pesados por accidente.

### [x] B3. Documentar politica de datos

- Explicar que se versiona y que se regenera.
- DoD: `analytics/README.md` incluye politica corta y comandos esperados.

## Bloque C - Generador De Escenarios

### [x] C1. Definir perfiles de escenario

- Implementar o configurar perfiles:
  - `small-sparse`
  - `small-balanced`
  - `medium-balanced`
  - `medium-dense`
  - `large-balanced`

DoD:

- cada perfil define `daysCount`, `medicsCount`, `periodsCount`, `availabilityDensity`, `maxDaysPerMedic` y `seed`.

### [x] C2. Generar instancias reproducibles

- Crear generador con seed deterministica.
- Producir JSON compatible con `POST /v1/solve`.

DoD:

- la misma seed produce el mismo archivo,
- las instancias pasan validacion estructural y semantica,
- los archivos se escriben en `data/generated`.

### [x] C3. Agregar comando `analytics:generate`

- Conectar el generador a `package.json`.

DoD:

```bash
pnpm analytics:generate
```

genera datasets locales sin tocar el MVP.

## Bloque D - Batch Runner Contra Engine

### [x] D1. Ejecutar engine por instancia

- Usar `services/engine-cpp/build/maxflow_engine --stdin` o `--input`.
- Construir el wrapper interno con `requestId` e `input`.

DoD:

- el runner puede resolver instancias generadas contra `solverTarget=engine`.

### [x] D2. Capturar metricas por corrida

- Capturar respuesta del engine.
- Medir `wallTimeMs`.
- Normalizar errores.
- Crear un registro por corrida.

DoD:

- cada corrida emite un record JSONL con el shape documentado.

### [x] D3. Agregar comando `analytics:run`

DoD:

```bash
pnpm analytics:run
```

lee `data/generated` y escribe resultados en `data/analytics`.

## Bloque E - Agregaciones

### [x] E1. Crear queries base

Agregar queries para:

- tasa de factibilidad por escenario,
- percentiles de runtime por escenario,
- runtime vs tamano del grafo.

DoD:

- existen al menos 3 queries reproducibles en `analytics/queries`.

### [x] E2. Agregar comando `analytics:aggregate`

DoD:

```bash
pnpm analytics:aggregate
```

produce un CSV o JSON agregado por escenario.

## Bloque F - Reporte Analytics

### [x] F1. Generar reporte markdown

- Crear reporte con tablas agregadas y lectura breve.
- Incluir fecha, dataset usado, cantidad de corridas y limitaciones.

DoD:

- existe un reporte en `analytics/reports`.

### [x] F2. Agregar comando `analytics:report`

DoD:

```bash
pnpm analytics:report
```

regenera el reporte desde los outputs agregados.

## Bloque G - Cierre Y Documentacion Operativa

### [x] G1. Documentar flujo completo

- Explicar comandos y prerequisitos en `analytics/README.md`.

DoD:

Un usuario puede correr:

```bash
pnpm analytics:generate
pnpm analytics:run
pnpm analytics:aggregate
pnpm analytics:report
```

sin leer codigo fuente.

### [ ] G2. Verificar aislamiento del MVP

- Ejecutar quality gates relevantes del MVP.
- Confirmar que analytics no rompe `pnpm build`, `pnpm test` ni `pnpm lint`.

DoD:

- MVP sigue en verde,
- analytics queda como extension offline.

## Criterio De Salida

La primera entrega analytics queda cerrada cuando:

- se generan escenarios reproducibles,
- se corren batches contra el engine,
- se producen registros JSONL,
- se calculan agregaciones,
- se genera un reporte local,
- los datos pesados quedan fuera de git,
- el MVP interactivo no depende de analytics.
