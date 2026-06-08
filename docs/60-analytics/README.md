# Analytics / Big Data

Especificacion de la capa analitica del proyecto.

Esta carpeta define una evolucion posterior al MVP: generar muchas instancias del problema, resolverlas en batch y analizar factibilidad, rendimiento del motor y comportamiento del modelo bajo distintos tamanos y densidades de disponibilidad.

## Documentos

- `AnalyticsSpec.md`: objetivo, alcance, arquitectura, datasets, metricas y ruta de implementacion.
- `AnalyticsPipelineContract.md`: contrato operativo canonico del pipeline `generate -> run -> aggregate -> report`, comandos, variables, outputs, metricas y criterios de optimizacion.
- `AnalyticsImplementationRoute.md`: tareas ejecutables para implementar la primera entrega analytics.
- `BigDataPipelinePlan.md`: plan posterior para escalar analytics a cientos de miles o millones de instancias.
- `PipelineOptimizationPlan.md`: plan incremental para bajar tiempos de corridas masivas y medir configuraciones por maquina.
- `EngineBreakdownFindings.md`: hallazgos de timings internos del engine y proximo foco de optimizacion.

## Principio De Diseno

La capa analytics debe crecer separada del flujo principal `web -> api -> engine`. El MVP interactivo sigue estable; los pipelines batch viven como herramientas offline hasta que exista una razon clara para convertirlos en funcionalidad de producto.

## Orden Recomendado

1. Leer `AnalyticsSpec.md` para entender objetivo y alcance.
2. Leer `AnalyticsPipelineContract.md` antes de tocar comandos, outputs o performance.
3. Usar `PipelineOptimizationPlan.md` para priorizar mejoras medibles.
4. Usar `EngineBreakdownFindings.md` cuando el cuello este dentro del engine.
5. Usar `BigDataPipelinePlan.md` solo si el volumen exige escalar mas alla de la maquina local.
