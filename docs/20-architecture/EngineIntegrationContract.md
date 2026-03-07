# Contrato Interno API <-> Engine

## 1. Objetivo
Definir limites y comportamiento exacto entre `apps/api` y `services/engine-cpp` para minimizar friccion de evolucion.

## 2. Ejecucion del motor
- Modo recomendado: proceso hijo del binario `maxflow_engine`.
- Transporte: stdin/stdout en JSON UTF-8.
- stderr reservado para errores estructurados.

## 3. Parametros operativos v1
- `enginePath`: configurable por variable de entorno.
- `engineTimeoutMs`: `2000` ms (default).
- `maxRequestBytes`: `1_000_000` bytes (default).
- `maxDays`: `500` dias.
- `maxMedics`: `500` medicos.

## 4. Exit codes del motor
- `0`: exito.
- `2`: input invalido.
- `3`: error interno del algoritmo.

## 5. Mapeo de errores API
- exit `2` -> `400` con `code=INVALID_INPUT`.
- timeout -> `500` con `code=ENGINE_TIMEOUT`.
- stdout invalido/JSON roto -> `500` con `code=ENGINE_INVALID_OUTPUT`.
- exit `3` o no clasificado -> `500` con `code=ENGINE_INTERNAL_ERROR`.

## 6. Reglas de robustez
- Siempre drenar stdout y stderr para evitar deadlocks.
- Fallar en forma segura si `enginePath` no existe.
- Registrar `runtimeMs`, `exitCode` y tamano de payload por corrida.

## 7. Compatibilidad futura
- Cualquier cambio en formato de I/O del motor requiere nueva version de contrato (`v2`).
- No introducir dependencia directa del motor a HTTP/DB.

