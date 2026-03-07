# Release Checklist - MVP v1

## 1. Funcionalidad
- [ ] `GET /health` responde `200`.
- [ ] `POST /v1/solve` resuelve caso factible.
- [ ] `POST /v1/solve` reporta caso infactible correctamente.
- [ ] UI expone `Periodos`, `Medicos` y `Planificador`.
- [ ] La UI conserva el estado al navegar entre secciones.
- [ ] `Planificador` muestra resultado y metricas.
- [ ] Export JSON/CSV funciona.

## 2. Correctitud del modelo
- [ ] Restriccion `C` validada en salidas factibles.
- [ ] Restriccion maximo 1 dia por periodo por medico validada.
- [ ] Ningun medico asignado fuera de disponibilidad.
- [ ] `maxFlow == requiredFlow` en casos factibles.

## 3. Calidad tecnica
- [ ] Lint en verde.
- [ ] Tests de motor en verde.
- [ ] Tests de API/integracion en verde.
- [ ] Build completo en verde.

## 4. Documentacion
- [ ] README principal con instrucciones de run local.
- [ ] Demo script actualizado.
- [ ] API contract actualizado.
- [ ] Error catalog actualizado.

## 5. Portfolio readiness
- [ ] Capturas o GIF del flujo completo.
- [ ] Descripcion corta del problema y solucion en repo.
- [ ] Seccion "arquitectura" con diagrama simple.
- [ ] Seccion "tradeoffs y mejoras futuras" (v1.1/v2).

## 6. Criterio de salida
Se publica v1 solo si todos los checks anteriores estan completos.
