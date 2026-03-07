# Risk Playbook - MVP

## 1. Objetivo
Definir respuesta estandar ante riesgos tecnicos probables para no frenar avance.

## 2. Riesgo: falla integracion API <-> engine
Senales:
- proceso no inicia,
- stdout vacio,
- parsing JSON falla.

Respuesta:
1. Registrar `enginePath`, `exitCode`, stderr.
2. Ejecutar engine manual con fixture tiny.
3. Si persiste, habilitar stub temporal de engine para seguir API/web.
4. Abrir ticket `P0` y bloquear merge final hasta resolver.

## 3. Riesgo: timeout del engine
Senales:
- tiempo > `engineTimeoutMs`,
- requests canceladas.

Respuesta:
1. Devolver `ENGINE_TIMEOUT`.
2. Guardar metricas (`nodes`, `edges`, `availabilityCount`).
3. Reproducir con fixture de performance.
4. Evaluar optimizacion o ajuste de limites.

## 4. Riesgo: salida invalida del motor
Senales:
- JSON malformed,
- campos faltantes.

Respuesta:
1. Devolver `ENGINE_INVALID_OUTPUT`.
2. Guardar stdout/stderr truncados.
3. Agregar test de contrato en engine.
4. Bloquear release hasta que pase validacion schema.

## 5. Riesgo: alcance se expande sin control
Senales:
- tareas no P0 entrando al sprint,
- aumento continuo de endpoints/features.

Respuesta:
1. Mover item a `docs/00-product/BACKLOG.md` (P1/P2).
2. Mantener foco en `docs/00-product/ImplementationRoute.md`.
3. Solo aceptar cambios que bloqueen DoD.

## 6. Criterio de escalamiento
Escalar decision (ADR corta) cuando:
- un riesgo bloquea > 1 dia,
- requiere romper contrato `v1`,
- impacta performance fuera de limites definidos.
