# Error Catalog - API v1

## 1. Objetivo
Definir errores estables para facilitar debugging y evitar ambiguedad entre web, API y motor.

## 2. Formato de error
```json
{
  "error": {
    "requestId": "8e950b8f-f8c3-49fc-835b-4015f4963ca1",
    "timestamp": "2026-03-06T23:30:00.000Z",
    "code": "INVALID_INPUT",
    "message": "Each day must belong to exactly one period.",
    "details": {
      "dayId": "d2"
    }
  }
}
```

## 3. Errores de validacion (`HTTP 400`)
- `INVALID_INPUT`
  - Payload no cumple schema base.
- `DUPLICATE_ID`
  - IDs repetidos en `days`, `periods` o `medics`.
- `DUPLICATE_DAY_DATE`
  - Dos o mas elementos de `days` comparten la misma fecha.
- `UNKNOWN_REFERENCE`
  - `dayId` o `medicId` inexistente en disponibilidad o periodos.
- `DAY_WITHOUT_PERIOD`
  - Dia no asignado a ningun periodo.
- `DAY_IN_MULTIPLE_PERIODS`
  - Dia asignado a mas de un periodo.
- `INVALID_CAPACITY`
  - `maxDaysPerMedic < 0`.

## 3.1 Contrato de `details` por codigo
### `INVALID_INPUT`
- Uso: error estructural de schema o limite operativo violado.
- `details` minimo esperado:
  - Para schema: `{ "path": "days[0].date" }`
  - Para limites: `{ "limit": "maxDays", "max": 500, "actual": 734 }`
  - Para payload demasiado grande: `{ "limit": 2500000 }`

### `DUPLICATE_ID`
- Uso: un mismo `id` aparece repetido dentro de `days`, `periods` o `medics`.
- `details` minimo esperado:
  ```json
  {
    "entity": "days",
    "id": "d2"
  }
  ```

### `DUPLICATE_DAY_DATE`
- Uso: dos o mas `days` comparten la misma fecha.
- `details` minimo esperado:
  ```json
  {
    "date": "2026-04-18"
  }
  ```

### `UNKNOWN_REFERENCE`
- Uso: una referencia a `dayId` o `medicId` no existe.
- `details` minimo esperado:
  ```json
  {
    "entity": "availability",
    "field": "dayId",
    "value": "d99"
  }
  ```

### `DAY_WITHOUT_PERIOD`
- Uso: un dia no pertenece a ningun periodo.
- `details` minimo esperado:
  ```json
  {
    "dayId": "d2"
  }
  ```

### `DAY_IN_MULTIPLE_PERIODS`
- Uso: un dia aparece en mas de un periodo.
- `details` minimo esperado:
  ```json
  {
    "dayId": "d2"
  }
  ```

### `INVALID_CAPACITY`
- Uso: `maxDaysPerMedic` invalido.
- `details` minimo esperado:
  ```json
  {
    "field": "maxDaysPerMedic",
    "value": -1
  }
  ```

## 4. Errores de motor (`HTTP 500`)
- `ENGINE_EXECUTION_FAILED`
  - No se pudo ejecutar el binario del motor.
- `ENGINE_TIMEOUT`
  - El motor excedio el tiempo maximo permitido.
- `ENGINE_INVALID_OUTPUT`
  - El motor devolvio JSON invalido o incompleto.
- `ENGINE_INTERNAL_ERROR`
  - El motor devolvio error inesperado (exit code != 0).

## 5. Errores de plataforma (`HTTP 500`)
- `INTERNAL_ERROR`
  - Error no clasificado en API.

## 6. Mapeo de status
- `400`: errores de entrada y reglas de dominio.
- `500`: errores de ejecucion, infraestructura o motor.

## 7. Reglas de uso
- Campos obligatorios siempre presentes: `requestId`, `timestamp`, `code`, `message`.
- `code` es estable y se usa para logica cliente.
- `message` puede mejorar redaccion sin cambiar `code`.
- `details` es opcional y debe incluir campos accionables.
- Si `details` existe, debe respetar la forma minima definida para el `code` correspondiente.
- `requestId` permite correlacionar con logs de API y engine.
