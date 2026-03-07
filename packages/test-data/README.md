# packages/test-data

Datasets de prueba y expected outputs para unit/integration/e2e.

## Estructura recomendada
```text
packages/test-data/
├── fixtures.manifest.json
├── input/
│   ├── tiny-feasible.json
│   ├── tiny-infeasible-availability.json
│   ├── tiny-infeasible-capacity.json
│   ├── tiny-infeasible-per-period.json
│   └── medium-random-50x50.json
└── expected/
    ├── tiny-feasible.output.json
    ├── tiny-infeasible-availability.output.json
    ├── tiny-infeasible-capacity.output.json
    └── tiny-infeasible-per-period.output.json
```

## Convenciones
- Inputs en `snake-case`.
- Outputs con sufijo `.output.json`.
- `instanceId` debe ser estable por fixture.
- Evitar fechas relativas; usar fechas absolutas (`YYYY-MM-DD`).
- Los expected en v1 usan `matchMode=subset` (se comparan campos relevantes, no igualdad total del JSON).

## Invariantes que deben validar los expected
- `feasible=true` => `assignments.length == requiredFlow`.
- `feasible=false` => `maxFlow < requiredFlow`.
- Toda asignacion respeta disponibilidad y restricciones de dominio.
- Orden determinista por `dayId`.

## Uso en tests
- Unit tests del motor consumen `input/*` y comparan invariantes.
- Integration tests API comparan contra `expected/*` (golden files).
- Casos `medium-*` se usan para smoke de performance, no para snapshots estrictos.
- `fixtures.manifest.json` es la fuente de verdad para descubrir fixtures desde scripts de test.
- En `matchMode=subset`, se ignoran campos no deterministas (ej: `stats.runtimeMs`).
