# Limites No Funcionales v1

## 1. Objetivo
Definir umbrales concretos de rendimiento y capacidad para acotar el MVP.

## 2. SLO de API (entorno local dev)
- `POST /v1/solve`:
  - p50 <= `300 ms`
  - p95 <= `1000 ms`
  - timeout duro: `2000 ms`

## 3. Limites de entrada v1
- `maxDays` <= `500`
- `maxMedics` <= `500`
- `maxPeriods` <= `100`
- `availability` <= `100000` pares
- payload <= `1 MB`

## 4. Estabilidad y calidad
- Mismo input produce mismo output (orden por `dayId`).
- Tasa de errores 5xx en pruebas locales: `0%` sobre fixtures canonicos.
- Reintento automatico: no aplica en v1 (fail-fast + error claro).

## 5. Criterio de rechazo por limite
- Si se excede un limite: `400` con `code=INVALID_INPUT` y detalle de limite violado.

## 6. Revisit para v1.1
- Recalibrar limites con benchmark real.
- Agregar pruebas de carga automatizadas.

