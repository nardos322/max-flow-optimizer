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

## Siguiente lectura
1. `docs/README.md`
2. `docs/00-product/ImplementationRoute.md`
3. `docs/50-operations/LocalRunbook.md`
