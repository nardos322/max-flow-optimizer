# Observabilidad v1

## 1. Objetivo
Facilitar debug rapido de fallos y trazabilidad de corridas sin agregar infraestructura pesada.

## 2. Logging minimo (API)
Campos obligatorios por request:
- `timestamp`
- `requestId`
- `route`
- `statusCode`
- `durationMs`
- `instanceId` (si aplica)
- `engineExitCode` (si aplica)
- `errorCode` (si aplica)

## 3. Logging minimo (engine)
Campos recomendados por corrida:
- `instanceId`
- `nodes`
- `edges`
- `maxFlow`
- `requiredFlow`
- `runtimeMs`
- `augmentingPaths` (si se expone)

## 4. Metricas operativas v1
- `solve_requests_total`
- `solve_failures_total`
- `solve_duration_ms` (histograma)
- `engine_timeouts_total`

## 5. Correlacion
- API genera `requestId`.
- Si invoca engine, propaga `requestId` para correlacion en logs.

## 6. Politica de datos sensibles
- No loggear payload completo en producción.
- En v1 local de demo, permitir payload parcial truncado para debugging.

