# Dependency List - MVP v1

## 1. Objetivo
Definir un set minimo de dependencias para construir el MVP sin sobrecargar el stack.

## 2. Principios
- Preferir pocas dependencias, bien mantenidas.
- Fijar versiones (evitar rangos amplios en v1).
- Toda dependencia debe mapearse a una necesidad concreta.

## 3. Core C++ (`services/engine-cpp`)
### Dependencias
- `nlohmann/json@3.11.3`: parseo JSON de entrada/salida.
- `googletest@1.14.0`: pruebas unitarias del motor.
- `CLI11@2.4.2`: parseo de argumentos CLI.

### Notas de instalacion
- Gestion recomendada en CMake con `FetchContent`.
- Mantener wrappers simples para no acoplar toda la base de codigo.

## 4. API (`apps/api`)
### Dependencias
- `express@4.18.2`: servidor HTTP.
- `pino@8.17.2`: logging estructurado.
- `vitest@1.6.0`: test runner.
- `supertest@6.3.4`: pruebas de endpoints.
- `typescript@5.4.5`: compilacion TypeScript.
- `@types/express@4.17.21`: tipos Express.
- `@types/supertest@2.0.16`: tipos Supertest.

### Comando orientativo
```bash
pnpm --filter @maxflow/api add express pino
pnpm --filter @maxflow/api add -D vitest supertest @types/supertest @types/express typescript
```

## 5. Contracts (`packages/contracts`)
### Dependencias
- `zod@3.22.4`: schemas ejecutables compartidos y tipos derivados para API/web.

### Comando orientativo
```bash
pnpm --filter @maxflow/contracts add zod
```

## 6. Web (`apps/web`)
### Dependencias
- `react@18.2.0` + `react-dom@18.2.0`: UI.
- `vite@5.2.0`: bundler/dev server.
- `tailwindcss@3.4.3`: estilos del MVP.
- `react-hook-form@7.51.5`: manejo de formularios y estado de input.
- `@hookform/resolvers@3.6.0`: puente entre `react-hook-form` y `zod`.
- `typescript@5.4.5`: compilacion TypeScript.
- `@types/react@18.2.66` y `@types/react-dom@18.2.22`: tipos.
- `postcss@8.4.38` y `autoprefixer@10.4.19`: pipeline CSS.

### Comando orientativo
```bash
pnpm --filter @maxflow/web add react react-dom react-hook-form @hookform/resolvers
pnpm --filter @maxflow/web add -D vite typescript tailwindcss postcss autoprefixer @types/react @types/react-dom
```

## 7. Dependencias diferidas (v1.1+)
- Generador OpenAPI/JSON Schema desde Zod solo si se publica documentacion formal automatizada.
- Persistencia (`better-sqlite3` o similar) solo si se habilita historial.
- Telemetria avanzada (OpenTelemetry) solo si hay necesidad real.
- Autenticacion (`jsonwebtoken`, etc.) solo en v2.

## 8. Criterio de aceptacion de nuevas dependencias
Agregar una dependencia nueva solo si:
1. Existe necesidad real en tareas P0/P1.
2. Reduce complejidad neta frente a construirlo a mano.
3. Tiene licencia y mantenimiento adecuados.
4. Se documenta su uso en este archivo.

## 9. Versiones de toolchain (fijas para v1)
- `Node.js`: `20.12.2`
- `pnpm`: `9.12.2`
- `CMake`: `3.28.3`
- `C++ standard`: `C++20`
