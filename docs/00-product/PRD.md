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
- Ingreso de datos principalmente via formularios web, con soporte de carga de fixtures JSON para demo y testing.
- Resolucion mediante motor C++ (Edmonds-Karp).
- API HTTP para orquestar validacion y resolucion.
- UI web minima separada en `Periodos`, `Medicos` y `Planificador`.
- Exportacion de respuesta en JSON y CSV.

## 5.1 UX MVP Web
La UI del MVP no sera una pantalla unica. Se define una navegacion simple en tres secciones:

El contrato visual y de componentes de esta UX se detalla en `docs/00-product/FrontendSpec.md`.

1. `Periodos`
- Permite crear y editar `periods` y `days`.
- Debe mostrar la relacion periodo -> dias en forma legible.
- Debe validar campos requeridos y referencias basicas antes de pasar a resolver.

2. `Medicos`
- Permite crear y editar `medics`.
- Permite definir `availability` por medico y dia.
- La edicion de disponibilidad se hace por medico, con dias agrupados por periodo y seleccion por checkbox.
- Debe hacer visible la disponibilidad cargada sin obligar al usuario a editar JSON crudo.

3. `Planificador`
- Muestra un resumen de la instancia armada.
- Ejecuta `POST /v1/solve`.
- Muestra `feasible`, asignaciones, metricas y diagnostico minimo de infactibilidad.
- Permite exportar resultado en JSON y CSV.

Reglas de UX v1:
- Las tres secciones comparten un unico estado de instancia en frontend.
- Navegar entre secciones no debe perder datos mientras la app siga abierta.
- Debe existir una accion para cargar un fixture base y poblar la UI rapidamente.
- El ingreso por formularios es la experiencia principal; pegar JSON completo puede existir como ayuda, pero no es requisito del MVP.
- La validacion se divide en dos niveles: validacion local por seccion y validacion final al resolver contra la API.
- `availability` se representa en frontend como lista de pares `{ medicId, dayId }`, aunque su edicion visual sea por medico.
- La UI de disponibilidad no usa una matriz global `medico x dia` como experiencia principal del MVP.
- En mobile, la seccion `Medicos` debe seguir siendo usable sin tablas anchas.

## 5.2 Exportacion MVP
Se definen dos exportaciones en la UI:

1. JSON
- Disponible siempre despues de cada corrida.
- Contiene el payload exacto devuelto por `POST /v1/solve`.
- Nombre sugerido de archivo: `<instanceId>.result.json`.

2. CSV
- Disponible solo cuando `feasible=true`.
- Se genera uniendo `assignments` con los datos cargados en la instancia actual del frontend.
- Encoding: UTF-8.
- Separador: coma.
- Header obligatorio:
  - `dayId`
  - `date`
  - `periodId`
  - `medicId`
  - `medicName`
- Orden de filas: ascendente por `dayId`.
- Nombre sugerido de archivo: `<instanceId>.assignments.csv`.
- Si `feasible=false`, la exportacion CSV debe estar deshabilitada para evitar archivos vacios o ambiguos.
- `dayId`, `periodId` y `medicId` salen de la respuesta del solver.
- `date` y `medicName` se resuelven desde el `instanceDraft` activo en frontend.

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
- La UI permite cargar la instancia completa recorriendo `Periodos` -> `Medicos` -> `Planificador`.
- La UI conserva el estado cargado al cambiar entre secciones.
- `Planificador` muestra resumen de entrada, resultado y exportacion cuando la corrida termina.
- La exportacion JSON esta disponible siempre despues de resolver.
- La exportacion CSV solo esta disponible para resultados factibles.

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

## 12. Decisiones de dominio cerradas v1
- `days[*].date` debe ser unica en toda la instancia.
- Un periodo puede agrupar dias no contiguos; la contiguidad de fechas no se valida en v1.
- Se permiten medicos sin disponibilidad cargada; simplemente no podran recibir asignaciones.
- El orden de entrada de `periods`, `days`, `medics` y `availability` no tiene semantica funcional.
