# Convenciones de Trabajo

## 1. Objetivo
Reducir friccion de colaboracion y mantener cambios pequeños, verificables y trazables.

## 2. Estrategia de ramas
- `main`: siempre estable.
- feature branches: `feat/<scope>-<short-name>`
- fix branches: `fix/<scope>-<short-name>`
- docs branches: `docs/<short-name>`

## 3. Convencion de commits
Formato recomendado:
- `feat(api): add /v1/solve validation`
- `feat(engine): implement bfs augmenting path`
- `test(engine): add infeasible per-period case`
- `docs(model): clarify correctness proof`

## 4. Politica de PR
- PR pequeño (ideal <= 400 lineas netas).
- Debe incluir:
  - objetivo del cambio,
  - impacto en contrato,
  - evidencia de test.
- No merge con CI en rojo.

## 5. Reglas de documentacion
- Si cambia contrato o comportamiento visible, actualizar docs en el mismo PR.
- Si surge idea fuera de alcance, registrar en `docs/00-product/BACKLOG.md`.

## 6. Definicion de listo para review
- Compila localmente.
- Tests relevantes en verde.
- Cambios explicados en PR.
- No deuda critica sin ticket asociado.
