# Contrato Formal v1

## 1. Objetivo
Tener contrato formal validable (no solo ejemplos) para web, API y tests.

## 2. Ubicacion de artefactos
- Fuente primaria: schemas Zod en `packages/contracts/src/v1`.
- Tipos TypeScript: exportados desde `@maxflow/contracts` y `@maxflow/contracts/v1`.
- OpenAPI/JSON Schema: artefactos derivados o documentacion formal, no fuente primaria despues de la migracion a Zod.
- Estrategia de validacion: `docs/30-api/ValidationStrategy.md`.

## 3. Politica de versionado
- `v1`: estable para MVP.
- Cambios compatibles: agregar campos opcionales.
- Cambios incompatibles: crear `v2` (no romper `v1`).

## 4. Regla de implementacion
- API debe validar request contra el schema Zod de `packages/contracts`.
- API debe aplicar despues validaciones semanticas/cross-field desde `packages/domain`.
- Tests de integracion deben validar response contra el contrato exportado por `packages/contracts`.
- Web debe importar schemas/tipos desde `@maxflow/contracts` y no usar objetos ad-hoc.

## 4.1 Alcance del schema vs dominio
- `packages/contracts` cubre validacion estructural y tipos serializados.
- `packages/domain` cubre reglas de negocio que cruzan colecciones o requieren contexto.
- Ejemplos de validacion de dominio en v1:
  - `days[*].date` unica,
  - cada dia en exactamente un periodo,
  - referencias existentes en `periods` y `availability`,
  - limites operativos (`maxDays`, `maxMedics`, payload, etc.).
- No forzar toda regla semantica en Zod si eso mezcla contrato HTTP con reglas de negocio.

## 5. Regla de cambio
Si se edita un schema de `v1`, se debe actualizar en el mismo PR:
1. `docs/30-api/API.md`
2. fixtures `packages/test-data`
3. tests de integracion
4. artefactos OpenAPI/JSON Schema si siguen publicandose
