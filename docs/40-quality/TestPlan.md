# Plan de Pruebas - MVP

## 1. Objetivo
Validar correctitud del modelo, robustez del parser de entrada y estabilidad de integracion API-motor.

## 2. Estrategia
- Unitarias del motor: construccion de red, BFS de Edmonds-Karp, extraccion de asignaciones.
- Integracion API-motor: request valido/invalido, factible/infactible.
- End-to-end UI: carga de caso, ejecucion, visualizacion de resultado.

## 3. Matriz minima de casos
1. Caso factible minimo.
2. Caso infactible por baja disponibilidad.
3. Caso infactible por limite `C`.
4. Caso infactible por restriccion 1 dia por periodo.
5. Caso con IDs duplicados (error 400/exit 2).
6. Caso con dia fuera de periodos (error 400/exit 2).
7. Caso mediano aleatorio para smoke de performance.

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

## 7. Automatizacion (objetivo)
- Ejecutar suite en CI en cada pull request.
- Publicar resumen de cobertura y tiempos de test.

