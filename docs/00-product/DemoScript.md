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
- Mostrar que la UI esta separada en `Periodos`, `Medicos` y `Planificador`.

### Paso 2 - Armado del caso factible (90s)
- Cargar `tiny-feasible.json` usando `Fixture OK`, importando JSON o poblando manualmente la UI.
- En `Periodos`, mostrar periodos y dias.
- En `Medicos`, mostrar medicos y disponibilidad.
- En `Planificador`, verificar el resumen consolidado de la instancia.

### Paso 3 - Resolver caso factible (60s)
- Ejecutar `POST /v1/solve` desde `Planificador`.
- Mostrar:
  - `feasible=true`,
  - tabla `dayId -> medicId`,
  - metricas (`maxFlow`, `runtimeMs`, `nodes`, `edges`).
- Validar visualmente 1 restriccion (ej: nadie supera `C`).
- Mostrar export JSON/CSV.

### Paso 4 - Caso infactible (90s)
- Cargar `tiny-infeasible-availability.json` usando `Fixture KO` o importando JSON.
- Recorrer rapido `Periodos` y `Medicos` para mostrar que la entrada cambio.
- Ejecutar solucion desde `Planificador`.
- Mostrar:
  - `feasible=false`,
  - `maxFlow < requiredFlow`,
  - `diagnostics.uncoveredDays`.

### Paso 5 - Cierre tecnico (60s)
- Mostrar estructura monorepo y separacion de responsabilidades:
  - `services/engine-cpp`
  - `apps/api`
  - `apps/web`
  - `packages/contracts`
- Mencionar pruebas, smoke local y quality gates de CI.

## 4. Mensajes clave para portfolio
- "El modelo matematico esta formalizado y probado."
- "El motor C++ es reusable e independiente de la API."
- "La demo es reproducible con casos factible/infactible."
