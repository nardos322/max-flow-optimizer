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

## 8. Complejidad con Edmonds-Karp
Definiciones:
- `V = 2 + |M| + |M||P| + |D|`.
- `E = |M| + |M||P| + A + |D|`, donde `A` es el numero de arcos de disponibilidad `(m,p)->d`.

Edmonds-Karp corre en `O(V * E^2)`.
Sustituyendo:

`O((2 + |M| + |M||P| + |D|) * (|M| + |M||P| + A + |D|)^2)`.

Caso denso (`A` cercano a `|M||D|`): costo dominado por la densidad de disponibilidades.

