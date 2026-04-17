# Traceability Matrix - Tareas vs Tests

## 1. Objetivo
Vincular cada tarea de implementacion con evidencia de prueba para evitar huecos.

## 2. Matriz
| Tarea | Tipo de prueba | Evidencia minima |
|---|---|---|
| `T0.1` Workspace y scripts | Smoke comandos | `pnpm dev/test/build` ejecutan sin fallo estructural |
| `T0.2` Scaffold apps/packages | Build smoke | build por paquete en verde |
| `T0.3` Scaffold engine | Unit dummy | `ctest` ejecuta test dummy |
| `T1.1` Contrato JSON | Contract tests | validacion contra schemas `v1` |
| `T1.2` Validaciones dominio | Unit tests | casos invalidos mapean `code` correcto |
| `T1.3` Fixtures canonicos | Golden tests | `fixtures.manifest.json` coherente + snapshots exactos para casos canonicos `feasible`, `infeasible` e `invalid` |
| `T2.1` Grafo interno | Unit tests C++ | conteo de nodos/aristas y capacidades esperadas |
| `T2.2` Edmonds-Karp | Unit tests C++ | maxflow correcto en grafos conocidos |
| `T2.3` Adaptador problema->red | Unit tests C++ | restricciones `C`, disponibilidad y periodo cubiertas |
| `T2.4` Extraccion asignaciones | Unit tests C++ | asignaciones deterministas por `dayId` |
| `T2.5` CLI I/O | Integration tests engine | stdout/stderr + exit code correctos |
| `T3.1` Endpoints API | API tests | `GET /health` y `POST /v1/solve` |
| `T3.2` Integracion engine | API integration | manejo de timeout, exit code, parse errors, correlacion `requestId` y logs de request |
| `T3.3` Tests API | API integration | casos tiny factible/infactibles en verde |
| `T4.1` Navegacion y estado compartido | E2E smoke | navegar entre `Periodos`, `Medicos` y `Planificador` sin perder datos |
| `T4.2` Captura de datos por seccion | UI tests/smoke | carga valida de periodos, dias, medicos y disponibilidad sin JSON crudo |
| `T4.3` Planificador, resultado y exportacion | UI tests/smoke | resolver caso factible/infactible y descargar JSON/CSV valida |
| `T5.1` CI | Pipeline checks | lint+test+build bloquean merge |
| `T5.2` Hardening | Regression suite + benchmark | smoke `tiny` + `medium` en verde y benchmark local ejecutado segun `BenchmarkProtocol.md` |
| `T5.3` Portfolio pack | Manual checklist | `ReleaseChecklist.md` completo |

## 3. Regla de cierre de tarea
No marcar `[x]` en `ImplementationRoute` sin evidencia de test correspondiente en esta matriz.
