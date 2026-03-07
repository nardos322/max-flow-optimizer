#include <iostream>
#include <string>
#include <vector>

#include "engine/cli.hpp"
#include "engine/contract.hpp"
#include "engine/error.hpp"

int main(int argc, char* argv[]) {
  std::vector<std::string> arguments;
  arguments.reserve(static_cast<std::size_t>(argc > 0 ? argc - 1 : 0));
  for (int index = 1; index < argc; ++index) {
    arguments.emplace_back(argv[index]);
  }

  try {
    const int exit_code = engine::RunCli(engine::ParseCliOptions(arguments), std::cin, std::cout, std::cerr);
    return exit_code;
  } catch (const engine::EngineError& error) {
    std::cerr << engine::SerializeError(engine::ErrorPayload{error.code(), error.what()});
    return static_cast<int>(error.exit_code());
  } catch (const std::exception& error) {
    std::cerr << engine::SerializeError(engine::ErrorPayload{"INTERNAL_ERROR", error.what()});
    return static_cast<int>(engine::ExitCode::kInternalError);
  }
}
