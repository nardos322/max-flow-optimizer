# API Contract - MVP

## 0. Fuente de verdad del contrato
- OpenAPI 3.1: `packages/contracts/v1/openapi.yaml`
- Schemas JSON: `packages/contracts/v1/schemas/*`
- Guía de versionado: `docs/30-api/OpenAPI.md`
- `packages/contracts` define el contrato HTTP estructural publico.
- `packages/domain` define las validaciones semanticas/cross-field que no conviene expresar solo con schema.

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

### Fuera de alcance v1
- Endpoints de autenticacion.
- Endpoints CRUD de hospitales/medicos/dias persistidos.
- Endpoints de historial de corridas (solo si luego se agrega DB en v1.1).

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
  ]
}
```

## 3. `POST /v1/solve` - Validaciones
### 3.1 Capa estructural (`packages/contracts`)
- Forma base del payload JSON.
- Tipos primitivos, campos requeridos y `additionalProperties=false`.

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

## 4. `POST /v1/solve` - Response (factible)
```json
{
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
  }
}
```

## 5. `POST /v1/solve` - Response (infactible)
```json
{
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
    "uncoveredDays": ["d3"]
  }
}
```

## 5.1 `diagnostics` - Contrato exacto v1
- `diagnostics` aparece si y solo si `feasible=false`.
- `summaryCode` es fijo en v1: `INSUFFICIENT_COVERAGE`.
- `message` es un resumen legible y estable a nivel funcional.
- `uncoveredDays` lista los `dayId` no cubiertos en la solucion de max-flow.
- `uncoveredDays` debe venir sin duplicados y ordenado ascendentemente por `dayId`.
- En `feasible=true`, `diagnostics` no debe estar presente.

## 5.2 Determinismo del resultado
- La API debe devolver `assignments` ordenado ascendentemente por `dayId`.
- `diagnostics.uncoveredDays` debe devolverse ordenado ascendentemente por `dayId`.
- `stats.edges` cuenta aristas dirigidas del grafo de trabajo del motor antes de expandir residual.
- `stats.runtimeMs` mide solo el tiempo del motor, no el tiempo total HTTP.

## 5.3 Exportacion UI derivada del contrato
- Export JSON: serializa exactamente la respuesta de `POST /v1/solve`.
- Export CSV: solo disponible si `feasible=true`.
- Export CSV: se deriva de `solveResponse.assignments` unido con el `instanceDraft` actual del frontend.
- Columnas CSV v1: `dayId,date,periodId,medicId,medicName`.
- Filas CSV ordenadas por `dayId`.
- `dayId`, `periodId`, `medicId`: salen de `assignments`.
- `date`: se resuelve desde `days`.
- `medicName`: se resuelve desde `medics`.

## 6. Codigos de estado
- `200`: ejecucion correcta (factible o infactible) y `GET /health`.
- `400`: validacion de input fallida (`POST /v1/solve`).
- `500`: error interno en API o motor.

## 7. Error de validacion (ejemplo)
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
