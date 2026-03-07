#include <iostream>

#include "engine_version.hpp"

int main() {
  if (kEngineVersion[0] == '\0') {
    std::cerr << "engine version should not be empty\n";
    return 1;
  }

  return 0;
}
