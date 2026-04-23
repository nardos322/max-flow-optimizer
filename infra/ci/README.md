# infra/ci

Configuraciones y scripts de CI.

## Pipeline objetivo
- Lint
- Test
- Build

## Implementacion actual
- Workflow: `.github/workflows/ci.yml`
- Runtime objetivo: `ubuntu-latest`
- Toolchain:
  - Node.js `20.12.2`
  - pnpm `9.12.2`
  - CMake + Ninja para `services/engine-cpp`
