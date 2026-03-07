# Local Runbook - Arranque MVP

## 1. Objetivo
Pasar de repositorio clonado a demo funcional local con comandos concretos.

## 2. Prerrequisitos
- Node.js `20.12.2`
- pnpm `9.12.2`
- CMake `3.28.3` o superior
- Compilador C++20 (g++/clang++)

## 3. Setup inicial
```bash
pnpm install
```

## 4. Build del motor C++
```bash
cmake -S services/engine-cpp -B services/engine-cpp/build
cmake --build services/engine-cpp/build -j
```

## 5. Variables de entorno
### API (`apps/api/.env`)
```env
NODE_ENV=development
PORT=3000
ENGINE_PATH=/home/nardos322/max-flow-optimizer/services/engine-cpp/build/maxflow_engine
ENGINE_TIMEOUT_MS=2000
MAX_REQUEST_BYTES=1000000
LOG_LEVEL=info
```

### Web (`apps/web/.env`)
```env
VITE_API_BASE_URL=http://localhost:3000
```

## 6. Ejecutar en local
```bash
pnpm dev
```

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
- Si falla `ENGINE_PATH`: verificar que el binario exista y tenga permisos.
- Si falla timeout: subir `ENGINE_TIMEOUT_MS` temporalmente y revisar logs.
- Si falla contrato: validar payload contra `packages/contracts/v1/schemas`.

