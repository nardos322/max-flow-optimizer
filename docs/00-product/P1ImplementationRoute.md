# P1 Implementation Route - v1.1

## 1. Objetivo
Definir el orden de implementacion de P1 para avanzar sin abrir todos los frentes a la vez.

Fuente funcional:
- `docs/00-product/P1Spec.md`

Regla:
- Si aparece una decision funcional nueva, se actualiza primero `P1Spec.md`.
- Si solo cambia el orden de trabajo, se actualiza este documento.

## 2. Estrategia
Implementar P1 en cortes verticales pequenos, empezando por el nucleo de historial local.

Orden recomendado:
1. P1a backend: contratos + persistencia + endpoints.
2. P1a frontend: vista Historial y restauracion de corridas.
3. P1c: CSV enriquecido actual e historico.
4. P1b: diagnosticos enriquecidos.
5. P1d: comparativa de performance.
6. P1e: Docker compose.
7. Cierre: docs, smoke y checklist.

Motivo:
- El historial define el modelo de datos que usan CSV historico, UI y demo Docker.
- Diagnosticos y performance pueden agregarse despues sin bloquear persistencia.
- Docker conviene al final, cuando API/web ya tienen el comportamiento objetivo.

## 3. Bloque 0 - Preparacion
### T0.1 Revisar estado base
- Confirmar que `main` compila y tests actuales pasan.
- Confirmar binario C++ disponible o documentar prerequisito para tests de API.

DoD:
- Resultado de `pnpm test` registrado en la entrega del bloque.
- Si algun test existente falla, queda documentado antes de tocar P1.

### T0.2 Elegir libreria SQLite
- Agregar dependencia solo en `apps/api`.
- Preferir API simple y sin servicio externo.
- Documentar la decision en el PR si implica binarios nativos.

DoD:
- Dependencia agregada en `apps/api/package.json`.
- `pnpm install` actualiza lockfile.
- No se introduce dependencia de SQLite en `apps/web`.

## 4. Bloque 1 - Contratos P1a
### T1.1 Extender contrato `POST /v1/solve`
- Agregar `metadata` opcional al request.
- Agregar `runId` y `createdAt` opcionales a la response.
- Mantener validos los fixtures v1 sin `metadata`.

DoD:
- Tests de contratos pasan.
- Requests v1 existentes siguen validando.

### T1.2 Agregar contratos de historial
- `RunStatus`.
- `RunSummary`.
- `RunDetail`.
- `RunsListResponse`.
- Query params tipados o validados para `GET /v1/runs`.

DoD:
- Schemas exportados desde `@maxflow/contracts/v1`.
- Tests cubren response valida y status invalido.
- Documentacion API actualizada o referenciada.

## 5. Bloque 2 - Persistencia API P1a
### T2.1 Configuracion
- Agregar `RUNS_DB_PATH`.
- Agregar `RUNS_PERSISTENCE_ENABLED`.
- Actualizar `apps/api/.env.example`.
- Actualizar `docs/50-operations/RuntimeConfig.md`.

DoD:
- Defaults coinciden con `P1Spec.md`.
- Config falla con mensaje claro si una variable booleana es invalida.

### T2.2 Store SQLite
- Crear modulo de acceso a runs.
- Crear tabla e indices al iniciar.
- Implementar insert de corrida.
- Implementar list con `limit`, `offset`, `status`, `instanceId`.
- Implementar get by `runId`.

DoD:
- Tests unitarios o de integracion cubren insert/list/get.
- DB de test usa ruta temporal, no `data/app`.
- La tabla se crea de forma idempotente.

### T2.3 Integrar `POST /v1/solve`
- Generar `runId` y `createdAt`.
- Calcular `inputHash`.
- Persistir input y response.
- Devolver `runId` y `createdAt` si persistencia esta habilitada.
- Respetar `RUNS_PERSISTENCE_ENABLED=false`.

DoD:
- Corrida factible se persiste.
- Corrida infactible se persiste.
- Modo sin persistencia conserva comportamiento compatible.
- Error de escritura responde `500` si persistencia esta habilitada.

## 6. Bloque 3 - Endpoints API P1a
### T3.1 `GET /v1/runs`
- Implementar ruta.
- Validar query params.
- Ordenar por `createdAt DESC`.
- Retornar `pagination.total`.

DoD:
- Paginacion testeada.
- Filtro por `status` testeado.
- Filtro por `instanceId` testeado.

### T3.2 `GET /v1/runs/:runId`
- Implementar ruta.
- Retornar input y response completos.
- Retornar `404` si no existe.

DoD:
- Caso encontrado testeado.
- Caso `404` testeado.
- Response valida contra contratos.

### T3.3 Documentacion API
- Actualizar `docs/30-api/API.md`.
- Actualizar `packages/contracts/v1/openapi.yaml` si sigue publicado como artefacto formal.

DoD:
- Docs muestran request/response de ambos endpoints.
- Docs aclaran compatibilidad de `POST /v1/solve`.

## 7. Bloque 4 - Frontend P1a
### T4.1 Cliente API
- Agregar funciones `listRuns` y `getRun`.
- Tipar respuestas desde contracts.
- Manejar errores con el patron existente.

DoD:
- Tests o mocks cubren path exitoso y error basico.

### T4.2 Estado frontend
- Agregar estado para historial:
  - `runsList`,
  - `selectedRun`,
  - `isLoadingRuns`,
  - `runsError`.
- Agregar acciones del reducer.

DoD:
- Tests de reducer cubren carga, seleccion y error.

### T4.3 Vista `Historial`
- Agregar tab `Historial`.
- Listar corridas recientes.
- Filtrar por status.
- Paginar con `limit/offset`.
- Abrir detalle de corrida.

DoD:
- Estado vacio visible.
- Estado de carga visible.
- Error de API visible.
- Detalle muestra resumen de input y response.

### T4.4 Restaurar corrida
- Agregar accion para reemplazar `instanceDraft` con `run.input`.
- Limpiar `lastSolveResult` y `lastSolveError`.
- Navegar a `Planificador` o dejar accion clara para resolver.

DoD:
- Test confirma que el draft cambia.
- Test confirma que resultado anterior queda invalidado.

### T4.5 Planificador con metadata de corrida
- Mostrar `runId` y `createdAt` si existen.
- Agregar acceso a la corrida historica si el resultado tiene `runId`.

DoD:
- Resultado v1 sin `runId` sigue renderizando.
- Resultado P1 muestra identificador de corrida.

## 8. Bloque 5 - CSV enriquecido P1c
### T5.1 Resultado actual
- Agregar columnas P1:
  - `runId`,
  - `createdAt`,
  - `instanceId`,
  - `status`,
  - `dayId`,
  - `date`,
  - `periodId`,
  - `medicId`,
  - `medicName`,
  - `requiredFlow`,
  - `maxFlow`,
  - `runtimeMs`.

DoD:
- CSV factible actual contiene columnas P1.
- CSV infactible sigue deshabilitado.

### T5.2 Resultado historico
- Exportar CSV desde `run.input` + `run.response`.
- No depender del draft actual.

DoD:
- Test cambia el draft actual y confirma que CSV historico no cambia.

## 9. Bloque 6 - Diagnosticos P1b
### T6.1 Calculo backend
- Agregar capacidad global.
- Agregar dias sin medico disponible.
- Agregar resumen por periodo.
- Agregar medicos sin disponibilidad.

DoD:
- Arrays ordenados por id.
- Campos nuevos aparecen cuando `feasible=false`.
- Casos factibles no incluyen `diagnostics`.

### T6.2 Contratos y docs
- Extender schema de `diagnostics` con campos opcionales.
- Actualizar `docs/30-api/API.md`.

DoD:
- Compatibilidad con snapshots v1 revisada.
- Tests cubren presencia de diagnosticos enriquecidos.

### T6.3 UI
- Mostrar diagnosticos enriquecidos en `DiagnosticsPanel`.
- Mantener fallback para responses v1.

DoD:
- UI renderiza diagnostico v1.
- UI renderiza diagnostico P1 enriquecido.

## 10. Bloque 7 - Performance P1d
### T7.1 Script `analytics:compare`
- Agregar comando en `package.json`.
- Leer fixtures canonicos y datasets generados si existen.
- Ejecutar engine o reutilizar runner analytics existente.
- Escribir JSON y Markdown.

DoD:
- `pnpm analytics:compare` genera:
  - `analytics/reports/performance-comparison.json`,
  - `analytics/reports/performance-comparison.md`.
- El comando no requiere API levantada.

### T7.2 Documentacion
- Actualizar `analytics/README.md`.
- Referenciar reporte desde docs analytics si corresponde.

DoD:
- Comando documentado con prerequisitos y salidas.

## 11. Bloque 8 - Docker compose P1e
### T8.1 Imagenes/servicios
- Agregar `docker-compose.yml`.
- Agregar Dockerfiles si son necesarios.
- API debe encontrar el engine.
- Web debe apuntar a la API.

DoD:
- `docker compose up --build` levanta API y web.
- Healthcheck API responde ok.
- Web carga sin configuracion manual.

### T8.2 Persistencia en volumen
- Montar volumen para `RUNS_DB_PATH`.
- Confirmar que una corrida persiste tras reiniciar containers.

DoD:
- Smoke manual documentado.
- Historial conserva corridas despues de restart.

## 12. Bloque 9 - Cierre P1
### T9.1 Documentacion final
- Actualizar `README.md` si cambia el flujo demo.
- Actualizar `docs/00-product/DemoScript.md`.
- Actualizar `docs/00-product/ReleaseChecklist.md` si P1 agrega checklist.

DoD:
- Demo P1 documentada de punta a punta.

### T9.2 Verificacion final
- Ejecutar suite completa disponible:
  - `pnpm test`,
  - `pnpm build`,
  - lint/typecheck si existen.
- Ejecutar smoke API/web.
- Ejecutar smoke Docker.

DoD:
- Resultados registrados en el cierre.
- Cualquier limitacion queda documentada.

## 13. Criterio de merge por bloque
Cada bloque deberia poder mergearse si:
- no rompe tests existentes,
- incluye tests para comportamiento nuevo,
- actualiza docs tocadas por contrato o runtime,
- mantiene compatibilidad con fixtures v1,
- no mezcla cambios fuera del bloque salvo prerequisitos inevitables.

## 14. Primer PR recomendado
Primer PR:
- Bloque 1 completo.
- Bloque 2 completo.
- Bloque 3 completo.

Razon:
- Deja una API de historial usable y testeada.
- Evita bloquearse en UI antes de cerrar el contrato.
- Permite que el frontend se implemente contra endpoints reales.

Fuera del primer PR:
- UI `Historial`,
- CSV historico,
- diagnosticos enriquecidos,
- Docker compose,
- performance compare.
