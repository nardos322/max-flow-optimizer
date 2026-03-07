# Dependency Policy (No Reinventar la Rueda)

## 1. Objetivo
Usar librerias para problemas commodity y concentrar implementacion propia en el valor diferencial del proyecto.

## 2. Regla principal
- Implementar desde cero solo lo que demuestra el core del portfolio.
- Usar librerias maduras para tareas estandar (parsing, validacion, testing, CLI).

## 3. Que SI construir en este proyecto
- Modelado del problema como red de flujo.
- Algoritmo de flujo maximo y extraccion de asignaciones.
- Reglas de dominio y validaciones de negocio.

## 4. Que NO construir desde cero
- Parser JSON en C++.
- Framework HTTP.
- Runner de tests.
- Manejo basico de argumentos CLI.

## 5. Criterios para aceptar una dependencia
1. Resuelve una necesidad no diferencial.
2. Comunidad activa y mantenimiento razonable.
3. Licencia compatible para uso en portfolio.
4. Version fijada (sin rangos abiertos).
5. Encapsulada detras de una interfaz del proyecto cuando aplique.

## 6. Recomendaciones concretas v1
- C++ JSON: `nlohmann/json`.
- C++ tests: `GoogleTest`.
- API validacion: `Zod`.
- API server: `Express`.
- Web forms: `react-hook-form` + `@hookform/resolvers`.
- Web validacion: `Zod`.

## 7. Riesgos y mitigaciones
- Riesgo: lock-in a libreria.
  - Mitigacion: wrapper interno minimo en puntos criticos.
- Riesgo: vulnerabilidades.
  - Mitigacion: actualizar dependencias en ventanas controladas.
- Riesgo: sobreuso de paquetes.
  - Mitigacion: toda dependencia nueva debe justificar valor claro.
