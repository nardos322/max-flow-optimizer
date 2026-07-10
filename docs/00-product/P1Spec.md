# P1 Spec - v1.1

## 1. Objetivo
P1 convierte el MVP en una demo local persistente y mas observable, sin cambiar el problema matematico ni romper el contrato `v1`.

El usuario debe poder:
- resolver una instancia,
- conservar un historial local de corridas,
- consultar resultados anteriores,
- entender mejor por que una instancia fue infactible,
- exportar resultados con mas contexto,
- levantar la demo con un comando reproducible.

## 2. Principios de alcance
- P1 mantiene `v1` como version publica de API.
- Solo se agregan campos opcionales o endpoints nuevos.
- No se agrega autenticacion, usuarios, tenants ni RBAC.
- SQLite es persistencia local de demo, no storage productivo multiusuario.
- Analytics offline sigue separado de `apps/api` y `apps/web`.
- Docker compose debe apuntar a demo local, no a despliegue cloud.

## 3. Paquetes de trabajo
P1 se implementa en cinco paquetes cerrables de forma independiente.

### P1a - Historial local de corridas
Incluye:
- persistencia de corridas en SQLite,
- cambios compatibles en `POST /v1/solve`,
- endpoint `GET /v1/runs`,
- endpoint `GET /v1/runs/:runId`,
- UI de historial en `apps/web`.

No incluye:
- edicion o borrado de corridas,
- sincronizacion remota,
- multiusuario,
- migraciones complejas con branching.

### P1b - Diagnosticos de infactibilidad enriquecidos
Incluye:
- diagnosticos deterministas adicionales,
- campos opcionales en `diagnostics`,
- visualizacion en el frontend.

No incluye:
- explicacion perfecta de cortes minimos,
- recomendaciones automaticas de cambio,
- optimizacion por preferencias.

### P1c - Exportacion CSV enriquecida
Incluye:
- nuevas columnas de contexto en CSV,
- export desde resultado actual,
- export desde una corrida historica.

No incluye:
- export XLSX,
- plantillas configurables por usuario.

### P1d - Comparativa de performance por dataset
Incluye:
- reporte local reproducible usando fixtures o datasets analytics existentes,
- comparacion por dataset de `runtimeMs`, nodos, aristas y factibilidad,
- documentacion del comando.

No incluye:
- dashboard web de performance,
- almacenamiento de todos los batches en la DB de producto,
- herramientas distribuidas.

### P1e - Docker compose one-command
Incluye:
- compose para API + web,
- build del engine disponible para la API,
- volumen persistente para SQLite,
- variables documentadas.

No incluye:
- imagenes publicadas en registry,
- TLS,
- despliegue cloud,
- observabilidad productiva.

## 4. Modelo de datos SQLite
La DB local vive por default en:

```text
data/app/maxflow.sqlite
```

Variable de entorno:

| Variable | Default | Descripcion |
|---|---|---|
| `RUNS_DB_PATH` | `<repo-root>/data/app/maxflow.sqlite` | Ruta del archivo SQLite usado por la API. |
| `RUNS_PERSISTENCE_ENABLED` | `true` | Si es `false`, `POST /v1/solve` no persiste corridas. |

Tabla inicial:

```sql
CREATE TABLE runs (
  run_id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  feasible INTEGER NOT NULL,
  required_flow INTEGER NOT NULL,
  max_flow INTEGER NOT NULL,
  runtime_ms INTEGER NOT NULL,
  nodes INTEGER NOT NULL,
  edges INTEGER NOT NULL,
  input_json TEXT NOT NULL,
  response_json TEXT NOT NULL,
  diagnostics_json TEXT,
  input_hash TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  engine_version TEXT,
  source TEXT NOT NULL
);

CREATE INDEX runs_created_at_idx ON runs (created_at DESC);
CREATE INDEX runs_instance_id_idx ON runs (instance_id);
CREATE INDEX runs_status_idx ON runs (status);
```

Reglas:
- `run_id` se genera en API con UUID.
- `created_at` usa ISO 8601 UTC.
- `status` puede ser `feasible`, `infeasible` o `error`.
- Corridas con error interno pueden persistirse con `status=error` si existe input valido y respuesta de error controlada.
- `input_json` y `response_json` guardan JSON completo para reproducibilidad local.
- `input_hash` es SHA-256 canonico del request normalizado.
- `source` puede ser `api`, `web-fixture`, `smoke` o `unknown`.

## 5. Contrato API
La fuente primaria sigue siendo `packages/contracts/src/v1`.

### 5.1 `POST /v1/solve`
Request actual se mantiene compatible. Se agrega campo opcional:

```json
{
  "metadata": {
    "source": "web-fixture",
    "datasetName": "tiny-feasible"
  }
}
```

Reglas:
- `metadata` es opcional.
- `metadata.source` y `metadata.datasetName` son strings cortos para trazabilidad local.
- Si `RUNS_PERSISTENCE_ENABLED=true`, toda corrida valida a nivel estructural se persiste.
- La response agrega `runId` y `createdAt` como campos opcionales compatibles.
- Si la persistencia falla, la API responde `500`; no debe ocultar un fallo de escritura si la feature esta habilitada.

Response factible P1:

```json
{
  "runId": "0f7d2f6a-4eb7-4e82-9ea3-f6b7d8cbfd7f",
  "createdAt": "2026-07-10T12:00:00.000Z",
  "instanceId": "demo-001",
  "feasible": true,
  "requiredFlow": 3,
  "maxFlow": 3,
  "assignments": [],
  "stats": {
    "nodes": 13,
    "edges": 18,
    "runtimeMs": 2
  }
}
```

### 5.2 `GET /v1/runs`
Lista historial paginado por fecha descendente.

Query params:

| Param | Default | Limite | Descripcion |
|---|---:|---:|---|
| `limit` | `20` | `100` | Cantidad maxima de items. |
| `offset` | `0` | - | Offset numerico. |
| `status` | unset | - | `feasible`, `infeasible` o `error`. |
| `instanceId` | unset | - | Filtro exacto por instancia. |

Response:

```json
{
  "items": [
    {
      "runId": "0f7d2f6a-4eb7-4e82-9ea3-f6b7d8cbfd7f",
      "instanceId": "demo-001",
      "createdAt": "2026-07-10T12:00:00.000Z",
      "status": "feasible",
      "feasible": true,
      "requiredFlow": 3,
      "maxFlow": 3,
      "runtimeMs": 2,
      "nodes": 13,
      "edges": 18,
      "inputHash": "sha256:...",
      "source": "web-fixture"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

### 5.3 `GET /v1/runs/:runId`
Devuelve una corrida completa.

Response:

```json
{
  "runId": "0f7d2f6a-4eb7-4e82-9ea3-f6b7d8cbfd7f",
  "instanceId": "demo-001",
  "createdAt": "2026-07-10T12:00:00.000Z",
  "status": "feasible",
  "input": {},
  "response": {}
}
```

Reglas:
- `input` es el request original normalizado.
- `response` es el body persistido de `POST /v1/solve`.
- `404` si no existe `runId`.

## 6. Diagnosticos P1
El contrato v1 existente se conserva. P1 agrega campos opcionales dentro de `diagnostics`.

```json
{
  "summaryCode": "INSUFFICIENT_COVERAGE",
  "message": "Unable to cover all days under current constraints.",
  "uncoveredDays": ["d3"],
  "capacity": {
    "requiredDays": 10,
    "totalMedicCapacity": 8,
    "availablePairs": 12
  },
  "daysWithoutAvailability": ["d3"],
  "periods": [
    {
      "periodId": "p1",
      "requiredDays": 5,
      "maxCoverableDays": 4,
      "uncoveredDays": ["d3"]
    }
  ],
  "medics": [
    {
      "medicId": "m1",
      "availableDays": 0,
      "maxDaysPerMedic": 2
    }
  ]
}
```

Diagnosticos obligatorios P1:
- capacidad global insuficiente: `requiredDays > medics.length * maxDaysPerMedic`,
- dias sin ningun medico disponible,
- periodos con dias no cubiertos,
- medicos sin disponibilidad.

Reglas:
- Todos los arrays deben estar ordenados por id ascendente.
- Los campos nuevos son opcionales para compatibilidad, pero si `feasible=false` la API debe completar todos los diagnosticos que pueda calcular de forma determinista.
- El frontend no recalcula diagnosticos; solo los presenta.

## 7. Frontend P1
Se agrega una cuarta seccion:

```text
Historial
```

La navegacion queda:
- `Periodos`
- `Medicos`
- `Planificador`
- `Historial`

### 7.1 Historial
La vista debe permitir:
- listar corridas recientes,
- filtrar por status,
- paginar con `limit/offset`,
- abrir detalle de corrida,
- ver input y response resumidos,
- restaurar el input de una corrida como draft actual,
- exportar JSON/CSV desde una corrida historica.

No se requiere:
- borrar corridas,
- editar metadata,
- comparar dos corridas en la UI.

### 7.2 Planificador
Cambios:
- mostrar `runId` cuando exista,
- mostrar `createdAt` cuando exista,
- link o accion para abrir la corrida en `Historial`,
- mostrar diagnosticos enriquecidos si vienen en response.

### 7.3 Estado frontend
Agregar:
- `runsList`,
- `selectedRun`,
- `isLoadingRuns`,
- `runsError`.

Reglas:
- Restaurar una corrida historica reemplaza `instanceDraft` y limpia `lastSolveResult`.
- Exportar desde historial usa el `input` y `response` persistidos, no el draft actual.

## 8. CSV enriquecido
Columnas P1:

```text
runId,createdAt,instanceId,status,dayId,date,periodId,medicId,medicName,requiredFlow,maxFlow,runtimeMs
```

Reglas:
- CSV de resultado actual usa `lastSolveResult` + `instanceDraft`.
- CSV historico usa `run.response` + `run.input`.
- CSV sigue disponible solo para corridas factibles.
- Filas ordenadas por `dayId`.

## 9. Performance por dataset
P1 agrega un reporte reproducible, no una feature interactiva.

Comando objetivo:

```bash
pnpm analytics:compare
```

Salida:

```text
analytics/reports/performance-comparison.md
analytics/reports/performance-comparison.json
```

Metricas minimas:
- dataset,
- cantidad de dias,
- cantidad de medicos,
- cantidad de disponibilidad,
- feasible,
- requiredFlow,
- maxFlow,
- nodes,
- edges,
- runtimeMs.

Fuentes:
- fixtures canonicos en `packages/test-data/input`,
- datasets generados en `data/generated` si existen.

## 10. Docker compose
Archivo objetivo:

```text
docker-compose.yml
```

Servicios:
- `api`: Node API con engine disponible.
- `web`: Vite preview o build servido para demo.

Volumen:

```text
maxflow-runs:/app/data/app
```

Variables minimas:
- `PORT=3000`,
- `RUNS_DB_PATH=/app/data/app/maxflow.sqlite`,
- `RUNS_PERSISTENCE_ENABLED=true`,
- `VITE_API_BASE_URL=http://localhost:3000`.

Comando objetivo:

```bash
docker compose up --build
```

## 11. Tests requeridos
### Contratos
- schemas para `RunSummary`, `RunDetail`, `RunsListResponse`,
- validacion de responses de `GET /v1/runs` y `GET /v1/runs/:runId`,
- compatibilidad de `POST /v1/solve` con requests v1 sin `metadata`.

### API
- `POST /v1/solve` persiste corrida factible,
- `POST /v1/solve` persiste corrida infactible,
- `GET /v1/runs` pagina y filtra,
- `GET /v1/runs/:runId` devuelve input y response completos,
- `GET /v1/runs/:runId` devuelve `404` si no existe,
- falla controlada si SQLite no puede escribirse con persistencia habilitada.

### Frontend
- historial renderiza lista vacia,
- historial renderiza corridas,
- detalle de corrida muestra resumen,
- restaurar corrida reemplaza draft,
- CSV historico usa input historico y no draft actual,
- diagnosticos enriquecidos se muestran si existen.

### Docker
- smoke manual documentado: compose levanta web y API,
- resolver fixture desde web persiste corrida,
- historial muestra la corrida.

## 12. Criterios de aceptacion P1
P1 se considera completo cuando:
- `POST /v1/solve` devuelve `runId` y persiste en SQLite por default.
- `GET /v1/runs` y `GET /v1/runs/:runId` estan documentados, tipados y testeados.
- La web tiene seccion `Historial` funcional.
- Una corrida historica puede restaurarse como draft.
- CSV enriquecido funciona para resultado actual e historico.
- Diagnosticos P1 se muestran para casos infactibles.
- `pnpm analytics:compare` genera reporte local.
- `docker compose up --build` levanta una demo usable con persistencia.
- `pnpm test`, `pnpm build`, lint/typecheck si existen, pasan en la raiz.

## 13. Fuera de alcance explicito
- Auth/JWT/session.
- RBAC.
- Multi-hospital o `tenantId`.
- CRUD persistido de medicos, periodos o dias fuera del snapshot de corridas.
- Edicion/borrado de historial.
- Endpoint batch solving.
- Dashboard historico de tendencias.
- Comparacion visual entre corridas.
- PostgreSQL.
- Deploy cloud.
- Migracion a `v2`.
