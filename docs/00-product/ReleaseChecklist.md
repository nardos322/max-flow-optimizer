# Release Checklist - MVP v1

## 1. Funcionalidad
- [x] `GET /health` responde `200`.
- [x] `POST /v1/solve` resuelve caso factible.
- [x] `POST /v1/solve` reporta caso infactible correctamente.
- [x] UI expone `Periodos`, `Medicos` y `Planificador`.
- [x] La UI conserva el estado al navegar entre secciones.
- [x] `Planificador` muestra resultado y metricas.
- [x] Export JSON/CSV funciona.

## 2. Correctitud del modelo
- [x] Restriccion `C` validada en salidas factibles.
- [x] Restriccion maximo 1 dia por periodo por medico validada.
- [x] Ningun medico asignado fuera de disponibilidad.
- [x] `maxFlow == requiredFlow` en casos factibles.

## 3. Calidad tecnica
- [x] Lint en verde.
- [x] Tests de motor en verde.
- [x] Tests de API/integracion en verde.
- [x] Build completo en verde.

## 4. Documentacion
- [x] README principal con instrucciones de run local.
- [x] Demo script actualizado.
- [x] API contract actualizado.
- [x] Error catalog actualizado.

## 5. Portfolio readiness
- [ ] Capturas o GIF del flujo completo.
- [x] Descripcion corta del problema y solucion en repo.
- [x] Seccion "arquitectura" con diagrama simple.
- [x] Seccion "tradeoffs y mejoras futuras" (v1.1/v2).

## 6. Criterio de salida
Se publica v1 solo si todos los checks anteriores estan completos.
