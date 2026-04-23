# Benchmark Report - 2026-04-23

## Entorno
- Fecha: `2026-04-23`
- Plataforma: `linux 5.15.146.1-microsoft-standard-WSL2`
- CPU: `Intel(R) Core(TM) i5-4670K CPU @ 3.40GHz`
- CPU count: `4`
- RAM total: `3.81 GB`
- API base URL: `http://127.0.0.1:3000`

## Configuracion usada
- API con `MAX_REQUEST_BYTES=2500000`
- Engine compilado en `services/engine-cpp/build/maxflow_engine`
- Script: `pnpm benchmark:api`

## Resultados
### `medium-random-50x50`
- runs: `30`
- p50: `32.88 ms`
- p95: `56.06 ms`
- max: `58.68 ms`
- engine p50: `8 ms`
- engine p95: `16 ms`
- errores `5xx`: `0`

### `large-random-200x200`
- runs: `10`
- p50: `1210.32 ms`
- p95: `1326.76 ms`
- max: `1326.76 ms`
- engine p50: `641 ms`
- engine p95: `757 ms`
- errores `5xx`: `0`

## Lectura
- `medium-random-50x50` cumple holgadamente el objetivo v1.
- `large-random-200x200` ya no falla por limite de payload despues de subir `MAX_REQUEST_BYTES`, pero queda por encima del objetivo `p95 <= 1000 ms`.
- No se observaron `5xx` durante la corrida.
- El gap principal en `large-random-200x200` parece venir del costo total de resolucion, no del body parser ni de fallos de integracion.

## Comandos reproducibles
```bash
pnpm run build:engine
pnpm dev
pnpm benchmark:api
```
