# Plan de Pruebas - MVP

## 1. Objetivo
Validar correctitud del modelo, robustez del parser de entrada y estabilidad de integracion API-motor.

## 2. Estrategia
- Unitarias del motor: construccion de red, BFS de Edmonds-Karp, extraccion de asignaciones.
- Integracion API-motor: wrapper interno `{ requestId, input }`, request valido/invalido, factible/infactible.
- End-to-end UI: carga de datos en `Periodos` y `Medicos`, navegacion sin perdida de estado, ejecucion en `Planificador` y visualizacion de resultado.

## 3. Matriz minima de casos
1. Caso factible minimo.
2. Caso infactible por baja disponibilidad.
3. Caso infactible por limite `C`.
4. Caso infactible por restriccion 1 dia por periodo.
5. Caso con IDs duplicados (error 400/exit 2).
6. Caso con dia fuera de periodos (error 400/exit 2).
7. Caso mediano aleatorio para smoke de performance.
8. Navegacion UI entre `Periodos`, `Medicos` y `Planificador` sin perder estado.
9. Caso UI con carga de fixture base y resolucion completa desde `Planificador`.
10. Caso con `days[*].date` duplicada (error 400/exit 2).
11. Caso con periodo de dias no contiguos aceptado como valido.
12. Caso con medico sin disponibilidad aceptado como valido a nivel de input.
13. Caso con mismo dataset en distinto orden de entrada produce mismo output.
14. Caso infactible devuelve `diagnostics.summaryCode`, `message` y `uncoveredDays` ordenado.
15. Caso factible habilita CSV y caso infactible lo deshabilita.
16. API valida schema estructural y luego reglas de dominio en capas separadas.
17. Integracion API-engine propaga `requestId` al wrapper interno.
18. CSV se genera correctamente uniendo `assignments` con `days` y `medics` del `instanceDraft`.

## 4. Invariantes a verificar en salida factible
- Cantidad de asignaciones = numero de dias.
- Todos los `dayId` aparecen una vez.
- Todo `medicId` asignado tenia disponibilidad para ese `dayId`.
- Ningun medico supera `C`.
- Para cada par `(medicId, periodId)`, maximo 1 asignacion.

## 5. Criterios de aprobacion
- 100% de pruebas unitarias del motor en verde.
- 100% de pruebas de integracion en verde.
- Ninguna regresion en snapshots JSON de casos base.
- Tiempo p95 dentro del umbral definido en PRD.

## 6. Datos de prueba sugeridos
- `tiny-feasible.json`
- `tiny-infeasible-availability.json`
- `tiny-infeasible-capacity.json`
- `tiny-infeasible-per-period.json`
- `medium-random-50x50.json`
- `large-random-200x200.json`

## 6.1 Fixtures canonicos obligatorios
Los fixtures canonicos de v1 deben vivir en:
- `packages/test-data/input/*`
- `packages/test-data/expected/*`

Set minimo obligatorio:
1. `input/tiny-feasible.json`
   - `expected/tiny-feasible.response.json`
2. `input/tiny-infeasible-availability.json`
   - `expected/tiny-infeasible-availability.response.json`
3. `input/tiny-infeasible-capacity.json`
   - `expected/tiny-infeasible-capacity.response.json`
4. `input/tiny-infeasible-per-period.json`
   - `expected/tiny-infeasible-per-period.response.json`
5. `input/invalid-duplicate-id.json`
   - `expected/invalid-duplicate-id.error.json`
6. `input/invalid-duplicate-day-date.json`
   - `expected/invalid-duplicate-day-date.error.json`
7. `input/invalid-day-without-period.json`
   - `expected/invalid-day-without-period.error.json`
8. `input/invalid-day-in-multiple-periods.json`
   - `expected/invalid-day-in-multiple-periods.error.json`
9. `input/valid-non-contiguous-period.json`
   - `expected/valid-non-contiguous-period.response.json`
10. `input/valid-medic-without-availability.json`
   - `expected/valid-medic-without-availability.response.json`
11. `input/valid-same-instance-different-order.json`
   - `expected/valid-same-instance-different-order.response.json`
12. `input/medium-random-50x50.json`
   - sin snapshot funcional estricto; se usa para smoke
13. `input/large-random-200x200.json`
   - sin snapshot funcional estricto; se usa para benchmark local

## 6.2 Regla de expected files
- Los archivos `*.response.json` almacenan el cuerpo exacto esperado de `HTTP 200`.
- Los archivos `*.error.json` almacenan el cuerpo exacto esperado de `HTTP 400`, salvo `requestId` y `timestamp`.
- En tests, `requestId` y `timestamp` se validan por shape, no por valor literal.
- En respuestas factibles, `assignments` debe coincidir exactamente, incluido orden por `dayId`.
- En respuestas infactibles, `diagnostics.uncoveredDays` debe coincidir exactamente, incluido orden por `dayId`.
- Los datasets aleatorios de smoke y benchmark no usan snapshot completo; se validan por invariantes y limites de tiempo.

## 6.3 Manifest recomendado
Se recomienda un archivo `packages/test-data/fixtures.manifest.json` con:
- `id`
- `inputPath`
- `expectedPath`
- `category` (`feasible`, `infeasible`, `invalid`, `smoke`, `benchmark`)
- `assertionMode` (`exact-response`, `exact-error`, `invariants-only`)

## 6.4 Regla de mantenimiento
- Todo cambio funcional en contrato, algoritmo o validacion que afecte snapshots debe actualizar `expected/*` en el mismo PR.
- Si cambia un fixture canonico, se debe justificar en el PR por que el comportamiento previo ya no es valido.
- No se deben regenerar snapshots masivamente sin revisar determinismo y errores esperados.

## 7. Automatizacion (objetivo)
- Ejecutar suite en CI en cada pull request.
- Publicar resumen de cobertura y tiempos de test.
