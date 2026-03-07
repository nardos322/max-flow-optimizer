# Demo Script (3-5 minutos)

## 1. Objetivo del demo
Mostrar de punta a punta que el sistema:
- valida una instancia,
- resuelve factibilidad con flujo maximo,
- devuelve asignacion valida cuando existe.

## 2. Preparacion previa
- Tener el proyecto corriendo (`web` + `api` + `engine`).
- Tener listos 2 fixtures:
  - `tiny-feasible.json`
  - `tiny-infeasible-availability.json`

## 3. Guion recomendado
### Paso 1 - Contexto rapido (30s)
- Explicar el problema: asignar 1 medico por dia con restricciones de disponibilidad, limite `C` y maximo 1 dia por periodo.
- Mencionar que se modela como red de flujo.

### Paso 2 - Caso factible (90s)
- Cargar `tiny-feasible.json` en la UI.
- Ejecutar `POST /v1/solve`.
- Mostrar:
  - `feasible=true`,
  - tabla `dayId -> medicId`,
  - metricas (`maxFlow`, `runtimeMs`, `nodes`, `edges`).
- Validar visualmente 1 restriccion (ej: nadie supera `C`).

### Paso 3 - Caso infactible (90s)
- Cargar `tiny-infeasible-availability.json`.
- Ejecutar solucion.
- Mostrar:
  - `feasible=false`,
  - `maxFlow < requiredFlow`,
  - `diagnostics.uncoveredDays`.

### Paso 4 - Cierre tecnico (60s)
- Mostrar estructura monorepo y separacion de responsabilidades:
  - `services/engine-cpp`
  - `apps/api`
  - `apps/web`
  - `packages/contracts`
- Mencionar pruebas y quality gates de CI.

## 4. Mensajes clave para portfolio
- "El modelo matematico esta formalizado y probado."
- "El motor C++ es reusable e independiente de la API."
- "La demo es reproducible con casos factible/infactible."

