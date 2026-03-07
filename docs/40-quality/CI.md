# CI Quality Gates - MVP v1

## 1. Objetivo
Bloquear merges que rompan comportamiento, contratos o build del MVP.

## 2. Pipeline minimo obligatorio
1. `lint`
2. `test`
3. `build`

## 3. Gates por etapa
### Lint
- TypeScript sin errores de tipos.
- Estilo/linting sin errores bloqueantes.

### Test
- Motor C++:
  - unit tests (Edmonds-Karp, armado de red, extraccion de asignaciones).
- API:
  - tests de validacion de input.
  - tests de integracion API <-> engine.
- Regresion:
  - fixtures canonicos de `packages/test-data`.

### Build
- Compilacion C++ exitosa.
- Build de API y frontend exitosa.

## 4. Politica de merge
- Ningun PR se mergea con algun gate en rojo.
- Cambios de contrato obligan actualizacion de tests y docs en el mismo PR.

## 5. Metricas minimas recomendadas
- Tiempo total de pipeline visible por PR.
- Reporte de pruebas fallidas con caso concreto.
- Cobertura opcional para v1 (recomendada para v1.1).

## 6. Expansiones para v1.1
- Matriz de builds por sistema operativo.
- Cache de dependencias.
- Publicacion automatica de artefactos de demo.

