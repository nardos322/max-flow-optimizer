# apps/web

Frontend React del MVP. Permite construir una instancia del problema, resolverla contra la API y visualizar si existe una asignacion factible de dias a medicos.

## Responsabilidad

- Exponer la experiencia principal del MVP en tres secciones: `Periodos`, `Medicos` y `Planificador`.
- Mantener un `instanceDraft` compartido en memoria con React Context + reducer.
- Permitir cargar fixtures para demo rapida.
- Validar campos locales antes de enviar a la API.
- Consumir `POST /v1/solve`.
- Mostrar factibilidad, asignaciones, metricas y diagnosticos.
- Exportar resultado JSON y CSV.

La app no persiste datos en v1. El estado vive en memoria mientras la pagina esta abierta.

## Experiencia De Usuario

### `Periodos`

Permite crear y editar:

- periodos,
- dias,
- relacion `periodId -> dayIds`.

El objetivo de esta vista es definir que dias deben cubrirse y a que periodo pertenece cada uno.

### `Medicos`

Permite crear y editar:

- medicos,
- disponibilidad por medico,
- pares `{ medicId, dayId }`.

La disponibilidad se edita por medico y los dias se muestran agrupados por periodo para evitar una tabla global dificil de usar.

### `Planificador`

Permite:

- revisar un resumen de la instancia actual,
- ejecutar la resolucion,
- ver `feasible=true/false`,
- revisar asignaciones enriquecidas con fecha y nombre del medico,
- ver metricas del motor,
- exportar JSON y CSV.

El CSV solo se habilita cuando el resultado es factible.

## Flujo De Datos

```text
Usuario edita formularios
  -> instanceDraft
  -> validacion local
  -> POST /v1/solve
  -> API
  -> engine C++
  -> lastSolveResult / lastSolveError
  -> UI de resultado y exportaciones
```

`instanceDraft` es la fuente de verdad de la entrada. Cuando el usuario modifica el draft despues de resolver, el ultimo resultado se invalida para evitar mostrar una solucion vieja sobre datos nuevos.

## Integracion Con API

La base URL se configura con:

```env
VITE_API_BASE_URL=/api
```

En desarrollo, Vite proxya `/api` hacia la API local. La llamada real del frontend queda:

```text
POST ${VITE_API_BASE_URL}/v1/solve
```

Con el default local:

```text
POST /api/v1/solve
```

## Comandos

Desde la raiz del monorepo:

```bash
pnpm --filter @maxflow/web run dev
pnpm --filter @maxflow/web run build
pnpm --filter @maxflow/web run test
pnpm --filter @maxflow/web run lint
pnpm --filter @maxflow/web run typecheck
```

Notas:

- `dev` levanta Vite en `http://127.0.0.1:4173`.
- `build` genera el bundle de produccion con Vite.
- Para levantar web + API + engine, usar `pnpm run dev:full` desde la raiz.

## Estructura

- `src/App.tsx`: composicion principal.
- `src/app`: layout, header, navegacion y secciones.
- `src/features/periods`: vista y componentes de periodos/dias.
- `src/features/medics`: vista y componentes de medicos/disponibilidad.
- `src/features/planner`: resolucion, resultado, metricas y exportacion.
- `src/features/draft`: selectores, ordenamiento y validacion local del draft.
- `src/lib/api.ts`: cliente HTTP hacia la API.
- `src/lib/fixture.ts`: carga y parseo de fixtures.
- `src/state`: estado global, acciones, reducer y mutaciones.
- `src/shared`: componentes UI y utilidades compartidas.

## Estado Frontend

El estado global incluye:

- `instanceDraft`: entrada editable del usuario.
- `activeSection`: tab actual.
- `lastSolveResult`: ultima respuesta exitosa o infactible.
- `lastSolveError`: ultimo error de API/red.
- `isSolving`: estado de envio.

Reglas importantes:

- navegar entre tabs no borra datos confirmados,
- modificar el draft invalida el resultado anterior,
- el frontend no recalcula factibilidad,
- las exportaciones se generan desde la respuesta de API y el draft actual.

## Exportaciones

JSON:

- disponible despues de cada corrida,
- contiene la respuesta completa de `POST /v1/solve`.

CSV:

- disponible solo si `feasible=true`,
- usa `assignments` y los datos del draft para enriquecer filas,
- columnas v1: `dayId,date,periodId,medicId,medicName`,
- filas ordenadas por `dayId`.

## Calidad

- Tests de reducer, mutaciones, fixtures, validacion local y exportacion.
- Typecheck con TypeScript.
- Build con Vite.
- Contrato compartido con `@maxflow/contracts`.

Documentacion relacionada:

- [FrontendSpec.md](../../docs/00-product/FrontendSpec.md)
- [API.md](../../docs/30-api/API.md)
- [DemoScript.md](../../docs/00-product/DemoScript.md)
