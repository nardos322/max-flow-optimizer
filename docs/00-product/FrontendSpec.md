# Frontend Spec - MVP v1

## 1. Objetivo
Definir el contrato visual y de componentes del frontend MVP para que la implementacion de `apps/web` no dependa de decisiones ad hoc durante el desarrollo.

## 2. Alcance
Este documento fija:
- Mapa de pantallas.
- Layout principal.
- Inventario de componentes.
- Responsabilidades por componente.
- Estados visuales.
- Contrato de interaccion.

No fija un sistema de diseno completo ni una identidad visual final de marca.

## 3. Mapa de pantallas
La aplicacion web MVP tiene una sola shell y tres vistas principales:

1. `Periodos`
- Edita `periods` y `days`.
- Muestra la relacion periodo -> dias.

2. `Medicos`
- Edita `medics`.
- Edita `availability` por medico.

3. `Planificador`
- Resume la instancia.
- Ejecuta la resolucion.
- Muestra resultado y exportaciones.

No existen rutas de detalle, modales obligatorios ni pantallas secundarias persistentes en v1.

## 4. Layout principal
### 4.1 Estructura de pagina
- Header superior fijo o semifiejo con titulo del producto y acciones globales.
- Navegacion principal inmediatamente visible como `tabs` horizontales en desktop.
- En mobile, la navegacion puede colapsar a una barra superior scrollable, pero debe seguir mostrando claramente las tres secciones.
- Debajo de la navegacion vive un unico `content area` que renderiza la vista activa.

### 4.2 Acciones globales
El header debe incluir:
- Nombre corto del proyecto.
- Accion `Cargar fixture`.
- Indicador simple del `instanceId` actual.

No se requiere boton global de guardar porque no hay persistencia remota.

### 4.3 Layout por vista
- `Periodos`: composicion en dos bloques apilados.
  - Bloque de formulario para alta/edicion.
  - Bloque de tabla o lista resumida de periodos y dias ya cargados.
- `Medicos`: lista vertical de cards por medico.
  - Cada card contiene datos del medico y su disponibilidad agrupada por periodo.
- `Planificador`: tres bloques apilados.
  - Resumen de entrada.
  - Acciones de resolucion.
  - Resultado y exportaciones.

## 5. Inventario de componentes
## 5.1 Shell y navegacion
- `AppShell`
  - Layout raiz.
- `TopBar`
  - Titulo, `instanceId`, accion de fixture.
- `PrimaryTabs`
  - Navegacion entre `Periodos`, `Medicos` y `Planificador`.

## 5.2 Seccion `Periodos`
- `PeriodsPage`
  - Contenedor de la vista.
- `PeriodForm`
  - Alta y edicion de un periodo.
- `DayForm`
  - Alta y edicion de un dia.
- `PeriodsList`
  - Lista de periodos existentes.
- `DaysTable`
  - Tabla o lista de dias existentes.
- `PeriodDaysSummary`
  - Vista legible de `periodId -> dayIds/date`.

## 5.3 Seccion `Medicos`
- `MedicsPage`
  - Contenedor de la vista.
- `MedicForm`
  - Alta y edicion de un medico.
- `MedicsList`
  - Lista de medicos cargados.
- `MedicAvailabilityCard`
  - Card principal por medico.
- `AvailabilityGroupByPeriod`
  - Grupo de checkboxes de dias por periodo.
- `AvailabilitySummary`
  - Cantidad de dias disponibles por medico y periodos con disponibilidad.

## 5.4 Seccion `Planificador`
- `PlannerPage`
  - Contenedor de la vista.
- `InstanceSummary`
  - Resumen de tamano y datos cargados.
- `SolveActions`
  - Boton resolver y estado de ejecucion.
- `SolveStatusBanner`
  - Estado factible/infactible/error.
- `AssignmentsTable`
  - Tabla derivada de `assignments` enriquecida con `date` desde `instanceDraft.days`.
- `StatsPanel`
  - `requiredFlow`, `maxFlow`, `nodes`, `edges`, `runtimeMs`.
- `DiagnosticsPanel`
  - `summaryCode`, `message`, `uncoveredDays`.
- `ExportActions`
  - Descarga JSON/CSV.

## 5.5 Componentes transversales
- `SectionCard`
  - Contenedor visual estandar para bloques.
- `InlineFieldError`
  - Error local de campo.
- `EmptyState`
  - Estado vacio reutilizable.
- `ApiErrorBanner`
  - Error devuelto por API.
- `Badge`
  - Estado corto: `Draft`, `Feasible`, `Infeasible`, `Invalid`.

## 6. Responsabilidades por componente
### 6.1 Componentes con logica de dominio
- `PeriodsPage`, `MedicsPage`, `PlannerPage`
  - Leen estado global.
  - Despachan acciones al reducer.
  - Coordinan formularios y bloques secundarios.

### 6.2 Componentes de formulario
- `PeriodForm`, `DayForm`, `MedicForm`
  - Usan `react-hook-form` + `zod`.
  - Validan campos locales.
  - Emiten acciones confirmadas al reducer global.

### 6.3 Componentes de disponibilidad
- `MedicAvailabilityCard`, `AvailabilityGroupByPeriod`
  - Renderizan disponibilidad desde `instanceDraft`.
  - Emiten toggles de `{ medicId, dayId }`.
  - No mantienen una copia paralela persistente de `availability`.

### 6.4 Componentes de resultado
- `SolveActions`, `SolveStatusBanner`, `AssignmentsTable`, `StatsPanel`, `DiagnosticsPanel`, `ExportActions`
  - Consumen el ultimo resultado de solve almacenado en estado UI.
  - No recalculan factibilidad ni asignaciones localmente.
  - `AssignmentsTable` solo enriquece filas con datos de `instanceDraft` ya presentes en memoria.
  - `ExportActions` solo transforma datos ya presentes en memoria.

## 7. Contrato de estado frontend
## 7.1 Estado global minimo
El estado global debe incluir al menos:
- `instanceDraft`
  - `instanceId`
  - `maxDaysPerMedic`
  - `periods`
  - `days`
  - `medics`
  - `availability`
- `activeSection`
- `lastSolveResult`
- `lastSolveError`
- `isSolving`

## 7.2 Reglas
- `instanceDraft` es la unica fuente de verdad de entrada.
- `lastSolveResult` queda invalidado cuando el usuario modifica el draft luego de una corrida exitosa o infactible.
- `lastSolveError` se limpia al iniciar una nueva corrida o al corregir campos relevantes.
- Cambiar de tab no reinicia formularios confirmados.

## 8. Contrato de interaccion
## 8.1 Navegacion
- El usuario puede entrar a cualquier seccion en cualquier momento.
- No se obliga un wizard lineal.
- `Planificador` puede mostrarse aunque el draft este incompleto, pero debe advertirlo antes de resolver.

## 8.2 `Periodos`
Acciones obligatorias:
- Crear periodo.
- Editar periodo.
- Eliminar periodo.
- Crear dia.
- Editar dia.
- Eliminar dia.

Reglas visuales:
- Si no hay periodos, mostrar `EmptyState` con CTA a crear el primero.
- Si un periodo no tiene dias asociados, debe verse explicitamente como incompleto.
- Cada dia debe mostrar al menos `dayId` y `date`.

## 8.3 `Medicos`
Acciones obligatorias:
- Crear medico.
- Editar medico.
- Eliminar medico.
- Marcar o desmarcar disponibilidad por dia.

Reglas visuales:
- Cada medico se presenta como card independiente.
- Dentro de cada card, los dias se agrupan por `periodId`.
- Cada checkbox debe mostrar `dayId` y `date`.
- Si no existen dias cargados, la card debe mostrar que la disponibilidad no puede editarse todavia.

## 8.4 `Planificador`
Acciones obligatorias:
- Resolver instancia.
- Exportar JSON si existe resultado.
- Exportar CSV solo si `feasible=true`.

Reglas visuales:
- Antes de resolver, mostrar resumen del draft actual.
- Durante `isSolving=true`, el boton resolver queda deshabilitado y muestra estado de carga.
- Si la API devuelve `400`, mostrar `ApiErrorBanner` con `code` y `message`.
- Si la API devuelve `500`, mostrar `ApiErrorBanner` con mensaje generico mas `requestId` si existe.
- Si `feasible=true`, mostrar banner positivo y tabla de asignaciones.
- Si `feasible=false`, mostrar banner neutro/advertencia y panel de diagnostico.

## 9. Estados visuales obligatorios
## 9.1 Estados vacios
- `Periodos` vacio.
- `Medicos` vacio.
- `Planificador` sin resultado aun.

## 9.2 Estados de validacion
- Error de campo requerido.
- Error de formato de fecha.
- Error local por referencia obvia faltante.
- Error global por validacion API.

## 9.3 Estados de red/ejecucion
- `idle`
- `submitting`
- `success`
- `infeasible`
- `error`

## 9.4 Estados de exportacion
- JSON habilitado solo si existe resultado.
- CSV habilitado solo si existe resultado factible.

## 10. Contrato visual minimo
- Usar cards o paneles claramente separados por seccion.
- Los encabezados de bloque deben ser visibles y estables.
- `Feasible` y `Infeasible` deben diferenciarse visualmente con color y texto, no solo con color.
- Los errores deben aparecer cerca del punto de accion o del boton resolver.
- La interfaz debe funcionar en desktop y mobile sin requerir scroll horizontal global.

## 11. Accesibilidad minima v1
- Todos los inputs deben tener `label`.
- Los tabs o botones de navegacion deben ser operables por teclado.
- Los mensajes de error deben ser legibles sin depender solo de color.
- Los checkboxes de disponibilidad deben tener texto descriptivo asociado.

## 12. Criterios de aceptacion UI
- Un usuario puede crear una instancia completa sin tocar JSON crudo.
- Puede navegar entre tabs sin perder datos ya confirmados.
- Puede distinguir claramente entre draft, resultado factible, resultado infactible y error.
- Puede exportar JSON y CSV segun las reglas del PRD.
- Puede operar la seccion `Medicos` en mobile sin una matriz horizontal gigante.
