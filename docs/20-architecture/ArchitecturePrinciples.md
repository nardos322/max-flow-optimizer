# Principios de Arquitectura (Baja Friccion)

## 1. Objetivo
Permitir evolucionar el proyecto (auth, persistencia, multi-hospital, analitica) sin reescribir el MVP ni romper funcionalidades existentes.

## 2. Principios obligatorios
### 2.1 Contract-first
- `packages/contracts` es la fuente unica de verdad para request/response HTTP estructurales.
- `packages/domain` es la fuente de verdad para validaciones semanticas y reglas cross-field.
- Todo cambio de contrato debe ser versionado (`v1`, `v1.1`, `v2`).
- Evitar breaking changes en la misma version.

### 2.2 Core aislado
- `services/engine-cpp` no depende de API ni frontend.
- El motor recibe input JSON y devuelve output JSON por CLI.
- Cualquier cambio de algoritmo debe preservar el contrato del motor.

### 2.3 API con puertos/adaptadores
- La API define interfaces (puertos) para:
  - ejecutar solver (`SolverRunner`),
  - persistir corridas (`ResultStore`, futuro).
- Implementaciones concretas (adaptadores) se enchufan sin tocar casos de uso.
- El adaptador hacia el engine puede usar un contrato interno distinto del contrato HTTP publico.

### 2.4 Dominio independiente del framework
- Reglas de negocio y validaciones en `packages/domain`.
- `apps/api` solo traduce HTTP <-> dominio.
- `apps/web` solo consume contratos, sin logica de negocio duplicada.

### 2.5 Estado frontend simple y explicito
- `apps/web` mantiene un unico estado global `instanceDraft`.
- Ese estado se implementa con `React Context` + `useReducer`.
- `react-hook-form` se usa para estado local de formularios, no como store global.
- Los formularios confirman cambios al `instanceDraft` mediante acciones del reducer.

### 2.6 Evolucion por modulos opcionales
- Features nuevas (auth, multi-hospital, historial) entran como modulos separados.
- El camino feliz del MVP debe seguir funcionando sin esos modulos.

### 2.7 Determinismo y observabilidad
- Misma instancia => misma salida (orden estable por `dayId`).
- Toda corrida expone metadatos (`runtimeMs`, `nodes`, `edges`).
- Errores estructurados con `code`, `message`, `details`.

### 2.8 Test gate
- No merge sin:
  - tests del motor en verde,
  - tests de integracion API-motor en verde,
  - build exitoso.

## 3. Reglas de cambio
- Cambios en `contracts` requieren actualizar:
  - fixtures de `packages/test-data`,
  - tests de integracion,
  - documentacion API/engine.
- Cambios en algoritmo requieren:
  - mantener invariantes del modelo,
  - agregar/regresar casos de borde.

## 4. Antipatrones a evitar
- Poner validaciones de negocio en controladores Express.
- Hacer que el motor lea directamente base de datos o HTTP.
- Mezclar tipos duplicados entre web/api en lugar de compartir contratos.
- Agregar features v2 sin bandera y sin backlog aprobado.

## 5. Checklist de extension futura
Antes de agregar una feature grande:
1. Definir ADR de la decision.
2. Validar impacto de contrato.
3. Definir tests de regresion.
4. Implementar por modulo aislado.
5. Verificar que MVP sigue intacto.
