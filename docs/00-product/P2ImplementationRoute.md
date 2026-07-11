# P2 Implementation Route - Optimization v2

## 1. Objetivo
Definir el orden de implementacion de P2a para agregar optimizacion por equidad usando min-cost max-flow sin romper P1.

Fuente funcional:
- `docs/00-product/P2Spec.md`

Regla:
- Si cambia el alcance funcional, actualizar primero `P2Spec.md`.
- Si solo cambia el orden de trabajo, actualizar este documento.

## 2. Estrategia
Implementar P2a en cortes verticales con compatibilidad estricta:

1. Contratos y fixtures.
2. Modelo formal y algoritmo min-cost max-flow.
3. Engine C++ con tests.
4. Integracion API.
5. UI y exportaciones.
6. Historial y analytics.
7. Cierre documental y release.

Motivo:
- El contrato fija la superficie publica antes de tocar motor.
- El algoritmo es el mayor riesgo tecnico y debe cerrarse con fixtures pequenos.
- UI e historial deben consumir campos opcionales sin romper responses P1.

## 3. Bloque 0 - Preparacion
### T0.1 Congelar baseline P1
- Confirmar rama base con P1 completa.
- Ejecutar:
  - `pnpm test`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm typecheck`

DoD:
- Resultado registrado en el PR.
- Cualquier falla previa queda documentada antes de iniciar P2.

### T0.2 Definir fixture objetivo
- Crear al menos un caso donde haya multiples asignaciones factibles.
- Definir expected output para `objective='none'`.
- Definir expected output o invariantes para `objective='fairness'`.

DoD:
- Fixture documenta por que la optimizacion debe cambiar o mejorar la solucion.

## 4. Bloque 1 - Contratos P2a
### T1.1 Extender request
- Agregar `optimization` opcional.
- Soportar `objective='none' | 'fairness'`.
- Mantener validos todos los fixtures P1 sin `optimization`.

DoD:
- Tests de contratos cubren ausencia de `optimization`.
- Tests de contratos cubren `fairness`.
- Tests rechazan objetivos desconocidos.

### T1.2 Extender response
- Agregar `optimization` opcional.
- Definir schema para:
  - `objective`,
  - `optimal`,
  - `score`,
  - `totalCost`,
  - `maxAssignedDays`,
  - `minAssignedDays`,
  - `spread`,
  - `loadByMedic`.

DoD:
- Response P1 sigue validando.
- Response P2 factible valida.
- Orden de `loadByMedic` documentado y testeado.

### T1.3 Actualizar docs API
- Actualizar `docs/30-api/API.md`.
- Actualizar `packages/contracts/v1/openapi.yaml`.

DoD:
- Request/response de optimizacion aparecen documentados.
- Compatibilidad con P1 queda explicita.

## 5. Bloque 2 - Modelo y algoritmo
### T2.1 Formalizar funcion de costo
- Actualizar `docs/10-model/Model.md`.
- Definir costos marginales crecientes por carga de medico.
- Definir desempates deterministas.

DoD:
- La funcion de costo es implementable y testeable.
- Queda claro que las restricciones duras no cambian.

### T2.2 Disenar min-cost max-flow
- Elegir algoritmo concreto.
- Definir tipos de capacidad y costo.
- Definir comportamiento ante costos negativos si se permiten en futuro.

Recomendacion inicial:
- Successive shortest augmenting path con potenciales.
- Capacidades enteras.
- Costos enteros no negativos para P2a.

DoD:
- Complejidad esperada documentada.
- Limites P1 revisados contra runtime esperado.

## 6. Bloque 3 - Engine C++
### T3.1 Implementar estructura min-cost max-flow
- Agregar modulo C++ dedicado.
- Tests unitarios con grafos pequenos.

DoD:
- Calcula flujo maximo y costo minimo en casos canonicos.
- Maneja empates de forma deterministica.

### T3.2 Integrar modelo de asignacion
- Si `objective='none'`, mantener camino actual.
- Si `objective='fairness'`, construir red con costos marginales.
- Extraer asignaciones desde el flujo resultante.

DoD:
- Fixtures P1 mantienen snapshots.
- Fixture P2 fairness mejora metrica esperada.
- Restricciones duras se validan en tests.

### T3.3 Extender CLI engine
- Aceptar `optimization` en input JSON.
- Emitir `optimization` en output JSON cuando corresponde.

DoD:
- CLI tests cubren modo sin optimizacion y fairness.
- Salida sigue siendo JSON deterministico.

## 7. Bloque 4 - API
### T4.1 Propagar contrato
- Validar `optimization` en request.
- Pasar input completo al engine.
- Validar response contra schema.

DoD:
- API test cubre request P2.
- API test confirma que P1 no cambia sin `optimization`.

### T4.2 Persistencia de historial
- Confirmar que request/response P2 quedan guardados sin migracion destructiva.
- Revisar si summaries necesitan columnas nuevas.

DoD:
- `GET /v1/runs/:runId` devuelve `optimization`.
- `GET /v1/runs` no rompe si no expone metricas P2.

## 8. Bloque 5 - Frontend
### T5.1 Control de modo
- Agregar selector `Factibilidad` / `Equidad`.
- Default: `Factibilidad`.
- Enviar `optimization.objective='fairness'` solo cuando el usuario elige equidad.

DoD:
- Draft existing sin campo nuevo sigue funcionando.
- Test de estado cubre cambio de modo.

### T5.2 Mostrar metricas
- Agregar panel de distribucion por medico.
- Mostrar `score`, `spread`, `maxAssignedDays`, `minAssignedDays`.
- Mantener fallback si `optimization` no existe.

DoD:
- UI renderiza response P1.
- UI renderiza response P2.

### T5.3 Exportaciones
- Agregar columnas P2 al CSV cuando existan.
- Export JSON conserva response completa.

DoD:
- Tests cubren CSV P1 y CSV P2.

## 9. Bloque 6 - Analytics
### T6.1 Comparativa
- Extender escenarios de analytics con modo fairness.
- Medir runtime y metricas de carga.

DoD:
- `pnpm analytics:compare` sigue generando JSON y Markdown.
- Reporte distingue `objective='none'` y `objective='fairness'`.

## 10. Bloque 7 - Cierre
### T7.1 Documentacion
- Actualizar README.
- Actualizar DemoScript.
- Actualizar ReleaseChecklist.
- Actualizar BenchmarkReport si corresponde.

DoD:
- Demo P2 explica diferencia entre factibilidad y optimizacion.

### T7.2 Verificacion final
- Ejecutar:
  - `pnpm test`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm analytics:compare`

DoD:
- Resultados registrados.
- Riesgos o limitaciones documentados.

## 11. Primer PR recomendado
Primer PR:
- Bloque 1 completo.
- T2.1 formalizacion de costo.
- Fixture P2 inicial.

Razon:
- Congela contrato y semantica antes de tocar algoritmo.
- Permite revisar producto/modelo sin mezclar C++.

Segundo PR:
- Bloques 2 y 3 engine.

Tercer PR:
- API, UI, exportaciones, analytics y cierre.
