# Backlog Priorizado

## Politica de uso
- Todo item nuevo entra aqui primero.
- Nada entra en implementacion v1 si no es bloqueo directo del DoD.
- Prioridad: `P0` (MVP), `P1` (v1.1), `P2` (v2+).

## P0 - MVP (obligatorio)
1. Definir workspace monorepo y scripts base (`dev`, `test`, `build`).
2. Implementar contrato `POST /v1/solve` y `GET /health`.
3. Implementar parser/validador de instancia.
4. Implementar motor C++ de flujo maximo.
5. Extraer asignaciones desde residual.
6. Integrar API con engine CLI.
7. Armar UI minima con secciones `Periodos`, `Medicos` y `Planificador`, resultado y metricas.
8. Crear fixtures base factible/infactible.
9. Tests unitarios motor + integracion API.
10. README de demo end-to-end.

## P1 - v1.1 (mejoras sin romper MVP)
Spec de alcance: `docs/00-product/P1Spec.md`.
Ruta de implementacion: `docs/00-product/P1ImplementationRoute.md`.

1. Persistir corridas en SQLite.
2. Endpoint `GET /v1/runs` para historial.
3. Diagnosticos de infactibilidad mas completos.
4. Comparativa de performance por dataset.
5. Docker compose para demo one-command.
6. Exportacion CSV enriquecida.

## P2 - v2+ (expansion)
Spec de alcance inicial: `docs/00-product/P2Spec.md`.
Ruta de implementacion: `docs/00-product/P2ImplementationRoute.md`.

1. P2a: Optimizacion por equidad con min-cost max-flow.
2. Preferencias y penalizaciones configurables.
3. Batch solving y pipelines de analitica/big data.
4. Dashboard historico y tendencias.
5. Autenticacion (JWT o session-based).
6. Soporte multi-hospital (tenantId).
7. RBAC basico (admin/viewer).

## Criterio de entrada a sprint
Cada item debe incluir:
- objetivo claro,
- criterio de aceptacion medible,
- impacto en contratos,
- estrategia de test.
