# Ruta de Implementacion (Tareas Ejecutables)

## Regla de ejecucion
- Completar bloques en orden.
- No abrir tareas de otro bloque si el bloque actual no esta en verde.
- Todo cambio debe incluir test o justificacion explicita.
- Marcar una tarea como completada solo cuando su DoD este cumplido.

## Estado por bloque
- [x] Bloque 0 - Bootstrap Monorepo
- [x] Bloque 1 - Contratos y Fixtures
- [x] Bloque 2 - Motor C++
- [x] Bloque 3 - API
- [ ] Bloque 3.5 - Migracion contracts a Zod
- [ ] Bloque 4 - Web MVP
- [ ] Bloque 5 - Calidad y cierre

## Bloque 0 - Bootstrap Monorepo (Dia 1)
### [x] T0.1 Workspace y scripts base
- Crear `pnpm-workspace.yaml`, `package.json` raiz y scripts `dev/test/build`.
- DoD: comandos base ejecutan sin error aunque haya modulos vacios.

### [x] T0.2 Scaffold apps y packages
- Inicializar `apps/api`, `apps/web`, `packages/contracts`, `packages/domain`, `packages/test-data`.
- DoD: estructura compila en seco (`build`) y tests vacios pasan.

### [x] T0.3 Scaffold engine C++
- Crear `CMakeLists.txt` raiz en `services/engine-cpp`.
- Configurar target del binario y target de tests GTest.
- DoD: `cmake --build` funciona y ejecuta al menos una suite minima en `GoogleTest`.

## Bloque 1 - Contratos y Fixtures (Dia 2)
### [x] T1.1 Contrato JSON v1
- Implementar schemas en `packages/contracts`.
- DoD: request/response estructurales de `docs/30-api/API.md` validan correctamente.

### [x] T1.2 Validaciones de dominio
- Implementar invariantes en `packages/domain`.
- Validar reglas cross-field y limites operativos que no viven solo en schema.
- DoD: errores mapeados a codigos de `docs/30-api/ErrorCatalog.md`.

### [x] T1.3 Fixtures canonicos
- Crear `packages/test-data/input/*` y `expected/*`.
- Agregar `fixtures.manifest.json` recomendado para categorizar fixtures y modo de asercion.
- DoD: `packages/test-data` cubre el set canonico definido en `docs/40-quality/TestPlan.md`, con snapshots exactos para casos `feasible`, `infeasible` e `invalid` segun corresponda.

## Bloque 2 - Motor C++ (Dias 3-4)
### [x] T2.1 Modelo de grafo interno
- Estructuras para nodos, aristas y residual.
- DoD: tests unitarios de construccion de red en verde.

### [x] T2.2 Edmonds-Karp
- BFS de caminos aumentantes + actualizacion de flujo.
- DoD: test de maxflow sobre grafos pequenos conocidos.

### [x] T2.3 Adaptador problema -> red
- Mapear instancia (medico/periodo/dia) a red segun `docs/10-model/Model.md`.
- DoD: constraints quedan reflejadas por capacidades correctas.

### [x] T2.4 Extraccion de asignaciones
- Reconstruir `assignments` desde arcos con flujo 1.
- DoD: salida determinista ordenada por `dayId`.

### [x] T2.5 CLI I/O y errores
- `--input` y `--stdin`, stdout JSON, stderr JSON de error.
- DoD: cumple `docs/20-architecture/EngineSpec.md` y codigos de salida.

## Bloque 3 - API (Dia 5)
### [x] T3.1 Endpoints v1
- Implementar `GET /health` y `POST /v1/solve`.
- DoD: contrato de `docs/30-api/API.md` cumplido.

### [x] T3.2 Integracion con engine
- Ejecutar binario C++ desde API y parsear salida.
- Enviar wrapper interno `{ requestId, input }` por stdin al engine.
- DoD: errores del motor mapeados a `ENGINE_*` y correlacion por `requestId` disponible en logs.

### [x] T3.3 Tests API/integracion
- Supertest para validaciones y casos factible/infactible.
- DoD: tests con fixtures canonicos en verde.

## Bloque 3.5 - Migracion contracts a Zod
### [ ] T3.5.1 Schemas Zod en contracts
- Agregar `zod` a `packages/contracts`.
- Definir schemas Zod para request, response, error y health en `packages/contracts/src/v1`.
- Exportar tipos derivados con `z.infer`.
- DoD: tests de `packages/contracts` cubren payloads validos e invalidos sin AJV.

### [ ] T3.5.2 API consume contracts Zod
- Reemplazar validacion estructural AJV por helpers basados en Zod.
- Mantener la capa `packages/domain` despues de la validacion estructural.
- Normalizar errores Zod al formato de error v1.
- DoD: tests de API siguen cubriendo schema invalido, dominio invalido, factible e infactible.

### [ ] T3.5.3 Limpieza y artefactos formales
- Eliminar `ajv` y `ajv-formats` si ya no hay uso.
- Decidir si OpenAPI/JSON Schema queda generado desde Zod o como artefacto estatico temporal.
- Actualizar README de `packages/contracts`.
- DoD: `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` pasan.

## Bloque 4 - Web MVP (Dia 6)
### [ ] T4.1 Navegacion y estado compartido
- Implementar navegacion simple entre `Periodos`, `Medicos` y `Planificador`.
- Centralizar en frontend un unico estado de instancia editable por las tres vistas.
- Implementar ese estado global con `React Context` + `useReducer`.
- Agregar accion de carga de fixture base para poblar la UI rapidamente.
- DoD: cambiar de seccion no pierde datos y el fixture factible queda visible en las 3 vistas segun `docs/00-product/FrontendSpec.md`.

### [ ] T4.2 Captura de datos por seccion
- Implementar formularios/tablas para crear `periods`, `days`, `medics` y `availability`.
- Basar formularios en `react-hook-form` con schemas importados desde `@maxflow/contracts`.
- Implementar `availability` con UI por medico, dias agrupados por periodo y seleccion por checkbox.
- Mostrar errores locales de campos requeridos y referencias obvias antes de resolver.
- DoD: un usuario puede armar una instancia valida sin editar JSON crudo y los componentes siguen el contrato de `docs/00-product/FrontendSpec.md`.

### [ ] T4.3 Planificador, resultado y exportacion
- Mostrar resumen de la instancia, boton resolver, estado `feasible`, tabla de asignaciones y metricas.
- Mostrar diagnostico minimo en infactible.
- Export JSON/CSV del resultado.
- Generar CSV uniendo `assignments` con el `instanceDraft` actual.
- DoD: flujo completo manual `Periodos` -> `Medicos` -> `Planificador` funciona con caso factible e infactible y las descargas contienen contenido correcto segun `docs/00-product/FrontendSpec.md`.

## Bloque 5 - Calidad y cierre (Dia 7)
### [ ] T5.1 CI minima
- Pipeline `lint -> test -> build`.
- DoD: bloquea merge en fallo.

### [ ] T5.2 Hardening
- Manejo de edge cases y mensajes claros de error.
- Ejecutar smoke con fixtures canonicos y benchmark local segun `docs/40-quality/BenchmarkProtocol.md`.
- DoD: smoke completo con `tiny` + `medium`, y benchmark local documentado sin violar limites de `docs/40-quality/NonFunctionalLimits.md`.

### [ ] T5.3 Portfolio pack
- README final, diagrama, capturas/gif y guion de demo.
- DoD: checklist `docs/00-product/ReleaseChecklist.md` completo.

## Orden de dependencias
1. Bloque 0
2. Bloque 1
3. Bloque 2
4. Bloque 3
5. Bloque 3.5
6. Bloque 4
7. Bloque 5

## Criterio de avance
- Un bloque solo se marca completado cuando todas sus tareas cumplen DoD.
- Si aparece una idea nueva: va a `docs/00-product/BACKLOG.md` (P1/P2), no rompe la ruta.
