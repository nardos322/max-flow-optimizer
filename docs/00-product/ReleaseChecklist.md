# Release Checklist

## MVP v1
### 1. Funcionalidad
- [x] `GET /health` responde `200`.
- [x] `POST /v1/solve` resuelve caso factible.
- [x] `POST /v1/solve` reporta caso infactible correctamente.
- [x] UI expone `Periodos`, `Medicos` y `Planificador`.
- [x] La UI conserva el estado al navegar entre secciones.
- [x] `Planificador` muestra resultado y metricas.
- [x] Export JSON/CSV funciona.

### 2. Correctitud del modelo
- [x] Restriccion `C` validada en salidas factibles.
- [x] Restriccion maximo 1 dia por periodo por medico validada.
- [x] Ningun medico asignado fuera de disponibilidad.
- [x] `maxFlow == requiredFlow` en casos factibles.

### 3. Calidad tecnica
- [x] Lint en verde.
- [x] Tests de motor en verde.
- [x] Tests de API/integracion en verde.
- [x] Build completo en verde.

### 4. Documentacion
- [x] README principal con instrucciones de run local.
- [x] Demo script actualizado.
- [x] API contract actualizado.
- [x] Error catalog actualizado.

### 5. Portfolio readiness
- [x] Capturas o GIF del flujo completo.
- [x] Descripcion corta del problema y solucion en repo.
- [x] Seccion "arquitectura" con diagrama simple.
- [x] Seccion "tradeoffs y mejoras futuras" (v1.1/v2).

### 6. Criterio de salida
Se publica v1 solo si todos los checks anteriores estan completos.

## v1.1 / P1
### 1. Funcionalidad
- [x] `POST /v1/solve` devuelve `runId` y `createdAt` cuando `RUNS_PERSISTENCE_ENABLED=true`.
- [x] Corridas factibles e infactibles se persisten en SQLite por default.
- [x] `GET /v1/runs` lista historial con paginacion y filtros.
- [x] `GET /v1/runs/:runId` devuelve input y response completos.
- [x] UI expone seccion `Historial`.
- [x] Una corrida historica puede restaurarse como borrador.
- [x] CSV enriquecido funciona para resultado actual e historico.
- [x] Diagnosticos P1 se muestran para casos infactibles.
- [x] `pnpm analytics:compare` genera reporte local.
- [x] Docker Compose esta configurado con volumen persistente para SQLite.

### 2. Contratos y documentacion
- [x] Schemas de historial exportados desde `@maxflow/contracts/v1`.
- [x] `metadata` opcional en request y `runId`/`createdAt` opcionales en response mantienen compatibilidad v1.
- [x] `docs/30-api/API.md` documenta endpoints de historial, diagnosticos P1 y CSV P1.
- [x] `docs/50-operations/RuntimeConfig.md` documenta variables de persistencia.
- [x] `docs/50-operations/LocalRunbook.md` documenta Docker Compose y persistencia local.
- [x] README actualizado para estado v1.1.
- [x] Demo script actualizado para Historial, restauracion y diagnosticos enriquecidos.

### 3. Calidad tecnica
- [x] `pnpm test` en verde.
- [x] `pnpm build` en verde.
- [x] `pnpm lint` en verde.
- [x] `pnpm typecheck` en verde.
- [x] `pnpm analytics:compare` en verde.

### 4. Smoke manual pendiente
- [ ] `docker compose up --build` levanta API y web.
- [ ] Healthcheck API responde ok dentro de Docker Compose.
- [ ] Resolver fixture desde web persiste una corrida.
- [ ] Historial muestra la corrida persistida.
- [ ] La corrida persiste tras `docker compose down` y nuevo `docker compose up`.

Nota: el smoke Docker queda pendiente porque el entorno WSL usado para esta revision no tiene Docker disponible.

### 5. Criterio de salida
P1 esta cerrada a nivel codigo y documentacion cuando los checks anteriores estan completos. Para publicarla como release demostrable, ejecutar y marcar el smoke Docker manual en una maquina con Docker activo.

## P2 - Optimization v2
### 1. Funcionalidad
- [x] `POST /v1/solve` mantiene compatibilidad cuando no recibe `optimization`.
- [x] `POST /v1/solve` acepta `optimization.objective='fairness'`.
- [x] El engine usa min-cost max-flow para equidad sin relajar restricciones duras.
- [x] La response factible optimizada devuelve `optimization` con `score`, `totalCost`, `spread`, cargas min/max y `loadByMedic`.
- [x] La response infactible no emite `optimization`.
- [x] La UI permite elegir `Factibilidad` o `Equidad`.
- [x] La UI muestra metricas y distribucion por medico cuando existe `optimization`.
- [x] Export JSON conserva la response completa.
- [x] Export CSV agrega columnas P2 cuando existen metricas.
- [x] Historial conserva request/response optimizados y muestra `objective`/`spread` en detalle.

### 2. Contratos y fixtures
- [x] Schemas request/response documentan `optimization`.
- [x] OpenAPI documenta `optimization`.
- [x] `fairness-balanced-choice` valida request y response P2.
- [x] La comparativa local demuestra mejora de `spread` en `fairness-balanced-choice`: `none=2`, `fairness=1`.

### 3. Analytics y performance
- [x] `pnpm analytics:compare` genera filas separadas por `objective`.
- [x] El reporte Markdown distingue `none` y `fairness`.
- [x] El JSON incluye `optimizationScore`, `optimizationTotalCost`, `spread`, cargas min/max y `loadByMedic`.
- [x] La corrida local P2 mantiene `large-random-200x200` fairness dentro de 1s de engine (`678 ms` en la ultima medicion local).

### 4. Calidad tecnica
- [x] `pnpm test` en verde.
- [x] `pnpm build` en verde.
- [x] `pnpm lint` en verde.
- [x] `pnpm typecheck` en verde.
- [x] `pnpm analytics:compare` en verde.

### 5. Documentacion
- [x] README actualizado para estado P2.
- [x] Demo script explica diferencia entre factibilidad y optimizacion.
- [x] Benchmark report documenta comparativa P2.

### 6. Pendiente operativo
- [ ] Smoke manual Docker Compose con flujo P2 completo.

Nota: el smoke Docker sigue pendiente por disponibilidad del entorno Docker, igual que en P1.
