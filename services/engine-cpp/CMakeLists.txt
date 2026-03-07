cmake_minimum_required(VERSION 3.28)
project(maxflow_engine VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

enable_testing()

add_executable(maxflow_engine
  src/main.cpp
)

target_include_directories(maxflow_engine PRIVATE include)

add_executable(engine_dummy_test
  tests/dummy_test.cpp
)

target_include_directories(engine_dummy_test PRIVATE include)
add_test(NAME engine_dummy_test COMMAND engine_dummy_test)
