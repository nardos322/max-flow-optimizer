# packages/contracts

Contratos HTTP publicos (`v1`) consumidos por frontend, API y tests.

## Contenido esperado
- OpenAPI 3.1.
- JSON Schemas.
- Tipos TypeScript formales alineados al contrato v1.
- Ejemplos de request/response canonicamente validos.

## Estructura v1
```text
packages/contracts/v1/
├── openapi.yaml
└── schemas/
    ├── solve.request.schema.json
    ├── solve.response.schema.json
    ├── error.schema.json
    └── health.response.schema.json
```

Los tipos consumibles por TypeScript se exportan desde:
- `@maxflow/contracts`
- `@maxflow/contracts/v1`
