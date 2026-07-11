# Modelo Formal de Flujo Maximo

## 1. Conjuntos e indices
- `M`: conjunto de medicos, indice `m`.
- `P`: conjunto de periodos de feriados, indice `p`.
- `D`: conjunto de dias de feriado, indice `d`.
- `D_p`: subconjunto de dias que pertenecen al periodo `p`.

## 2. Parametros
- `C`: maximo total de dias asignables por medico.
- `a_{m,d} in {0,1}`: 1 si el medico `m` esta disponible el dia `d`.
- `period(d)`: periodo al que pertenece el dia `d`.

## 3. Objetivo (MVP)
Problema de factibilidad: determinar si existe una asignacion valida que cubra todos los dias.

## 4. Construccion de la red
Nodos:
- Fuente `s`.
- Nodo por medico `m`.
- Nodo intermedio por par medico-periodo `(m,p)`.
- Nodo por dia `d`.
- Sumidero `t`.

Arcos con capacidades:
1. `s -> m` con capacidad `C`.
2. `m -> (m,p)` con capacidad `1`.
3. `(m,p) -> d` con capacidad `1` si `a_{m,d}=1` y `d in D_p`.
4. `d -> t` con capacidad `1`.

## 5. Interpretacion de cada capacidad
- `cap(s,m)=C`: ningun medico puede superar `C` dias globales.
- `cap(m,(m,p))=1`: cada medico aporta como maximo un dia en cada periodo.
- `cap((m,p),d)=1`: solo se permite asignar dias disponibles para ese medico y periodo.
- `cap(d,t)=1`: cada dia recibe exactamente una persona en una solucion completa.

## 6. Criterio de factibilidad
Sea `|D|` el numero total de dias. Existe asignacion factible si y solo si:

`maxflow(s,t) = |D|`.

## 7. Correctitud (resumen)
### (=>) De asignacion factible a flujo
Dada una asignacion valida:
- Por cada dia `d` asignado al medico `m`, enviar 1 unidad por `s -> m -> (m,period(d)) -> d -> t`.
- Restricciones del problema garantizan que no se violan capacidades.
- Se envia exactamente 1 unidad por cada dia, luego el flujo vale `|D|`.

### (<=) De flujo de valor |D| a asignacion factible
Si `maxflow=|D|`:
- Cada arco `d -> t` (capacidad 1) debe estar saturado, luego cada dia recibe una unidad.
- Esa unidad proviene de algun nodo `(m,p)` y por construccion solo existe arco si hay disponibilidad.
- Capacidad `m -> (m,p)=1` impide mas de una asignacion por medico en el mismo periodo.
- Capacidad `s -> m=C` impide superar carga total.
- Por integralidad del max-flow con capacidades enteras, las asignaciones son discretas.
Por tanto, el flujo induce una asignacion valida.

## 8. Complejidad con Dinic
Definiciones:
- `V = 2 + |M| + |M||P| + |D|`.
- `E = |M| + |M||P| + A + |D|`, donde `A` es el numero de arcos de disponibilidad `(m,p)->d`.

El motor implementa Dinic, con complejidad general `O(V^2 * E)` y mejor comportamiento practico que Edmonds-Karp en las redes bipartitas del MVP.
Sustituyendo:

`O((2 + |M| + |M||P| + |D|)^2 * (|M| + |M||P| + A + |D|))`.

Caso denso (`A` cercano a `|M||D|`): costo dominado por la densidad de disponibilidades.

## 9. Regla de determinismo v1
Para garantizar que mismo input implique mismo output:
- El orden de entrada de `periods`, `days`, `medics` y `availability` no se considera semantico.
- La construccion del grafo debe normalizar IDs en orden lexicografico ascendente.
- La exploracion BFS/DFS del algoritmo de flujo debe respetar ese orden estable de adyacencias.
- La salida final debe ordenarse por `dayId`.

Con estas reglas, si existen multiples max-flows validos, v1 elige en forma deterministica una solucion inducida por el orden estable de la red residual.

## 10. Extension P2a - Optimizacion por equidad
P2a mantiene las restricciones duras del modelo v1 y agrega un objetivo secundario:

```text
Entre todas las asignaciones factibles, preferir una distribucion mas pareja de dias entre medicos.
```

La decision tecnica para P2a es min-cost max-flow.

Orden lexicografico de objetivos:
1. Maximizar el flujo total.
2. Si `maxflow = |D|`, minimizar el costo de equidad.
3. Si hay empate de costo, conservar determinismo por orden canonico de ids.

Si no se solicita optimizacion, el solver conserva el comportamiento v1.

## 11. Funcion de costo P2a
Sea `x_m` la cantidad de dias asignados al medico `m`.

La equidad se modela con costos marginales crecientes por cada unidad adicional de carga de un medico:

| Carga marginal | Costo |
|---:|---:|
| 1er dia asignado al medico | 0 |
| 2do dia asignado al medico | 1 |
| 3er dia asignado al medico | 3 |
| 4to dia asignado al medico | 6 |

Formula inicial:

```text
cost(k) = k * (k - 1) / 2
```

donde `k` es la posicion marginal 1-indexed del dia asignado a un medico.

Propiedades:
- `cost(k)` es entero y no negativo.
- `cost(k)` es monotonicamente creciente.
- Concentrar dias en el mismo medico aumenta el costo mas rapido que repartirlos.
- La funcion no cambia la factibilidad; solo desempata entre flujos completos.

El score publico P2a se define inicialmente como `spread`:

```text
spread = max_m(x_m) - min_m(x_m)
```

`totalCost` queda expuesto para trazabilidad tecnica del min-cost max-flow.

## 12. Construccion conceptual P2a
La red debe permitir que la unidad 1, 2, ..., `C` de carga de cada medico tenga costo marginal distinto.

Construccion recomendada:
- Reemplazar el arco unico `s -> m` de capacidad `C` por `C` arcos o niveles equivalentes de capacidad `1`.
- Cada nivel `k` de medico tiene costo `cost(k)`.
- El resto de las restricciones se conservan:
  - maximo global `C`,
  - maximo 1 dia por medico-periodo,
  - disponibilidad por dia,
  - cobertura unitaria de cada dia.

La implementacion exacta puede usar nodos auxiliares o arcos paralelos si la estructura del motor lo permite. La condicion importante es que cada unidad adicional asignada al mismo medico pague el costo marginal correspondiente.

## 13. Metricas P2a
Para una response optimizada, el motor/API deben reportar:
- `totalCost`: costo minimo encontrado para el flujo completo.
- `score`: valor publico comparable dentro del objetivo `fairness`.
- `maxAssignedDays`: maximo de `x_m`.
- `minAssignedDays`: minimo de `x_m`.
- `spread`: diferencia entre maximo y minimo.
- `loadByMedic`: carga final por medico, ordenada por `medicId`.
