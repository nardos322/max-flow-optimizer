# API Contract - MVP

## 0. Fuente de verdad del contrato
- OpenAPI 3.1: `packages/contracts/v1/openapi.yaml`
- Schemas JSON: `packages/contracts/v1/schemas/*`
- Guía de versionado: `docs/30-api/OpenAPI.md`

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
- `maxDaysPerMedic >= 0`.
- IDs unicos en `periods`, `days`, `medics`.
- Todo `dayId` de `periods[*].dayIds` existe en `days`.
- Cada dia pertenece a exactamente un periodo.
- Toda tupla de `availability` referencia medico y dia existentes.

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
    "uncoveredDays": ["d3"]
  }
}
```

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
