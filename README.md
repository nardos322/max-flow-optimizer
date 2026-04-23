# Max Flow Optimizer

MVP para asignar feriados a medicos usando un modelo de flujo maximo con motor C++, API TypeScript y frontend React.

## Problema
Cada dia necesita exactamente un medico asignado. El sistema respeta:
- disponibilidad por dia,
- limite global `C` (`maxDaysPerMedic`),
- maximo un dia por periodo para cada medico.

La UI permite cargar la instancia, resolverla y exportar el resultado en JSON o CSV.

## Arquitectura
```mermaid
flowchart LR
  UI[apps/web\nReact + Vite] -->|POST /v1/solve| API[apps/api\nExpress + TypeScript]
  API -->|stdin JSON wrapper\n{ requestId, input }| ENGINE[services/engine-cpp\nEdmonds-Karp]
  API --> CONTRACTS[packages/contracts\nSchemas Zod + tipos]
  API --> DOMAIN[packages/domain\nValidaciones semanticas]
  UI --> CONTRACTS
  ENGINE --> FIXTURES[packages/test-data\nFixtures canonicos]
  API --> FIXTURES
```

## Estado actual
- Bloques `0` a `4` implementados.
- `apps/web` ya expone `Periodos`, `Medicos` y `Planificador`.
- Existe pipeline minima `lint -> test -> build` en `.github/workflows/ci.yml`.
- Hay scripts locales de smoke y benchmark para la API.

La ruta de trabajo canonica sigue en [ImplementationRoute.md](/home/nardos322/max-flow-optimizer/docs/00-product/ImplementationRoute.md).

## Estructura
- `apps/api`: API HTTP y adaptador al engine.
- `apps/web`: UI del MVP.
- `packages/contracts`: contrato HTTP publico v1 y schemas compartidos.
- `packages/domain`: validaciones de dominio y limites operativos.
- `packages/test-data`: fixtures canonicos y expected files.
- `services/engine-cpp`: solver C++.

## Quickstart
```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm run dev:full
```

URLs locales:
- Web: `http://127.0.0.1:4173`
- API: `http://127.0.0.1:3000`

## Comandos utiles
```bash
pnpm dev
pnpm lint
pnpm test
pnpm build
pnpm smoke:api
pnpm benchmark:api
```

## Flujo de demo
1. Cargar `Fixture OK` en la UI.
2. Revisar `Periodos` y `Medicos`.
3. Resolver desde `Planificador`.
4. Exportar JSON/CSV.
5. Cargar `Fixture KO` para mostrar el diagnostico infactible.

El guion completo esta en [DemoScript.md](/home/nardos322/max-flow-optimizer/docs/00-product/DemoScript.md).

## Calidad
- Smoke local actual: `tiny-feasible`, `tiny-infeasible-availability` y `medium-random-50x50`.
- Benchmark local documentado en [BenchmarkReport.md](/home/nardos322/max-flow-optimizer/docs/40-quality/BenchmarkReport.md).
- Observacion actual: `medium-random-50x50` cumple holgadamente; `large-random-200x200` corre sin `5xx`, pero todavia queda por encima del objetivo `p95 <= 1000 ms`.

## Tradeoffs y siguientes pasos
- v1 prioriza factibilidad y trazabilidad sobre optimizacion avanzada.
- No hay persistencia ni autenticacion.
- La principal deuda abierta de cierre es performance de `large-random-200x200` y artefactos visuales de portfolio (capturas/GIF).

## Documentacion clave
1. [docs/README.md](/home/nardos322/max-flow-optimizer/docs/README.md)
2. [PRD.md](/home/nardos322/max-flow-optimizer/docs/00-product/PRD.md)
3. [API.md](/home/nardos322/max-flow-optimizer/docs/30-api/API.md)
4. [LocalRunbook.md](/home/nardos322/max-flow-optimizer/docs/50-operations/LocalRunbook.md)
5. [ReleaseChecklist.md](/home/nardos322/max-flow-optimizer/docs/00-product/ReleaseChecklist.md)
