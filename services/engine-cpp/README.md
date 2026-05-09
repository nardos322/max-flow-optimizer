# services/engine-cpp

Motor C++ de flujo maximo para resolver la factibilidad de asignaciones con restricciones de capacidad.

En el MVP, el caso de uso es asignar dias de feriado a medicos. El motor esta aislado de la UI y de la API HTTP: recibe una instancia normalizada, construye una red de flujo, ejecuta Dinic y emite una respuesta JSON deterministica.

## Problema Modelado

Entrada conceptual:

- `M`: medicos disponibles.
- `P`: periodos de feriados.
- `D`: dias que deben cubrirse.
- `C`: maximo total de dias que puede tomar cada medico.
- `availability`: pares `(medicId, dayId)` que indican si un medico puede cubrir un dia.

La pregunta que responde el motor es:

> Existe una asignacion que cubra todos los dias, usando solo disponibilidad valida, sin superar `C` y sin asignar mas de un dia del mismo periodo al mismo medico?

El MVP resuelve factibilidad. No optimiza preferencias, equidad ni costos.

## Construccion De La Red

El problema se transforma en una red dirigida con fuente `s` y sumidero `t`.

Nodos:

- `s`: fuente.
- `m`: un nodo por medico.
- `(m,p)`: un nodo intermedio por cada par medico-periodo.
- `d`: un nodo por dia.
- `t`: sumidero.

Arcos:

```text
s -> medico -> medico_periodo -> dia -> t
```

Capacidades:

| Arco | Capacidad | Restriccion que representa |
| --- | ---: | --- |
| `s -> m` | `C` | El medico no puede superar el maximo global de dias. |
| `m -> (m,p)` | `1` | El medico no puede tomar mas de un dia dentro del mismo periodo. |
| `(m,p) -> d` | `1` | El medico solo puede cubrir dias disponibles dentro de ese periodo. |
| `d -> t` | `1` | Cada dia necesita exactamente una unidad de cobertura. |

Solo se crea el arco `(m,p) -> d` cuando existe disponibilidad `(m,d)` y el dia `d` pertenece al periodo `p`.

## Criterio De Factibilidad

El flujo requerido es la cantidad total de dias:

```text
requiredFlow = |D|
```

La instancia es factible si:

```text
maxFlow == requiredFlow
```

Si el flujo maximo cubre todos los dias, cada arco `d -> t` queda saturado con una unidad. Esa unidad proviene de algun medico disponible y respeta las capacidades anteriores. Como todas las capacidades son enteras, el flujo resultante induce asignaciones discretas `dayId -> medicId`.

Si `maxFlow < requiredFlow`, no existe forma de cubrir todos los dias bajo las restricciones cargadas.

## Ejemplo Simplificado

Para una instancia con:

- `C = 2`
- dias `d1`, `d2`, `d3`
- medicos `m1`, `m2`
- disponibilidad:
  - `m1 -> d1`
  - `m1 -> d3`
  - `m2 -> d2`

El motor intenta enviar 3 unidades de flujo desde `s` hasta `t`, una por cada dia. Si encuentra las tres rutas completas, devuelve `feasible=true` y una asignacion como:

```json
[
  { "dayId": "d1", "medicId": "m1", "periodId": "p1" },
  { "dayId": "d2", "medicId": "m2", "periodId": "p1" },
  { "dayId": "d3", "medicId": "m1", "periodId": "p2" }
]
```

## Interfaz CLI

Binario:

```bash
maxflow_engine
```

Modos soportados:

```bash
maxflow_engine --input path/to/input.json
maxflow_engine --stdin
```

La API usa `--stdin` y envia un wrapper interno:

```json
{
  "requestId": "8e950b8f-f8c3-49fc-835b-4015f4963ca1",
  "input": {
    "instanceId": "tiny-feasible",
    "maxDaysPerMedic": 2,
    "periods": [],
    "days": [],
    "medics": [],
    "availability": []
  }
}
```

`input` corresponde al contrato publico ya validado por la API y por `packages/domain`.

## Salida

En una corrida valida, el motor escribe JSON en `stdout`:

```json
{
  "instanceId": "tiny-feasible",
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

En error, escribe JSON en `stderr` y termina con exit code distinto de cero:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Duplicate day id: d2"
  }
}
```

Exit codes:

- `0`: corrida exitosa.
- `2`: input invalido.
- `3`: error interno del algoritmo o de construccion de red.

## Determinismo

El motor normaliza internamente los IDs para que el orden de entrada no cambie la respuesta:

- medicos, periodos, dias y disponibilidad se ordenan de forma estable,
- el grafo se construye con ese orden,
- BFS/DFS recorren adyacencias en orden estable,
- las asignaciones finales se ordenan por `dayId`.

Con esto, el mismo input produce el mismo output aunque existan multiples soluciones validas.

## Complejidad

Definiciones:

- `V = 2 + |M| + |M||P| + |D|`
- `E = |M| + |M||P| + A + |D|`
- `A`: cantidad de arcos de disponibilidad `(m,p) -> d`

Costos:

- construccion de red: `O(E)`,
- Dinic: `O(V^2 * E)` en complejidad general,
- memoria: `O(V + E)`.

En la practica, el costo depende mucho de la densidad de `availability`. Un caso donde casi todos los medicos estan disponibles para casi todos los dias genera mas arcos que un caso disperso.

## Reutilizacion

El motor no depende del dominio visual de "feriados medicos". El patron puede reutilizarse para problemas donde:

- hay demandas que deben cubrirse exactamente una vez,
- hay recursos con disponibilidad parcial,
- hay limites globales por recurso,
- hay limites por grupo o periodo,
- se necesita saber si una asignacion factible existe antes de optimizar.

Ejemplos posibles:

- turnos de personal,
- guardias tecnicas,
- cobertura de tareas por equipo,
- asignacion de cupos limitados,
- matching entre recursos y demandas obligatorias.

Para reutilizarlo en otro dominio, lo importante es adaptar la etapa de modelado: traducir los objetos del nuevo problema a nodos, arcos y capacidades equivalentes.

## Dependencias

- `nlohmann/json`: parseo y serializacion JSON.
- `CLI11`: parseo de argumentos CLI.
- `GoogleTest`: suite unitaria e integracion liviana.

## Estructura

- `include/engine/`: headers del motor por modulo.
- `src/`: implementacion del contrato interno, normalizacion, grafo, solver y CLI.
- `tests/`: pruebas del motor sobre modulos y fixtures canonicos.

## Build

Las dependencias C++ se resuelven con `FetchContent` desde `CMakeLists.txt`.

```bash
cmake -S services/engine-cpp -B services/engine-cpp/build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build services/engine-cpp/build -j
```

## Tests

```bash
ctest --test-dir services/engine-cpp/build --output-on-failure
```

## Documentacion Relacionada

- [Modelo formal](../../docs/10-model/Model.md)
- [Especificacion del engine](../../docs/20-architecture/EngineSpec.md)
- [Contrato de integracion API-engine](../../docs/20-architecture/EngineIntegrationContract.md)
