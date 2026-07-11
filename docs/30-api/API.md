# API Contract - v1

## 0. Fuente de verdad del contrato
- Schemas Zod: `packages/contracts/src/v1`
- Tipos TypeScript: `@maxflow/contracts` y `@maxflow/contracts/v1`
- Guia de versionado: `docs/30-api/OpenAPI.md`
- Estrategia de validacion: `docs/30-api/ValidationStrategy.md`
- OpenAPI estatico: `packages/contracts/v1/openapi.yaml`
- `packages/contracts` define el contrato HTTP estructural publico.
- `packages/domain` define las validaciones semanticas/cross-field que no conviene expresar solo con schema.
- El OpenAPI y los JSON Schema publicados son artefactos formales estaticos; en este MVP no son la fuente primaria.

## 1. Catalogo de endpoints v1
### Obligatorios MVP
- `GET /health`
  - Uso: healthcheck para desarrollo y CI.
  - Response `200`:
    ```json
    { "status": "ok" }
    ```
- `POST /v1/solve`
  - Uso: validar y resolver una instancia del problema.
  - Content-Type: `application/json`
- `GET /v1/runs`
  - Uso: listar historial local de corridas persistidas.
- `GET /v1/runs/:runId`
  - Uso: consultar input y response completos de una corrida persistida.

### Fuera de alcance v1
- Endpoints de autenticacion.
- Endpoints CRUD de hospitales/medicos/dias persistidos.

## 2. `POST /v1/solve` - Request (JSON)
```json
{
  "instanceId": "demo-001",
  "maxDaysPerMedic": 2,
  "periods": [
    { "id": "p1", "dayIds": ["d1", "d2"] },
    { "id": "p2", "dayIds": ["d3"] }
  ],
  "days": [
    { "id": "d1", "date": "2026-04-17" },
    { "id": "d2", "date": "2026-04-18" },
    { "id": "d3", "date": "2026-04-20" }
  ],
  "medics": [
    { "id": "m1", "name": "Ana" },
    { "id": "m2", "name": "Luis" }
  ],
  "availability": [
    { "medicId": "m1", "dayId": "d1" },
    { "medicId": "m1", "dayId": "d3" },
    { "medicId": "m2", "dayId": "d2" }
  ],
  "metadata": {
    "source": "web-fixture",
    "datasetName": "demo"
  },
  "optimization": {
    "objective": "fairness"
  }
}
```

`metadata` y `optimization` son opcionales y compatibles con requests MVP/P1 existentes.

`optimization.objective` acepta:
- `none`: comportamiento de factibilidad actual.
- `fairness`: solicita optimizacion P2a por equidad de carga con min-cost max-flow.

Si `optimization` no existe, la API debe comportarse como `objective=none`.

## 3. `POST /v1/solve` - Validaciones
### 3.1 Capa estructural (`packages/contracts`)
- Forma base del payload JSON.
- Tipos primitivos, campos requeridos y `additionalProperties=false`.
- La implementacion objetivo usa Zod como fuente primaria compartida por API y web.

### 3.2 Capa semantica (`packages/domain`)
- `maxDaysPerMedic >= 0`.
- IDs unicos en `periods`, `days`, `medics`.
- `days[*].date` debe ser unica.
- Todo `dayId` de `periods[*].dayIds` existe en `days`.
- Cada dia pertenece a exactamente un periodo.
- Toda tupla de `availability` referencia medico y dia existentes.
- Un periodo puede contener dias no contiguos; no se valida continuidad de fechas en v1.
- Se permiten medicos sin disponibilidad.
- El orden de entrada de arrays no afecta el resultado; la implementacion normaliza internamente para lograr determinismo.

### 3.3 Limites operativos v1
Ademas del schema estructural y las reglas semanticas, la API aplica limites operativos para acotar el MVP:
- `days.length <= 500`
- `medics.length <= 500`
- `periods.length <= 100`
- `availability.length <= 100000`
- payload HTTP <= `2.5 MB`

Si se excede un limite, la API responde `400` con `code=INVALID_INPUT` y `details` accionable. Los limites completos viven en `docs/40-quality/NonFunctionalLimits.md`.

## 4. `POST /v1/solve` - Response (factible)
```json
{
  "runId": "0f7d2f6a-4eb7-4e82-9ea3-f6b7d8cbfd7f",
  "createdAt": "2026-07-10T12:00:00.000Z",
  "instanceId": "demo-001",
  "feasible": true,
  "requiredFlow": 3,
  "maxFlow": 3,
  "assignments": [
    { "dayId": "d1", "medicId": "m1", "periodId": "p1" },
    { "dayId": "d2", "medicId": "m2", "periodId": "p1" },
    { "dayId": "d3", "medicId": "m1", "periodId": "p2" }
  ],
  "stats": {
    "nodes": 13,
    "edges": 18,
    "runtimeMs": 2
  },
  "optimization": {
    "objective": "fairness",
    "optimal": true,
    "score": 1,
    "totalCost": 1,
    "maxAssignedDays": 2,
    "minAssignedDays": 1,
    "spread": 1,
    "loadByMedic": [
      { "medicId": "m1", "medicName": "Ana", "assignedDays": 2 },
      { "medicId": "m2", "medicName": "Luis", "assignedDays": 1 }
    ]
  }
}
```

`runId` y `createdAt` aparecen cuando `RUNS_PERSISTENCE_ENABLED=true`.
`optimization` aparece solo cuando se solicita un objetivo distinto de `none` y la instancia es factible.

## 5. `POST /v1/solve` - Response (infactible)
```json
{
  "runId": "0f7d2f6a-4eb7-4e82-9ea3-f6b7d8cbfd7f",
  "createdAt": "2026-07-10T12:00:00.000Z",
  "instanceId": "demo-001",
  "feasible": false,
  "requiredFlow": 3,
  "maxFlow": 2,
  "assignments": [],
  "stats": {
    "nodes": 13,
    "edges": 18,
    "runtimeMs": 1
  },
  "diagnostics": {
    "summaryCode": "INSUFFICIENT_COVERAGE",
    "message": "Unable to cover all days under current constraints.",
    "uncoveredDays": ["d3"],
    "capacity": {
      "requiredDays": 3,
      "totalMedicCapacity": 4,
      "availablePairs": 2
    },
    "daysWithoutAvailability": ["d3"],
    "periods": [
      {
        "periodId": "p2",
        "requiredDays": 1,
        "maxCoverableDays": 0,
        "uncoveredDays": ["d3"]
      }
    ],
    "medics": []
  }
}
```

## 5.1 `diagnostics` - Contrato exacto v1
- `diagnostics` aparece si y solo si `feasible=false`.
- `summaryCode` es fijo en v1: `INSUFFICIENT_COVERAGE`.
- `message` es un resumen legible y estable a nivel funcional.
- `uncoveredDays` lista los `dayId` no cubiertos en la solucion de max-flow.
- `uncoveredDays` debe venir sin duplicados y ordenado ascendentemente por `dayId`.
- `capacity`, `daysWithoutAvailability`, `periods` y `medics` son campos P1 opcionales compatibles.
- `capacity` resume capacidad global.
- `daysWithoutAvailability` lista dias sin ningun medico disponible.
- `periods` lista periodos con dias descubiertos o capacidad local insuficiente.
- `medics` lista medicos sin disponibilidad.
- En `feasible=true`, `diagnostics` no debe estar presente.

## 5.2 `optimization` - Contrato P2a
- `optimization` es opcional.
- En request, `optimization.objective='fairness'` solicita optimizacion por equidad.
- En response factible, `optimization.objective` es `fairness`.
- `optimal=true` indica que el motor encontro el flujo maximo de costo minimo para el modelo implementado.
- `score` es el valor publico para comparar soluciones del mismo objetivo.
- `totalCost` expone el costo tecnico de min-cost max-flow.
- `loadByMedic` lista carga final por medico, ordenada por `medicId`.
- `spread = maxAssignedDays - minAssignedDays`.
- En `feasible=false`, `optimization` no debe estar presente.

## 5.3 Determinismo del resultado
- La API debe devolver `assignments` ordenado ascendentemente por `dayId`.
- `diagnostics.uncoveredDays` debe devolverse ordenado ascendentemente por `dayId`.
- `optimization.loadByMedic` debe devolverse ordenado ascendentemente por `medicId`.
- `stats.edges` cuenta aristas dirigidas del grafo de trabajo del motor antes de expandir residual.
- `stats.runtimeMs` mide solo el tiempo del motor, no el tiempo total HTTP.

## 5.4 Exportacion UI derivada del contrato
- Export JSON: serializa exactamente la respuesta de `POST /v1/solve`.
- Export CSV: solo disponible si `feasible=true`.
- Export CSV de resultado actual: se deriva de `solveResponse.assignments` unido con el `instanceDraft` actual del frontend.
- Export CSV historico: se deriva de `run.response.assignments` unido con `run.input`.
- Columnas CSV P1: `runId,createdAt,instanceId,status,dayId,date,periodId,medicId,medicName,requiredFlow,maxFlow,runtimeMs`.
- Columnas CSV P2 cuando existan metricas: `optimizationObjective,optimizationScore,optimizationTotalCost,medicAssignedDays,loadSpread`.
- Filas CSV ordenadas por `dayId`.
- `dayId`, `periodId`, `medicId`: salen de `assignments`.
- `date`: se resuelve desde `days`.
- `medicName`: se resuelve desde `medics`.

## 6. Codigos de estado
- `200`: ejecucion correcta (factible o infactible) y `GET /health`.
- `400`: validacion de input fallida (`POST /v1/solve`).
- `404`: recurso no encontrado (`GET /v1/runs/:runId`).
- `500`: error interno en API o motor.

## 6.1 `GET /v1/runs`
Lista corridas persistidas en orden descendente por `createdAt`.

Query params:

| Param | Default | Limite | Descripcion |
|---|---:|---:|---|
| `limit` | `20` | `100` | Cantidad maxima de items. |
| `offset` | `0` | - | Offset numerico. |
| `status` | unset | - | `feasible`, `infeasible` o `error`. |
| `instanceId` | unset | - | Filtro exacto por instancia. |

Response `200`:

```json
{
  "items": [
    {
      "runId": "0f7d2f6a-4eb7-4e82-9ea3-f6b7d8cbfd7f",
      "instanceId": "demo-001",
      "createdAt": "2026-07-10T12:00:00.000Z",
      "status": "feasible",
      "feasible": true,
      "requiredFlow": 3,
      "maxFlow": 3,
      "runtimeMs": 2,
      "nodes": 13,
      "edges": 18,
      "inputHash": "sha256:...",
      "source": "web-fixture"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

## 6.2 `GET /v1/runs/:runId`
Devuelve una corrida completa.

Response `200`:

```json
{
  "runId": "0f7d2f6a-4eb7-4e82-9ea3-f6b7d8cbfd7f",
  "instanceId": "demo-001",
  "createdAt": "2026-07-10T12:00:00.000Z",
  "status": "feasible",
  "input": {},
  "response": {}
}
```

Response `404`:

```json
{
  "error": {
    "requestId": "8e950b8f-f8c3-49fc-835b-4015f4963ca1",
    "timestamp": "2026-07-10T12:00:00.000Z",
    "code": "NOT_FOUND",
    "message": "Run was not found.",
    "details": {
      "runId": "missing"
    }
  }
}
```

## 7. Error de validacion (ejemplo)
El listado completo de `error.code` y la forma esperada de `details` por codigo vive en `docs/30-api/ErrorCatalog.md`.

```json
{
  "error": {
    "requestId": "8e950b8f-f8c3-49fc-835b-4015f4963ca1",
    "timestamp": "2026-03-06T23:30:00.000Z",
    "code": "INVALID_INPUT",
    "message": "Each day must belong to exactly one period.",
    "details": {
      "dayId": "d2"
    }
  }
}
```
