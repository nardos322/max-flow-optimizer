# OpenAPI y Schemas v1

## 1. Objetivo
Tener contrato formal validable (no solo ejemplos) para web, API y tests.

## 2. Ubicacion de artefactos
- OpenAPI: `packages/contracts/v1/openapi.yaml`
- JSON Schema request: `packages/contracts/v1/schemas/solve.request.schema.json`
- JSON Schema response: `packages/contracts/v1/schemas/solve.response.schema.json`
- JSON Schema error: `packages/contracts/v1/schemas/error.schema.json`
- JSON Schema health: `packages/contracts/v1/schemas/health.response.schema.json`

## 3. Politica de versionado
- `v1`: estable para MVP.
- Cambios compatibles: agregar campos opcionales.
- Cambios incompatibles: crear `v2` (no romper `v1`).

## 4. Regla de implementacion
- API debe validar request contra schema.
- API debe aplicar despues validaciones semanticas/cross-field desde `packages/domain`.
- Tests de integracion deben validar response contra schema.
- Web debe basarse en este contrato y no en objetos ad-hoc.

## 4.1 Alcance del schema vs dominio
- `packages/contracts` cubre validacion estructural y tipos serializados.
- `packages/domain` cubre reglas de negocio que cruzan colecciones o requieren contexto.
- Ejemplos de validacion de dominio en v1:
  - `days[*].date` unica,
  - cada dia en exactamente un periodo,
  - referencias existentes en `periods` y `availability`,
  - limites operativos (`maxDays`, `maxMedics`, payload, etc.).
- No forzar toda regla semantica en JSON Schema si eso complica innecesariamente el MVP.

## 5. Regla de cambio
Si se edita un schema de `v1`, se debe actualizar en el mismo PR:
1. `docs/30-api/API.md`
2. fixtures `packages/test-data`
3. tests de integracion
