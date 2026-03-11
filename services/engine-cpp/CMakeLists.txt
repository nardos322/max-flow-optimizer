cmake_minimum_required(VERSION 3.28)
project(maxflow_engine VERSION 0.1.0 LANGUAGES CXX)

include(FetchContent)
include(GoogleTest)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

enable_testing()

set(ENGINE_REPO_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../..")
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)

FetchContent_Declare(
  nlohmann_json
  URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.zip
)
FetchContent_Declare(
  cli11
  URL https://github.com/CLIUtils/CLI11/archive/refs/tags/v2.4.2.zip
)
FetchContent_MakeAvailable(nlohmann_json googletest cli11)

add_library(engine_core
  src/cli.cpp
  src/contract.cpp
  src/edmonds_karp.cpp
  src/error.cpp
  src/graph.cpp
  src/json.cpp
  src/normalized_instance.cpp
  src/problem_network.cpp
  src/solver.cpp
)

target_include_directories(engine_core PUBLIC include)
target_link_libraries(engine_core PUBLIC nlohmann_json::nlohmann_json CLI11::CLI11)
target_compile_options(engine_core PRIVATE -Wall -Wextra -Wpedantic)

add_executable(maxflow_engine src/main.cpp)
target_link_libraries(maxflow_engine PRIVATE engine_core)
target_include_directories(maxflow_engine PRIVATE include)
target_compile_options(maxflow_engine PRIVATE -Wall -Wextra -Wpedantic)

function(add_engine_test test_name source_file)
  add_executable(${test_name} ${source_file})
  target_link_libraries(${test_name} PRIVATE engine_core GTest::gtest_main)
  target_include_directories(${test_name} PRIVATE include tests)
  target_compile_definitions(${test_name} PRIVATE ENGINE_REPO_ROOT="${ENGINE_REPO_ROOT}")
  target_compile_options(${test_name} PRIVATE -Wall -Wextra -Wpedantic)
  gtest_discover_tests(${test_name})
endfunction()

add_engine_test(engine_json_test tests/json_test.cpp)
add_engine_test(engine_max_flow_test tests/max_flow_test.cpp)
add_engine_test(engine_problem_network_test tests/problem_network_test.cpp)
add_engine_test(engine_solver_test tests/solver_test.cpp)
add_engine_test(engine_cli_test tests/cli_test.cpp)
