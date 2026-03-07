# PRD - MVP Asignacion de Feriados por Flujo Maximo

## 1. Resumen
Construir un MVP para asignar dias de feriado a medicos usando un modelo de flujo maximo que garantice factibilidad bajo restricciones de disponibilidad y carga maxima.

## 2. Problema
Se requiere asignar exactamente una persona a cada dia de feriado. Cada medico tiene:
- Disponibilidad parcial por dias.
- Limite global de dias asignables `C`.
- Restriccion de a lo sumo 1 dia por cada periodo de feriados.

## 3. Objetivo del producto
Permitir cargar una instancia del problema, ejecutar el motor de flujo maximo y devolver:
- Si la instancia es factible.
- Una asignacion valida dia -> medico cuando exista.
- Metricas basicas de ejecucion y tamano del grafo.

## 4. Usuarios objetivo
- Perfil principal: estudiante/ingeniero que quiere demostrar modelado en redes de flujo.
- Perfil secundario: evaluador tecnico o reclutador que revisa el portafolio.

## 5. Alcance del MVP
- Ingreso de datos via JSON.
- Resolucion mediante motor C++ (Edmonds-Karp).
- API HTTP para orquestar validacion y resolucion.
- UI web minima para cargar caso de prueba y visualizar resultado.
- Exportacion de respuesta en JSON y CSV.

## 6. Fuera de alcance (MVP)
- Multiusuario y autenticacion.
- Optimizacion por equidad/preferencias (solo factibilidad).
- Edicion avanzada de calendario.
- Integracion con sistemas hospitalarios reales.

## 7. Historias de usuario
1. Como usuario, quiero cargar periodos, dias, medicos y disponibilidades para evaluar un caso.
2. Como usuario, quiero saber si existe asignacion factible.
3. Como usuario, quiero ver la asignacion final por dia si existe.
4. Como usuario, quiero ver por que un caso es infactible a nivel resumen.

## 8. Criterios de aceptacion funcionales
- Si el flujo maximo obtenido es igual al numero de dias, la API retorna `feasible=true` y todas las asignaciones.
- Si el flujo maximo es menor al numero de dias, la API retorna `feasible=false`.
- Ningun medico supera `C` dias asignados.
- Ningun medico aparece mas de una vez dentro del mismo periodo.
- Ningun medico es asignado a un dia no disponible.
- Cada dia tiene exactamente una asignacion cuando `feasible=true`.

## 9. Criterios de aceptacion no funcionales
- Tiempo de respuesta p95 <= 1s para instancias de hasta 200 dias y 200 medicos en ambiente local de desarrollo.
- Mensajes de error claros para datos invalidos.
- Reproducibilidad: mismo input produce mismo output.
- Trazabilidad: incluir metadatos del motor y tiempo de ejecucion.

## 10. Definicion de terminado (DoD)
- Documentacion de modelo matematico cerrada.
- Contrato API versionado y probado.
- Motor C++ con pruebas unitarias y casos de borde.
- Pruebas de integracion API <-> motor.
- UI demostrable end-to-end.
- README principal con instrucciones de ejecucion local y guion de demo.

## 11. Riesgos y mitigaciones
- Riesgo: datos inconsistentes. Mitigacion: validacion estricta de input antes de llamar al motor.
- Riesgo: coupling API-motor. Mitigacion: contrato JSON estable y versionado.
- Riesgo: tiempos altos en instancias grandes. Mitigacion: limites de tamano y metricas de complejidad expuestas.

