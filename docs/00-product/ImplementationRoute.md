# Ruta de Implementacion (Tareas Ejecutables)

## Regla de ejecucion
- Completar bloques en orden.
- No abrir tareas de otro bloque si el bloque actual no esta en verde.
- Todo cambio debe incluir test o justificacion explicita.
- Marcar una tarea como completada solo cuando su DoD este cumplido.

## Estado por bloque
- [ ] Bloque 0 - Bootstrap Monorepo
- [ ] Bloque 1 - Contratos y Fixtures
- [ ] Bloque 2 - Motor C++
- [ ] Bloque 3 - API
- [ ] Bloque 4 - Web MVP
- [ ] Bloque 5 - Calidad y cierre

## Bloque 0 - Bootstrap Monorepo (Dia 1)
### [ ] T0.1 Workspace y scripts base
- Crear `pnpm-workspace.yaml`, `package.json` raiz y scripts `dev/test/build`.
- DoD: comandos base ejecutan sin error aunque haya modulos vacios.

### [ ] T0.2 Scaffold apps y packages
- Inicializar `apps/api`, `apps/web`, `packages/contracts`, `packages/domain`.
- DoD: estructura compila en seco (`build`) y tests vacios pasan.

### [ ] T0.3 Scaffold engine C++
- Crear `CMakeLists.txt` raiz en `services/engine-cpp`.
- Configurar target del binario y target de tests GTest.
- DoD: `cmake --build` funciona y ejecuta test dummy.

## Bloque 1 - Contratos y Fixtures (Dia 2)
### [ ] T1.1 Contrato JSON v1
- Implementar schemas en `packages/contracts`.
- DoD: request/response de `docs/30-api/API.md` validan correctamente.

### [ ] T1.2 Validaciones de dominio
- Implementar invariantes en `packages/domain`.
- DoD: errores mapeados a codigos de `docs/30-api/ErrorCatalog.md`.

### [ ] T1.3 Fixtures canonicos
- Crear `packages/test-data/input/*` y `expected/*`.
- DoD: fixtures cubren 4 casos tiny (factible + 3 infactibles).

## Bloque 2 - Motor C++ (Dias 3-4)
### [ ] T2.1 Modelo de grafo interno
- Estructuras para nodos, aristas y residual.
- DoD: tests unitarios de construccion de red en verde.

### [ ] T2.2 Edmonds-Karp
- BFS de caminos aumentantes + actualizacion de flujo.
- DoD: test de maxflow sobre grafos pequenos conocidos.

### [ ] T2.3 Adaptador problema -> red
- Mapear instancia (medico/periodo/dia) a red segun `docs/10-model/Model.md`.
- DoD: constraints quedan reflejadas por capacidades correctas.

### [ ] T2.4 Extraccion de asignaciones
- Reconstruir `assignments` desde arcos con flujo 1.
- DoD: salida determinista ordenada por `dayId`.

### [ ] T2.5 CLI I/O y errores
- `--input` y `--stdin`, stdout JSON, stderr JSON de error.
- DoD: cumple `docs/20-architecture/EngineSpec.md` y codigos de salida.

## Bloque 3 - API (Dia 5)
### [ ] T3.1 Endpoints v1
- Implementar `GET /health` y `POST /v1/solve`.
- DoD: contrato de `docs/30-api/API.md` cumplido.

### [ ] T3.2 Integracion con engine
- Ejecutar binario C++ desde API y parsear salida.
- DoD: errores del motor mapeados a `ENGINE_*`.

### [ ] T3.3 Tests API/integracion
- Supertest para validaciones y casos factible/infactible.
- DoD: tests con fixtures canonicos en verde.

## Bloque 4 - Web MVP (Dia 6)
### [ ] T4.1 Pantalla unica
- Input JSON + boton resolver + panel de resultado.
- DoD: flujo completo manual con fixture factible.

### [ ] T4.2 Visualizacion de salida
- Estado `feasible`, tabla de asignaciones y metricas.
- DoD: estado infactible muestra diagnostico minimo.

### [ ] T4.3 Exportacion
- Export JSON/CSV del resultado.
- DoD: archivos descargan con contenido correcto.

## Bloque 5 - Calidad y cierre (Dia 7)
### [ ] T5.1 CI minima
- Pipeline `lint -> test -> build`.
- DoD: bloquea merge en fallo.

### [ ] T5.2 Hardening
- Manejo de edge cases y mensajes claros de error.
- DoD: smoke completo con tiny + medium.

### [ ] T5.3 Portfolio pack
- README final, diagrama, capturas/gif y guion de demo.
- DoD: checklist `docs/00-product/ReleaseChecklist.md` completo.

## Orden de dependencias
1. Bloque 0
2. Bloque 1
3. Bloque 2
4. Bloque 3
5. Bloque 4
6. Bloque 5

## Criterio de avance
- Un bloque solo se marca completado cuando todas sus tareas cumplen DoD.
- Si aparece una idea nueva: va a `docs/00-product/BACKLOG.md` (P1/P2), no rompe la ruta.
