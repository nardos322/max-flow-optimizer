# Workspace y Scripts - Convencion v1

## 1. Objetivo
Fijar nombres de paquetes y scripts para desarrollo consistente en todo el monorepo.

## 2. Nombres de paquetes (workspace)
- `@maxflow/api` -> `apps/api`
- `@maxflow/web` -> `apps/web`
- `@maxflow/contracts` -> `packages/contracts`
- `@maxflow/domain` -> `packages/domain`

## 3. Scripts raiz (package.json)
- `dev`: levanta web + api en paralelo.
- `test`: ejecuta tests de engine + api + web (si aplica).
- `build`: build completo del monorepo.
- `lint`: lint/format checks.
- `typecheck`: chequeo de tipos TS.

### Helpers operativos no canonicos
- `build:engine`: configura y compila `services/engine-cpp` con CMake usando `Ninja`.
- `dev:full`: ejecuta `build:engine` y luego `dev`.

## 4. Scripts por paquete
### `@maxflow/api`
- `dev`: servidor con recarga.
- `build`: compilar TS.
- `test`: vitest + supertest.
- `lint`: lint de API.

### `@maxflow/web`
- `dev`: vite dev.
- `build`: vite build.
- `test`: pruebas unitarias UI (si aplica).
- `lint`: lint de web.

### `services/engine-cpp`
- `build`: compilacion CMake con salida en `build/`.
- `test`: suite GoogleTest.
- `run`: ejecucion manual del binario.

## 5. Comandos operativos canonicos
```bash
pnpm dev
pnpm test
pnpm build
pnpm lint
pnpm --filter @maxflow/api test
pnpm --filter @maxflow/web dev
```

Helpers utiles:
```bash
pnpm run build:engine
pnpm run dev:full
```

## 6. Regla de cambios
Si se cambia un nombre de paquete o script canonico:
1. actualizar este documento,
2. actualizar `docs/00-product/ImplementationRoute.md`,
3. actualizar `docs/50-operations/LocalRunbook.md`.
