# Stack Decision - MVP v1

## 1. Objetivo
Congelar el stack tecnico del MVP para evitar scope creep y acelerar entrega de una demo de portafolio.

## 2. Decisiones v1 (cerradas)
- Core algoritmo: `C++20` + `CMake` + `GoogleTest`.
- API: `Node.js` + `TypeScript` + `Express` + `Zod`.
- Frontend: `React` + `Vite` + `Tailwind CSS` + `React Hook Form` + `Zod`.
- Estado frontend: `React Context` + `useReducer`.
- Monorepo: `pnpm workspaces`.
- Persistencia: **sin base de datos en v1** (modo stateless).

## 3. Justificacion
### Core C++
- Demuestra dominio de estructuras de datos, grafos y performance.
- CMake permite build reproducible y portable.
- GoogleTest da confianza en correctitud del motor.

### API TS + Express + Zod
- Integracion simple con un binario CLI.
- `Zod` permite compartir schemas ejecutables y tipos TypeScript entre API y frontend.
- `packages/contracts` mantiene la fuente de verdad del contrato estructural.
- `packages/domain` mantiene aparte las reglas semanticas y cross-field.

### Front React + Vite + Tailwind
- Setup rapido para demo funcional.
- Vite reduce tiempos de desarrollo.
- Tailwind acelera UI MVP sin invertir en sistema de diseno.
- `React Hook Form` reduce boilerplate de formularios y mejora performance en inputs controlados y no controlados.
- `Zod` cubre validacion local de formularios en cliente y reutiliza el contrato de `packages/contracts`.
- `React Context` + `useReducer` alcanza para el estado global del MVP sin introducir una store externa.

### Sin DB en v1
- El problema principal es resolver instancias, no gestionar datos historicos.
- Evita complejidad operativa innecesaria para portafolio inicial.

## 4. Alternativas consideradas
- `Fastify` en lugar de Express: mejor performance, pero menor familiaridad y sin necesidad real para MVP.
- `AJV` + JSON Schema como fuente primaria: interoperable y solido, pero menos conveniente cuando API y web comparten TypeScript.
- `PostgreSQL`: descartado en v1 por sobrecosto operacional.
- `SQLite`: opcional para v1.1 si se quiere guardar historial de corridas.

## 5. Riesgos y mitigaciones
- Riesgo: acoplamiento API <-> CLI.
  - Mitigacion: contrato JSON versionado (`v1`) y tests de integracion.
- Riesgo: debugging cross-language.
  - Mitigacion: errores estructurados en JSON y codigos de salida estables.
- Riesgo: crecimiento no controlado.
  - Mitigacion: backlog separado y prohibicion de features fuera de DoD v1.

## 6. Fuera de alcance v1
- Autenticacion y autorizacion.
- Multi-hospital / multi-tenant.
- Optimizacion avanzada (equidad, preferencias, costos).
- Arquitectura distribuida y colas de trabajos.

## 7. Plan v1.1 / v2 (no bloquear v1)
- v1.1: persistencia de corridas en SQLite y pantalla de historial.
- v2: autenticacion, soporte multi-hospital y objetivos de optimizacion.

## 8. Criterio de cambio
Este stack solo se cambia si:
1. Bloquea directamente un criterio de aceptacion del MVP, o
2. Introduce un riesgo tecnico severo probado con evidencia.
