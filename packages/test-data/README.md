# packages/test-data

Fixtures canonicos y expected files usados por unit, integration, smoke y benchmark.

## Estructura canonica
```text
packages/test-data/
├── fixtures.manifest.json
├── input/
│   ├── tiny-feasible.json
│   ├── tiny-infeasible-availability.json
│   ├── tiny-infeasible-capacity.json
│   ├── tiny-infeasible-per-period.json
│   ├── invalid-duplicate-id.json
│   ├── invalid-duplicate-day-date.json
│   ├── invalid-day-without-period.json
│   ├── invalid-day-in-multiple-periods.json
│   ├── valid-non-contiguous-period.json
│   ├── valid-medic-without-availability.json
│   ├── valid-same-instance-different-order.json
│   ├── medium-random-50x50.json
│   └── large-random-200x200.json
└── expected/
    ├── *.response.json
    └── *.error.json
```

## Convenciones
- Inputs en `kebab-case`.
- Casos `HTTP 200` usan sufijo `.response.json`.
- Casos `HTTP 400` usan sufijo `.error.json`.
- `instanceId` debe ser estable por fixture.
- Las fechas deben ser absolutas en formato `YYYY-MM-DD`.
- Los casos canonicos usan snapshots exactos; solo se excluyen de igualdad literal `requestId` y `timestamp` en errores.

## Uso en tests
- `exact-response`: comparar cuerpo `HTTP 200` exacto.
- `exact-error`: comparar cuerpo `HTTP 400` exacto, salvo `requestId` y `timestamp` por shape.
- `invariants-only`: validar invariantes funcionales y limites de tiempo.
- `fixtures.manifest.json` es la fuente de verdad para descubrir fixtures y modo de asercion.
