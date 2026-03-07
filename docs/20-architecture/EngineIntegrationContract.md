# Contrato Interno API <-> Engine

## 1. Objetivo
Definir limites y comportamiento exacto entre `apps/api` y `services/engine-cpp` para minimizar friccion de evolucion.

## 2. Ejecucion del motor
- Modo recomendado: proceso hijo del binario `maxflow_engine`.
- Transporte: stdin/stdout en JSON UTF-8.
- stderr reservado para errores estructurados.

## 2.1 Regla de contrato interno v1
- El contrato API <-> engine no coincide 1:1 con el request HTTP publico.
- La API envuelve el `SolveRequestV1` publico en un payload interno para agregar contexto operacional.
- El engine no expone HTTP y no conoce headers ni request context de Express.

Payload API -> engine (`stdin`) v1:
```json
{
  "requestId": "8e950b8f-f8c3-49fc-835b-4015f4963ca1",
  "input": {
    "instanceId": "demo-001",
    "maxDaysPerMedic": 2,
    "periods": [],
    "days": [],
    "medics": [],
    "availability": []
  }
}
```

Reglas:
- `requestId` es obligatorio en el contrato interno.
- `input` contiene exactamente el payload HTTP publico validado.
- `requestId` se usa para observabilidad y correlacion; no afecta el algoritmo ni la salida funcional.

## 3. Parametros operativos v1
- Los nombres oficiales y defaults de runtime viven en `docs/50-operations/RuntimeConfig.md`.
- Variables operativas estables v1:
  - `ENGINE_PATH`
  - `ENGINE_TIMEOUT_MS`
  - `MAX_REQUEST_BYTES`
  - `MAX_DAYS`
  - `MAX_MEDICS`
  - `MAX_PERIODS`
  - `MAX_AVAILABILITY_PAIRS`

## 4. Exit codes del motor
- `0`: exito.
- `2`: input invalido.
- `3`: error interno del algoritmo.

## 5. Mapeo de errores API
- exit `2` -> `400` con `code=INVALID_INPUT`.
- timeout -> `500` con `code=ENGINE_TIMEOUT`.
- stdout invalido/JSON roto -> `500` con `code=ENGINE_INVALID_OUTPUT`.
- exit `3` o no clasificado -> `500` con `code=ENGINE_INTERNAL_ERROR`.

## 5.1 Semantica de stdout exitoso
- El engine responde el mismo shape base de `SolveResponseV1`, incluido `instanceId`.
- Si `feasible=false`, `diagnostics` es obligatorio.
- `diagnostics.summaryCode` es `INSUFFICIENT_COVERAGE`.
- `diagnostics.message` es estable y legible.
- `diagnostics.uncoveredDays` viene ordenado por `dayId`.
- `stats.edges` cuenta aristas dirigidas del grafo antes de expandir residual.
- `stats.runtimeMs` mide solo tiempo del motor.

## 6. Reglas de robustez
- Siempre drenar stdout y stderr para evitar deadlocks.
- Fallar en forma segura si `enginePath` no existe.
- Registrar `runtimeMs`, `exitCode` y tamano de payload por corrida.
- Propagar `requestId` al engine en el wrapper interno de stdin.
- La API no debe reenviar al engine payload HTTP sin envolver.

## 7. Compatibilidad futura
- Cualquier cambio en formato de I/O del motor requiere nueva version de contrato (`v2`).
- No introducir dependencia directa del motor a HTTP/DB.
