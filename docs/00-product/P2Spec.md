# P2 Spec - Optimization v2

## 1. Objetivo
P2 convierte el solver de factibilidad en un solver de asignacion factible y optimizada.

La pregunta deja de ser solo:

```text
Existe una asignacion valida?
```

y pasa a ser:

```text
Entre las asignaciones validas, cual es la mejor segun un objetivo explicito?
```

P2a se enfoca en equidad de carga entre medicos y adopta min-cost max-flow como decision tecnica para optimizacion.

## 2. Decision tecnica
La optimizacion P2 se implementa con min-cost max-flow.

Motivos:
- El problema ya esta modelado como red de flujo.
- El requisito nuevo necesita elegir entre multiples flujos maximos factibles.
- Los costos permiten expresar preferencias, penalizaciones y desempates sin romper las restricciones duras.
- Es una base extensible para objetivos futuros como preferencias, costos operativos o penalizaciones por periodo.

La implementacion debe mantener el solver de factibilidad actual como comportamiento compatible cuando no se solicita optimizacion.

## 3. Principios
- Primero se satisfacen restricciones duras; despues se optimiza calidad.
- Ningun objetivo de optimizacion puede producir una asignacion invalida.
- El contrato `v1` sigue siendo compatible mediante campos opcionales.
- La salida debe ser deterministica para el mismo input y objetivo.
- Los scores deben ser explicables en API, UI y CSV/JSON.

## 4. Alcance P2a
Incluido:
- Objetivo `fairness` para balancear carga entre medicos.
- Campo opcional `optimization` en `POST /v1/solve`.
- Metricas de optimizacion opcionales en la response.
- Motor min-cost max-flow en C++.
- Fixtures donde existen multiples soluciones factibles y la optimizacion cambia la asignacion elegida.
- UI con resumen de distribucion por medico.
- Export JSON/CSV con metricas P2 cuando existan.
- Historial P1 conserva request, response y metricas de optimizacion.

Fuera de alcance P2a:
- Auth, RBAC y multi-hospital.
- Preferencias individuales editables por usuario.
- Pesos arbitrarios configurables desde UI.
- Optimizacion multiobjetivo completa.
- Batch solving.
- Dashboard historico de tendencias.
- Persistencia CRUD de reglas de optimizacion.
- Migracion a PostgreSQL.

## 5. Contrato request
`optimization` es opcional.

Request compatible sin optimizacion:

```json
{
  "instanceId": "demo-001",
  "maxDaysPerMedic": 2,
  "periods": [],
  "days": [],
  "medics": [],
  "availability": []
}
```

Request con P2a:

```json
{
  "instanceId": "demo-001",
  "maxDaysPerMedic": 2,
  "periods": [],
  "days": [],
  "medics": [],
  "availability": [],
  "optimization": {
    "objective": "fairness"
  }
}
```

Tipo objetivo:

```ts
type OptimizationObjectiveV1 = 'none' | 'fairness';

type OptimizationRequestV1 = {
  objective: OptimizationObjectiveV1;
};
```

Reglas:
- Si `optimization` no existe, el comportamiento es equivalente a `objective='none'`.
- `objective='none'` mantiene semantica MVP/P1.
- `objective='fairness'` solicita min-cost max-flow con costos de balance de carga.

## 6. Semantica de fairness
P2a busca una asignacion factible con carga mas pareja entre medicos.

Definicion base:
- `assignedDays(m)` es la cantidad de dias asignados al medico `m`.
- `maxAssignedDays` es el maximo de `assignedDays`.
- `minAssignedDays` es el minimo de `assignedDays` entre medicos considerados.
- `spread = maxAssignedDays - minAssignedDays`.

Objetivo P2a:
1. Maximizar flujo hasta cubrir todos los dias posibles bajo las restricciones duras.
2. Si la instancia es factible, minimizar una funcion de costo que penaliza concentrar dias en el mismo medico.
3. Si hay empate de costo, preservar determinismo por orden canonico de ids.

La funcion de costo exacta queda documentada en `docs/10-model/Model.md`.

Funcion de costo P2a:
- Cada medico tiene aristas de capacidad unitaria por nivel de carga.
- El primer dia asignado a un medico cuesta menos que el segundo, el segundo menos que el tercero, etc.
- Costos crecientes empujan el flujo a repartir dias antes de concentrarlos.
- Para la carga marginal `k`, el costo es `k * (k - 1) / 2`.

Ejemplo conceptual:

| Carga marginal del medico | Costo |
|---:|---:|
| 1er dia | 0 |
| 2do dia | 1 |
| 3er dia | 3 |
| 4to dia | 6 |

Estos valores son parte del contrato funcional P2a y no deben cambiar sin actualizar fixtures, docs y criterios de aceptacion.

## 7. Response
Cuando se solicita optimizacion, la response agrega `optimization`.

```json
{
  "instanceId": "demo-001",
  "feasible": true,
  "requiredFlow": 4,
  "maxFlow": 4,
  "assignments": [],
  "stats": {
    "nodes": 20,
    "edges": 40,
    "runtimeMs": 3
  },
  "optimization": {
    "objective": "fairness",
    "optimal": true,
    "score": 2,
    "totalCost": 2,
    "maxAssignedDays": 2,
    "minAssignedDays": 1,
    "spread": 1,
    "loadByMedic": [
      { "medicId": "m1", "medicName": "Ana", "assignedDays": 2 },
      { "medicId": "m2", "medicName": "Luis", "assignedDays": 1 },
      { "medicId": "m3", "medicName": "Marta", "assignedDays": 1 }
    ]
  }
}
```

Reglas:
- `optimization` aparece solo si se pidio un objetivo distinto de `none`.
- `optimal=true` significa que el motor encontro el flujo maximo de costo minimo para el modelo implementado.
- `score` es un alias publico estable para comparar calidad dentro del mismo objetivo.
- `totalCost` puede exponerse para trazabilidad tecnica.
- `loadByMedic` se ordena por `medicId`.

## 8. Infactibilidad
Si `objective='fairness'` y la instancia es infactible:
- La response mantiene `feasible=false`.
- Los diagnosticos P1 siguen aplicando.
- `optimization` puede omitirse o incluir `optimal=false`; P2a debe elegir una sola regla y documentarla antes de implementar.

Recomendacion:
- Omitir `optimization` cuando `feasible=false`, porque no existe asignacion completa que optimizar.

## 9. UI
La UI debe:
- Permitir seleccionar modo `Factibilidad` o `Equidad`.
- Mantener `Factibilidad` como default compatible.
- Mostrar panel de distribucion por medico cuando exista `response.optimization`.
- Mostrar `spread`, `maxAssignedDays`, `minAssignedDays` y `score`.
- Mantener fallback limpio para responses MVP/P1 sin `optimization`.

No se requiere editor avanzado de pesos en P2a.

## 10. Exportacion
JSON:
- Exporta la response completa, incluyendo `optimization`.

CSV:
- Mantiene columnas P1.
- Agrega columnas P2 cuando existan:
  - `optimizationObjective`
  - `optimizationScore`
  - `optimizationTotalCost`
  - `medicAssignedDays`
  - `loadSpread`

Historial:
- La corrida persistida conserva `optimization` dentro de request y response.

## 11. Analytics
P2a debe agregar al menos una medicion comparativa:
- runtime de factibilidad vs fairness,
- costo total,
- spread,
- distribucion por medico.

`pnpm analytics:compare` debe seguir funcionando y puede sumar columnas P2 si el dataset incluye escenarios optimizados.

## 12. Criterios de aceptacion
P2a se considera completo cuando:
- Requests sin `optimization` mantienen snapshots y comportamiento P1.
- `optimization.objective='fairness'` valida por contrato.
- El engine implementa min-cost max-flow con tests unitarios.
- Toda asignacion optimizada cumple restricciones duras existentes.
- En un fixture con multiples soluciones factibles, `fairness` reduce `spread` o mejora `score` frente al modo `none`.
- La API devuelve `optimization` con metricas ordenadas y deterministicas.
- La UI permite elegir `Equidad` y muestra distribucion por medico.
- Export JSON/CSV incluye metricas P2.
- Historial guarda y muestra corridas optimizadas.
- `pnpm test`, `pnpm build`, `pnpm lint`, `pnpm typecheck` pasan.

## 13. Riesgos
- Min-cost max-flow puede aumentar complejidad y runtime.
- La funcion de costo puede no capturar todas las nociones humanas de equidad.
- Empates mal definidos pueden romper determinismo.
- Agregar optimizacion al contrato puede contaminar el modo simple si no se mantiene opcional.

Mitigaciones:
- Mantener `objective='none'` como default.
- Agregar fixtures pequenos con resultado esperado exacto.
- Medir performance desde el primer corte.
- Documentar la funcion de costo formalmente antes de ampliar objetivos.
