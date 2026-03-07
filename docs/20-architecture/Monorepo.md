# Estructura de Monorepo Propuesta

## 1. Objetivo
Separar claramente dominio, motor de optimizacion y capas de interfaz para facilitar mantenimiento y demostracion de arquitectura.

## 2. Estructura
```text
.
├── apps/
│   ├── api/              # API HTTP (validacion + orquestacion del motor)
│   └── web/              # UI MVP para cargar instancia y mostrar resultado
├── services/
│   └── engine-cpp/       # Motor C++ de flujo maximo
├── packages/
│   ├── domain/           # Tipos, validaciones y casos de uso
│   ├── contracts/        # Schemas y tipos del contrato HTTP publico
│   └── test-data/        # Datasets JSON y expected outputs
├── infra/
│   └── ci/               # Pipelines y scripts de calidad
├── scripts/              # Scripts de desarrollo/local tooling
└── docs/                 # Especificaciones, contratos y operacion
    ├── 00-product/       # Alcance, roadmap, backlog y UX/frontend spec
    ├── 10-model/         # Modelo matematico y correctitud
    ├── 20-architecture/  # Decisiones tecnicas y contratos internos
    ├── 30-api/           # Contrato HTTP publico
    ├── 40-quality/       # Pruebas, SLO, benchmark y observabilidad
    └── 50-operations/    # Runtime config y runbooks locales
```

## 3. Responsabilidades por modulo
- `apps/api`: valida input, llama al motor, devuelve contrato estable.
- `apps/web`: experiencia de demo y visualizacion de asignaciones.
- `services/engine-cpp`: algoritmo de flujo maximo y extraccion de solucion.
- `packages/domain`: invariantes de negocio y utilidades de mapeo.
- `packages/contracts`: fuente unica de verdad para request/response HTTP estructurales.
- `packages/test-data`: fixtures usados por unit/integration/e2e.
- `docs/00-product`: define que se construye y como se demoa.
- `docs/10-model`: define el modelo de flujo y sus propiedades.
- `docs/20-architecture`: define como se conectan y evolucionan los modulos.
- `docs/30-api`: define el contrato HTTP consumido por web y tests.
- `docs/40-quality`: define como se verifica correctitud, rendimiento y trazabilidad.
- `docs/50-operations`: define como correr y configurar el sistema localmente.

## 4. Convenciones sugeridas
- Versionado semantico de contrato (`v1`, `v2`).
- Tests cercanos al modulo que validan.
- Prohibir dependencias circulares entre paquetes.
- CI con etapas: lint -> test -> build.
