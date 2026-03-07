# services/engine-cpp

Motor C++ de flujo maximo para el MVP.

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
