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
│   ├── contracts/        # Schemas y tipos compartidos API/engine
│   └── test-data/        # Datasets JSON y expected outputs
├── infra/
│   └── ci/               # Pipelines y scripts de calidad
├── scripts/              # Scripts de desarrollo/local tooling
└── docs/                 # Especificaciones y decisiones
```

## 3. Responsabilidades por modulo
- `apps/api`: valida input, llama al motor, devuelve contrato estable.
- `apps/web`: experiencia de demo y visualizacion de asignaciones.
- `services/engine-cpp`: algoritmo de flujo maximo y extraccion de solucion.
- `packages/domain`: invariantes de negocio y utilidades de mapeo.
- `packages/contracts`: fuente unica de verdad para formato de datos.
- `packages/test-data`: fixtures usados por unit/integration/e2e.

## 4. Convenciones sugeridas
- Versionado semantico de contrato (`v1`, `v2`).
- Tests cercanos al modulo que validan.
- Prohibir dependencias circulares entre paquetes.
- CI con etapas: lint -> test -> build.
