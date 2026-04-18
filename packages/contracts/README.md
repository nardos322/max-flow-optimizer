# packages/contracts

Contratos HTTP publicos (`v1`) consumidos por frontend, API y tests.

## Contenido esperado
- Schemas Zod como fuente primaria del contrato estructural.
- Tipos TypeScript derivados y alineados al contrato v1.
- OpenAPI/JSON Schema como artefactos derivados o documentacion formal si se publican.
- Ejemplos de request/response canonicamente validos.

## Estructura objetivo v1
```text
packages/contracts/src/v1/
├── schemas.ts
├── types.ts
└── index.ts
```

Los tipos consumibles por TypeScript se exportan desde:
- `@maxflow/contracts`
- `@maxflow/contracts/v1`

Las reglas semanticas/cross-field viven en `packages/domain`, no en este paquete.
