# Local Runbook - Arranque MVP

## 1. Objetivo
Pasar de repositorio clonado a demo funcional local con comandos concretos.

## 2. Prerrequisitos
- Node.js `20.12.2`
- pnpm `9.12.2`
- CMake `3.28.3` o superior
- Ninja `1.11.1` o superior
- Compilador C++20 (g++/clang++)

## 3. Setup inicial
```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Nota:
- La primera configuracion/build del motor C++ descarga dependencias fijadas (`nlohmann/json`, `CLI11`, `GoogleTest`) mediante `FetchContent`.
- Esa descarga ocurre durante `cmake -S ... -B ... -G Ninja`.
- En entornos sin salida a internet, se debe usar un cache previo de CMake o vendorizar esas dependencias antes del build.
- `ENGINE_PATH` no es obligatorio si el binario queda en la ruta estandar del monorepo.
- Definir `ENGINE_PATH` solo cuando se quiera usar un binario fuera de `services/engine-cpp/build/maxflow_engine`.

## 4. Build del motor C++
```bash
cmake -S services/engine-cpp -B services/engine-cpp/build -G Ninja
cmake --build services/engine-cpp/build -j
```

Nota:
- Si `services/engine-cpp/build` fue generado antes con otro backend, borrar ese directorio y volver a configurar.

## 5. Variables de entorno
### API (`apps/api/.env`)
```env
NODE_ENV=development
PORT=3000
# ENGINE_PATH=/absolute/path/to/maxflow_engine
ENGINE_TIMEOUT_MS=2000
MAX_REQUEST_BYTES=1000000
MAX_DAYS=500
MAX_MEDICS=500
MAX_PERIODS=100
MAX_AVAILABILITY_PAIRS=100000
LOG_LEVEL=info
```

### Web (`apps/web/.env`)
```env
VITE_API_BASE_URL=http://localhost:3000
```

### Convencion operativa v1
- `ENGINE_PATH`: override opcional para un binario `maxflow_engine` fuera de la ruta estandar del repo.
- `ENGINE_TIMEOUT_MS`: timeout duro del proceso hijo en milisegundos.
- `MAX_REQUEST_BYTES`: tamano maximo del payload HTTP aceptado por API.
- `MAX_DAYS`: limite semantico de `days`.
- `MAX_MEDICS`: limite semantico de `medics`.
- `MAX_PERIODS`: limite semantico de `periods`.
- `MAX_AVAILABILITY_PAIRS`: limite semantico de `availability`.
- `LOG_LEVEL`: `debug`, `info`, `warn` o `error`.
- `VITE_API_BASE_URL`: base URL consumida por la UI web.

### Regla de precedencia
- Si `ENGINE_PATH` esta definida, la API usa esa ruta.
- Si `ENGINE_PATH` no esta definida, la API usa `<repo-root>/services/engine-cpp/build/maxflow_engine`.
- Si ninguna ruta existe, la API falla al iniciar con error claro.
- Si una env var no existe, la API usa el default documentado en `docs/50-operations/RuntimeConfig.md`.
- El contrato v1 de nombres de env vars es estable; no debe cambiarse sin actualizar runbook, CI y configuracion de apps.

## 6. Ejecutar en local
```bash
pnpm dev
```

Bootstrap rapido alternativo:
```bash
pnpm run dev:full
```

Regla operativa:
- `pnpm dev` es el comando canonico para desarrollo diario y no compila el engine implicitamente.
- `pnpm run dev:full` existe para bootstrap en una maquina nueva o cuando se necesita recompilar el engine antes de arrancar.
- `pnpm run build:engine` usa `Ninja` como generador de CMake.
- Si el engine se compila en la ruta estandar del repo, no hace falta configurar `ENGINE_PATH`.

## 7. Verificacion rapida
1. API health:
```bash
curl -s http://localhost:3000/health
```
2. Resolver fixture tiny:
```bash
curl -s -X POST http://localhost:3000/v1/solve \
  -H "Content-Type: application/json" \
  --data-binary @packages/test-data/input/tiny-feasible.json
```

## 8. Suite de calidad
```bash
pnpm lint
pnpm test
pnpm build
```

## 9. Troubleshooting rapido
- Si falla la deteccion del engine: verificar que exista `services/engine-cpp/build/maxflow_engine` o definir `ENGINE_PATH`.
- Si falla timeout: subir `ENGINE_TIMEOUT_MS` temporalmente y revisar logs.
- Si falla contrato: validar payload contra los schemas exportados por `@maxflow/contracts`.
