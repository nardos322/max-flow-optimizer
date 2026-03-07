# Runtime Config (Env Vars) - MVP v1

## 1. Objetivo
Definir variables de entorno y defaults para ejecutar localmente sin ambiguedad.

## 2. API (`apps/api`)
| Variable | Requerida | Default | Descripcion |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Entorno de ejecucion (`development`, `test`, `production`). |
| `PORT` | No | `3000` | Puerto HTTP de la API. |
| `ENGINE_PATH` | Si | - | Ruta absoluta al binario `maxflow_engine`. |
| `ENGINE_TIMEOUT_MS` | No | `2000` | Timeout de ejecucion del motor en ms. |
| `MAX_REQUEST_BYTES` | No | `1000000` | Tamano maximo de body permitido por request. |
| `MAX_DAYS` | No | `500` | Limite semantico maximo de elementos en `days`. |
| `MAX_MEDICS` | No | `500` | Limite semantico maximo de elementos en `medics`. |
| `MAX_PERIODS` | No | `100` | Limite semantico maximo de elementos en `periods`. |
| `MAX_AVAILABILITY_PAIRS` | No | `100000` | Limite semantico maximo de pares en `availability`. |
| `LOG_LEVEL` | No | `info` | Nivel de log (`debug`, `info`, `warn`, `error`). |

## 3. Web (`apps/web`)
| Variable | Requerida | Default | Descripcion |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | `http://localhost:3000` | Base URL de la API. |

## 4. Convenciones
- Variables numericas se parsean y validan al iniciar.
- Si `ENGINE_PATH` no existe: fail-fast con error claro de startup.
- No usar secretos en v1 (sin auth/DB remota).
- Si una variable no esta presente, se usa el default documentado en este archivo.

## 5. Archivo ejemplo recomendado
- `apps/api/.env.example`
- `apps/web/.env.example`
