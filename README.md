# Max Flow Optimizer

Monorepo del MVP para asignacion de feriados por flujo maximo.

## Estado
- La especificacion vive en `docs/`.
- El bootstrap del monorepo ya existe para arrancar implementacion por bloques.
- La ruta de trabajo canonica esta en `docs/00-product/ImplementationRoute.md`.

## Estructura
- `apps/api`: API HTTP.
- `apps/web`: frontend MVP.
- `packages/contracts`: contrato HTTP publico v1.
- `packages/domain`: validaciones semanticas y utilidades.
- `packages/test-data`: fixtures canonicos.
- `services/engine-cpp`: motor C++.

## Comandos base
```bash
pnpm dev
pnpm test
pnpm build
pnpm lint
```

## Bootstrap rapido local
```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm run dev:full
```

Notas:
- `pnpm dev` es el comando canonico para desarrollo diario y levanta API + web.
- `pnpm run dev:full` primero compila el motor C++ y luego ejecuta `pnpm dev`.
- El motor C++ se configura con CMake usando `Ninja` como generador por defecto.
- `ENGINE_PATH` es opcional si el engine esta en `services/engine-cpp/build/maxflow_engine`.
- Definir `ENGINE_PATH` solo si queres usar un binario en otra ubicacion.

## Siguiente lectura
1. `docs/README.md`
2. `docs/00-product/ImplementationRoute.md`
3. `docs/50-operations/LocalRunbook.md`
