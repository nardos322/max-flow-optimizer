# Benchmark Report - 2026-05-08

## Entorno
- Fecha: `2026-05-08`
- Plataforma: `linux 5.15.146.1-microsoft-standard-WSL2`
- CPU: `Intel(R) Core(TM) i5-4670K CPU @ 3.40GHz`
- CPU count: `4`
- RAM total: `3.81 GB`
- API base URL: `http://127.0.0.1:3000`

## Configuracion usada
- API con `MAX_REQUEST_BYTES=2500000`
- Engine compilado en `Release` con `services/engine-cpp/build/maxflow_engine`
- Script: `pnpm benchmark:api`
- Algoritmo del motor: Dinic sobre la red residual del modelo

## Criterio v1
- `p50 <= 300 ms`
- `p95 <= 1000 ms`
- maximo por corrida `<= 2000 ms`
- errores `5xx = 0`

## Resultados
### `medium-random-50x50`
- runs: `30`
- p50: `11.79 ms`
- p95: `18.59 ms`
- max: `19.56 ms`
- engine p50: `0 ms`
- engine p95: `0 ms`
- errores `5xx`: `0`
- statuses: `200=30`

### `large-random-200x200`
- runs: `10`
- p50: `240.15 ms`
- p95: `348.95 ms`
- max: `348.95 ms`
- engine p50: `16 ms`
- engine p95: `23 ms`
- errores `5xx`: `0`
- statuses: `200=10`

### Overall
- runs: `40`
- p50: `13.47 ms`
- p95: `262.66 ms`
- max: `348.95 ms`
- errores `5xx`: `0`

## Lectura
- `medium-random-50x50` cumple holgadamente el objetivo v1.
- `large-random-200x200` ahora cumple el objetivo `p95 <= 1000 ms`.
- No se observaron `5xx` durante la corrida.
- `pnpm benchmark:api` valida automaticamente p50, p95, timeout y errores `5xx`; la corrida falla con exit code distinto de cero si se viola el criterio.

## Comandos reproducibles
```bash
pnpm run build:engine
pnpm --filter @maxflow/api run dev
pnpm smoke:api
pnpm benchmark:api
```
