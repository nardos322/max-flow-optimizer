# apps/api

API HTTP del MVP. Es la capa que recibe requests publicos, valida la instancia, ejecuta el motor C++ y normaliza la respuesta para el frontend.

## Responsabilidad

- Exponer `GET /health` y `POST /v1/solve`.
- Validar el contrato estructural con schemas compartidos desde `@maxflow/contracts`.
- Aplicar validaciones semanticas desde `@maxflow/domain`.
- Envolver el request con `requestId` para la integracion interna con el engine.
- Ejecutar `services/engine-cpp/build/maxflow_engine` como proceso hijo.
- Mapear stdout/stderr/exit code del motor a respuestas HTTP estables.
- Devolver resultados factibles, infactibles o errores con formato consistente.

La API no persiste corridas en v1. Cada request se resuelve en memoria y la respuesta se devuelve directamente al cliente.

## Endpoints

### `GET /health`

Healthcheck simple para desarrollo local y CI.

Response:

```json
{ "status": "ok" }
```

### `POST /v1/solve`

Valida y resuelve una instancia del problema.

Request conceptual:

```json
{
  "instanceId": "demo-001",
  "maxDaysPerMedic": 2,
  "periods": [{ "id": "p1", "dayIds": ["d1", "d2"] }],
  "days": [{ "id": "d1", "date": "2026-04-17" }],
  "medics": [{ "id": "m1", "name": "Ana" }],
  "availability": [{ "medicId": "m1", "dayId": "d1" }]
}
```

Response factible:

```json
{
  "instanceId": "demo-001",
  "feasible": true,
  "requiredFlow": 1,
  "maxFlow": 1,
  "assignments": [
    { "dayId": "d1", "medicId": "m1", "periodId": "p1" }
  ],
  "stats": {
    "nodes": 6,
    "edges": 4,
    "runtimeMs": 1
  }
}
```

Response infactible:

```json
{
  "instanceId": "demo-001",
  "feasible": false,
  "requiredFlow": 1,
  "maxFlow": 0,
  "assignments": [],
  "stats": {
    "nodes": 6,
    "edges": 3,
    "runtimeMs": 1
  },
  "diagnostics": {
    "summaryCode": "INSUFFICIENT_COVERAGE",
    "message": "Unable to cover all days under current constraints.",
    "uncoveredDays": ["d1"]
  }
}
```

## Flujo Interno

```text
HTTP request
  -> Express middleware
  -> controller
  -> schema validation (@maxflow/contracts)
  -> domain validation (@maxflow/domain)
  -> engine client
  -> maxflow_engine --stdin
  -> response normalization
  -> HTTP response
```

La API es responsable de proteger al motor de payloads invalidos y de traducir fallos internos a errores HTTP accionables.

## Variables De Entorno

Archivo recomendado:

```bash
cp apps/api/.env.example apps/api/.env
```

Variables:

| Variable | Default/ejemplo | Uso |
| --- | --- | --- |
| `NODE_ENV` | `development` | Modo de ejecucion. |
| `PORT` | `3000` | Puerto HTTP. |
| `ENGINE_PATH` | ruta estandar del repo | Override opcional al binario C++. |
| `ENGINE_TIMEOUT_MS` | `2000` | Timeout duro para el proceso del motor. |
| `MAX_REQUEST_BYTES` | `2500000` | Tamano maximo del payload HTTP. |
| `MAX_DAYS` | `500` | Limite operativo de dias. |
| `MAX_MEDICS` | `500` | Limite operativo de medicos. |
| `MAX_PERIODS` | `100` | Limite operativo de periodos. |
| `MAX_AVAILABILITY_PAIRS` | `100000` | Limite operativo de pares de disponibilidad. |
| `LOG_LEVEL` | `info` | Nivel de logs. |

Si `ENGINE_PATH` no esta definido, la API busca el binario en:

```text
services/engine-cpp/build/maxflow_engine
```

## Comandos

Desde la raiz del monorepo:

```bash
pnpm --filter @maxflow/api run dev
pnpm --filter @maxflow/api run build
pnpm --filter @maxflow/api run test
pnpm --filter @maxflow/api run lint
pnpm --filter @maxflow/api run typecheck
```

Notas:

- `dev` compila TypeScript y ejecuta `node dist/server.js`.
- `test` construye `contracts`, `domain`, compila el engine C++ y corre Vitest.
- Para levantar toda la demo local, usar `pnpm run dev:full` desde la raiz.

## Estructura

- `src/app.ts`: composicion de middleware, rutas y dependencias.
- `src/server.ts`: entrada HTTP del proceso.
- `src/config.ts`: lectura y validacion de runtime config.
- `src/routes`: definicion de paths y metodos HTTP.
- `src/controllers`: adaptadores request/response.
- `src/services`: caso de uso de resolucion.
- `src/middleware`: request context y manejo transversal de errores.
- `src/engineClient.ts`: cliente del binario C++.
- `src/errors.ts`: errores propios y normalizacion.
- `tests`: pruebas de integracion de API.

## Calidad Y Contratos

- Fuente primaria del contrato: `packages/contracts/src/v1`.
- Validaciones semanticas: `packages/domain`.
- Fixtures canonicos: `packages/test-data`.
- Contrato HTTP documentado: [API.md](../../docs/30-api/API.md).
- Catalogo de errores: [ErrorCatalog.md](../../docs/30-api/ErrorCatalog.md).
- Integracion con engine: [EngineIntegrationContract.md](../../docs/20-architecture/EngineIntegrationContract.md).
