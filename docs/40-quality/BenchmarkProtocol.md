# Benchmark Protocol - MVP v1

## 1. Objetivo
Definir un procedimiento reproducible para medir si el MVP cumple los limites de rendimiento documentados.

## 2. Alcance
Este benchmark mide:
- Latencia de `POST /v1/solve` en entorno local.
- Tiempo efectivo del motor reportado como `stats.runtimeMs`.
- Cumplimiento de p50, p95 y timeout duro.

No mide concurrencia, throughput multiusuario ni consumo de memoria fino en v1.

## 3. Dataset benchmark
Datasets obligatorios:
1. `packages/test-data/input/medium-random-50x50.json`
2. `packages/test-data/input/large-random-200x200.json`

Reglas:
- Los datasets deben quedar versionados en el repositorio.
- No se debe regenerar el dataset benchmark entre corridas del mismo PR.
- Si se reemplaza un dataset benchmark, debe registrarse como cambio deliberado en el PR.

## 4. Entorno de medicion
- Medir en maquina local de desarrollo, sin otras tareas pesadas en paralelo.
- Ejecutar API y engine compilados en modo de desarrollo normal del proyecto.
- Usar la misma configuracion de env vars documentada para v1.
- Si se reportan resultados publicamente, incluir CPU, RAM y sistema operativo.

## 5. Procedimiento
1. Compilar engine y levantar API local.
2. Ejecutar 5 corridas de warmup con `medium-random-50x50.json`.
3. Ejecutar 30 corridas medidas con `medium-random-50x50.json`.
4. Ejecutar 10 corridas medidas con `large-random-200x200.json`.
5. Registrar para cada corrida:
   - latencia HTTP total
   - `stats.runtimeMs`
   - status HTTP
   - `requestId`
6. Calcular p50 y p95 sobre la latencia HTTP total.

## 6. Criterio de aprobacion v1
- `p50 <= 300 ms`
- `p95 <= 1000 ms`
- ninguna corrida supera `2000 ms`
- ninguna corrida benchmark devuelve `5xx`
- `stats.runtimeMs` debe ser consistente con una fraccion razonable de la latencia total

## 7. Regla de interpretacion
- El SLO oficial se evalua sobre latencia HTTP total, no solo sobre `stats.runtimeMs`.
- `stats.runtimeMs` se usa como ayuda diagnostica para separar costo del motor y overhead de API.
- Si el p95 falla pero `stats.runtimeMs` esta holgadamente dentro del objetivo, el problema se considera de integracion/API y no del algoritmo.

## 8. Reporte minimo
Todo benchmark que se use para aceptar o rechazar cambios debe reportar:
- dataset usado
- numero de corridas
- p50
- p95
- maximo observado
- cantidad de errores 5xx
- hardware y sistema operativo
