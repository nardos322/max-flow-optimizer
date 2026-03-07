# Especificacion del Motor C++ (CLI)

## 1. Objetivo
Implementar un ejecutable C++ que reciba una instancia del problema y retorne factibilidad y asignaciones usando Edmonds-Karp.

## 2. Interfaz de linea de comandos
- Binario: `maxflow_engine`
- Uso recomendado:
  - `maxflow_engine --input <path-json>`
  - `maxflow_engine --stdin` (lee JSON desde stdin)

## 3. Entrada esperada
Mismo contrato estructural definido en `docs/30-api/API.md` para el cuerpo del request.

## 4. Salida estandar (stdout)
JSON con esta forma:
```json
{
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
