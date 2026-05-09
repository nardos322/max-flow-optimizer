# Analytics / Big Data

Especificacion de la capa analitica del proyecto.

Esta carpeta define una evolucion posterior al MVP: generar muchas instancias del problema, resolverlas en batch y analizar factibilidad, rendimiento del motor y comportamiento del modelo bajo distintos tamanos y densidades de disponibilidad.

## Documentos

- `AnalyticsSpec.md`: objetivo, alcance, arquitectura, datasets, metricas y ruta de implementacion.
- `AnalyticsImplementationRoute.md`: tareas ejecutables para implementar la primera entrega analytics.

## Principio De Diseno

La capa analytics debe crecer separada del flujo principal `web -> api -> engine`. El MVP interactivo sigue estable; los pipelines batch viven como herramientas offline hasta que exista una razon clara para convertirlos en funcionalidad de producto.
