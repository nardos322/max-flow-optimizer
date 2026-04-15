# apps/api

API HTTP del MVP.

## Responsabilidad
- Validar payload de entrada.
- Construir/serializar input para el motor.
- Ejecutar `services/engine-cpp` y devolver respuesta estandar.

## Estructura
- `src/app.ts`: composicion de middleware, rutas y dependencias.
- `src/routes`: definicion de paths y metodos HTTP.
- `src/controllers`: adaptadores HTTP request/response.
- `src/services`: casos de uso de la API, validacion de contrato/dominio e integracion con infraestructura.
- `src/middleware`: manejo transversal de errores.
- `src/engineClient.ts`: cliente del binario C++ por contrato interno.
