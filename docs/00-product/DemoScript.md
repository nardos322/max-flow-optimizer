# Demo Script v1.1 (5-7 minutos)

## 1. Objetivo del demo
Mostrar de punta a punta que el sistema:
- valida una instancia,
- resuelve factibilidad con flujo maximo,
- devuelve asignacion valida cuando existe,
- persiste corridas localmente,
- permite consultar historial y restaurar una corrida,
- explica casos infactibles con diagnosticos enriquecidos.

## 2. Preparacion previa
- Tener el proyecto corriendo (`web` + `api` + `engine`).
- Confirmar que `RUNS_PERSISTENCE_ENABLED=true`.
- Tener listos 2 fixtures:
  - `tiny-feasible.json`
  - `tiny-infeasible-availability.json`
- Opcional para demo one-command: correr con `docker compose up --build`.

## 3. Guion recomendado
### Paso 1 - Contexto rapido (30s)
- Explicar el problema: asignar 1 medico por dia con restricciones de disponibilidad, limite `C` y maximo 1 dia por periodo.
- Mencionar que se modela como red de flujo.
- Mostrar que la UI esta separada en `Periodos`, `Medicos`, `Planificador` e `Historial`.

### Paso 2 - Armado del caso factible (90s)
- Cargar `tiny-feasible.json` usando `Fixture OK`, importando JSON o poblando manualmente la UI.
- En `Periodos`, mostrar periodos y dias.
- En `Medicos`, mostrar medicos y disponibilidad.
- En `Planificador`, verificar el resumen consolidado de la instancia.

### Paso 3 - Resolver caso factible (60s)
- Ejecutar `POST /v1/solve` desde `Planificador`.
- Mostrar:
  - `feasible=true`,
  - `runId` y `createdAt`,
  - tabla `dayId -> medicId`,
  - metricas (`maxFlow`, `runtimeMs`, `nodes`, `edges`).
- Validar visualmente 1 restriccion (ej: nadie supera `C`).
- Mostrar export JSON/CSV con columnas P1.

### Paso 4 - Historial y restauracion (90s)
- Ir a `Historial`.
- Mostrar la corrida persistida con `createdAt`, `instanceId`, estado, flujo y runtime.
- Abrir el detalle.
- Mostrar que el detalle conserva `input` y `response` completos.
- Exportar CSV historico.
- Usar `Usar como borrador` y volver al `Planificador`.
- Explicar que el resultado anterior queda invalidado porque el draft restaurado es la fuente actual.

### Paso 5 - Caso infactible (90s)
- Cargar `tiny-infeasible-availability.json` usando `Fixture KO` o importando JSON.
- Recorrer rapido `Periodos` y `Medicos` para mostrar que la entrada cambio.
- Ejecutar solucion desde `Planificador`.
- Mostrar:
  - `feasible=false`,
  - `runId` y `createdAt`,
  - `maxFlow < requiredFlow`,
  - `diagnostics.uncoveredDays`,
  - `diagnostics.capacity`,
  - `diagnostics.daysWithoutAvailability`,
  - resumen por periodo si aparece.

### Paso 6 - Cierre tecnico (60s)
- Mostrar estructura monorepo y separacion de responsabilidades:
  - `services/engine-cpp`
  - `apps/api`
  - `apps/web`
  - `packages/contracts`
- Mencionar SQLite local para historial y volumen persistente en Docker Compose.
- Mencionar pruebas, smoke local y quality gates de CI.
- Mencionar `pnpm analytics:compare` como reporte reproducible de performance.

## 4. Mensajes clave para portfolio
- "El modelo matematico esta formalizado y probado."
- "El motor C++ es reusable e independiente de la API."
- "El historial hace que la demo sea reproducible y auditable localmente."
- "Los diagnosticos explican por que una instancia no se puede cubrir."
- "La demo es reproducible con casos factible/infactible y Docker Compose."

## 5. Artefacto visual
- Imagen del flujo completo: `docs/00-product/assets/demo-flow.png`.
