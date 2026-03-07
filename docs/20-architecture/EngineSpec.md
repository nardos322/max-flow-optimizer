# Especificacion del Motor C++ (CLI)

## 1. Objetivo
Implementar un ejecutable C++ que reciba una instancia del problema y retorne factibilidad y asignaciones usando Edmonds-Karp.

## 2. Interfaz de linea de comandos
- Binario: `maxflow_engine`
- Uso recomendado:
  - `maxflow_engine --input <path-json>`
  - `maxflow_engine --stdin` (lee JSON desde stdin)

## 3. Entrada esperada
El engine consume el contrato interno definido en `docs/20-architecture/EngineIntegrationContract.md`.

Shape de entrada (`stdin`) v1:
```json
{
  "requestId": "8e950b8f-f8c3-49fc-835b-4015f4963ca1",
  "input": {
    "instanceId": "demo-001",
    "maxDaysPerMedic": 2,
    "periods": [],
    "days": [],
    "medics": [],
    "availability": []
  }
}
```

Reglas:
- `requestId` es obligatorio para correlacion de logs.
- `input` corresponde al request HTTP publico ya validado por API.
- En v1, el engine puede revalidar consistencia por defensa, pero la validacion primaria ocurre antes en API/domain.

## 4. Salida estandar (stdout)
JSON con esta forma:
```json
{
  "instanceId": "demo-001",
  "feasible": true,
  "requiredFlow": 3,
  "maxFlow": 3,
  "assignments": [
    { "dayId": "d1", "medicId": "m1", "periodId": "p1" }
  ],
  "stats": {
    "nodes": 13,
    "edges": 18,
    "runtimeMs": 2
  }
}
```

## 5. Salida de error (stderr + exit code)
- Exit `0`: corrida exitosa.
- Exit `2`: input invalido (schema o consistencia de IDs).
- Exit `3`: error interno del algoritmo/construccion de red.

Formato de error JSON en stderr:
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Duplicate day id: d2"
  }
}
```

## 6. Reglas de implementacion
- Capacidades enteras para garantizar integralidad.
- Mapeo estable de IDs a indices internos.
- Reconstruccion de asignaciones desde arcos `(m,p)->d` con flujo 1.
- Ordenamiento determinista de output por `dayId`.
- La normalizacion interna debe ignorar el orden de entrada de arrays.
- Los IDs de `medics`, `periods` y `days` deben indexarse en orden lexicografico ascendente para construir el grafo.
- BFS debe recorrer adyacencias en el orden estable en que fueron construidas para preservar reproducibilidad.
- `diagnostics`, cuando exista, debe incluir `summaryCode=INSUFFICIENT_COVERAGE`, `message` estable y `uncoveredDays` ordenado por `dayId`.
- `stats.edges` cuenta aristas dirigidas del grafo antes de agregar la estructura residual.
- `stats.runtimeMs` mide solo el tiempo de ejecucion del motor.

## 7. Complejidad esperada
- Construccion de red: `O(E)`.
- Resolucion Edmonds-Karp: `O(V * E^2)`.
- Memoria: `O(V + E)` para lista de adyacencia y residual.

## 8. Observabilidad minima
`stats` debe incluir:
- `nodes`
- `edges`
- `runtimeMs`
- `augmentingPaths` (opcional recomendado)
