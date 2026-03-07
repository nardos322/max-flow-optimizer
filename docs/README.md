# Documentacion de Planificacion (Pre-codigo)

Este directorio contiene la especificacion completa del MVP antes de iniciar implementacion.

## Estructura
```text
docs/
├── 00-product/
├── 10-model/
├── 20-architecture/
├── 30-api/
├── 40-quality/
└── README.md
```

## Indice por carpeta
### `00-product`
- `00-product/PRD.md`: alcance, objetivos, criterios y riesgos.
- `00-product/Roadmap.md`: plan de ejecucion.
- `00-product/BACKLOG.md`: priorizacion por versiones.
- `00-product/ImplementationRoute.md`: ruta en tareas secuenciadas.
- `00-product/ReleaseChecklist.md`: checklist de salida.
- `00-product/DemoScript.md`: guion de demo para portfolio.
- `00-product/LocalRunbook.md`: arranque local paso a paso.

### `10-model`
- `10-model/Model.md`: formulacion, correctitud y complejidad.

### `20-architecture`
- `20-architecture/Monorepo.md`: estructura del repositorio.
- `20-architecture/StackDecision.md`: stack congelado v1.
- `20-architecture/ArchitecturePrinciples.md`: reglas para crecer con baja friccion.
- `20-architecture/EngineSpec.md`: especificacion CLI del motor C++.
- `20-architecture/EngineIntegrationContract.md`: contrato interno API <-> engine.
- `20-architecture/DependencyPolicy.md`: criterio de dependencias y anti-reinvencion.
- `20-architecture/DependencyList.md`: dependencias minimas recomendadas para v1.
- `20-architecture/RuntimeConfig.md`: variables de entorno y defaults.
- `20-architecture/WorkspaceScripts.md`: nombres de paquetes y scripts canonicos.

### `30-api`
- `30-api/API.md`: contrato HTTP.
- `30-api/ErrorCatalog.md`: catalogo de errores.
- `30-api/OpenAPI.md`: reglas de contrato formal.

### `40-quality`
- `40-quality/TestPlan.md`: estrategia de pruebas.
- `40-quality/CI.md`: quality gates de CI.
- `40-quality/NonFunctionalLimits.md`: limites operativos y SLO.
- `40-quality/Observability.md`: logs y metricas.
- `40-quality/WorkflowConventions.md`: ramas, commits y PR.
- `40-quality/RiskPlaybook.md`: respuestas a riesgos tecnicos.
- `40-quality/TraceabilityMatrix.md`: trazabilidad tareas -> tests.

## Orden recomendado de lectura
1. `00-product/PRD.md`
2. `10-model/Model.md`
3. `30-api/API.md`
4. `20-architecture/EngineSpec.md`
5. `40-quality/TestPlan.md`
6. `00-product/Roadmap.md`
7. `20-architecture/Monorepo.md`
8. `20-architecture/StackDecision.md`
9. `20-architecture/ArchitecturePrinciples.md`
10. `20-architecture/DependencyPolicy.md`
11. `20-architecture/DependencyList.md`
12. `00-product/BACKLOG.md`
13. `00-product/ImplementationRoute.md`
14. `20-architecture/RuntimeConfig.md`
15. `20-architecture/WorkspaceScripts.md`
16. `30-api/OpenAPI.md`
17. `20-architecture/EngineIntegrationContract.md`
18. `40-quality/NonFunctionalLimits.md`
19. `40-quality/Observability.md`
20. `40-quality/WorkflowConventions.md`
21. `40-quality/TraceabilityMatrix.md`
22. `40-quality/RiskPlaybook.md`
23. `00-product/LocalRunbook.md`
24. `00-product/ReleaseChecklist.md`
25. `00-product/DemoScript.md`
