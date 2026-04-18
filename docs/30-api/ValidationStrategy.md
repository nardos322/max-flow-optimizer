# Estrategia de Validacion v1

## 1. Decision
Usar `Zod` como fuente principal del contrato estructural compartido entre API y frontend.

`packages/domain` se mantiene como fuente de reglas semanticas y cross-field del problema.

## 2. Motivacion
- API y frontend estan en TypeScript.
- El frontend necesita validar formularios y construir payloads con los mismos tipos que consume la API.
- Mantener JSON Schema escrito a mano duplica definiciones y aumenta el riesgo de drift.
- Zod permite derivar tipos TypeScript con `z.infer` desde el mismo schema ejecutable.

## 3. Separacion de responsabilidades
### `packages/contracts`
- Define schemas Zod para request, response, health y error.
- Exporta tipos TypeScript derivados de esos schemas.
- Expone helpers de validacion estructural para API, web y tests.
- Puede generar OpenAPI/JSON Schema como artefacto publicado si se necesita documentacion formal.

### `packages/domain`
- Valida reglas que requieren contexto entre colecciones.
- No depende de Express, React ni detalles HTTP.
- No reemplaza schemas estructurales de `packages/contracts`.

### `apps/api`
- Valida `req.body` con `SolveRequestSchema.safeParse`.
- Normaliza errores Zod al envelope de error API v1.
- Ejecuta `packages/domain` despues de la validacion estructural.
- Llama al engine solo con input ya validado.

### `apps/web`
- Importa schemas y tipos desde `@maxflow/contracts`.
- Usa los schemas con `react-hook-form` y `@hookform/resolvers/zod`.
- Evita tipos duplicados para el payload enviado a `POST /v1/solve`.

## 4. Regla schema vs dominio
Poner en Zod:
- campos requeridos,
- tipos primitivos,
- longitud minima/maxima,
- enteros y numeros no negativos,
- formato simple de fechas,
- shape exacto de request/response/error.

Mantener en `packages/domain`:
- unicidad de IDs,
- unicidad de fechas,
- referencias existentes entre `periods`, `days`, `medics` y `availability`,
- pertenencia exacta de cada dia a un periodo,
- limites operativos,
- reglas futuras de negocio.

No usar `.superRefine()` para absorber toda la logica de dominio salvo que una regla sea claramente estructural y local al objeto.

## 5. Plan de migracion
1. Agregar `zod` a `packages/contracts`.
2. Crear `packages/contracts/src/v1/schemas.ts` con schemas Zod.
3. Crear/exportar tipos con `z.infer`.
4. Reemplazar `createValidatorSet` para que use Zod internamente o exponer una API equivalente durante la transicion.
5. Cambiar `apps/api` para validar request/response con los helpers de `@maxflow/contracts`.
6. Mantener `packages/domain` sin cambios funcionales.
7. Actualizar tests de `packages/contracts` y `apps/api`.
8. Quitar `ajv` y `ajv-formats` cuando ningun test/codigo los use.
9. Definir si OpenAPI/JSON Schema queda como artefacto generado o como documentacion estatica.

## 6. Criterio de aceptacion
- `pnpm test`, `pnpm lint`, `pnpm typecheck` y `pnpm build` pasan.
- API sigue rechazando payloads mal formados antes de ejecutar reglas de dominio.
- API sigue rechazando errores semanticos desde `packages/domain`.
- Frontend puede importar `SolveRequestV1` y `SolveRequestSchema` desde `@maxflow/contracts`.
- No existen tipos duplicados de request/response entre API y web.
