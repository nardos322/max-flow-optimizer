#include "engine/cli.hpp"

#include <CLI/CLI.hpp>

#include <fstream>
#include <iterator>
#include <sstream>
#include <utility>

#include "engine/contract.hpp"
#include "engine/error.hpp"
#include "engine/json.hpp"
#include "engine/solver.hpp"

namespace engine {
namespace {

std::string ReadAll(std::istream& stream) {
  return std::string(std::istreambuf_iterator<char>(stream), std::istreambuf_iterator<char>());
}

std::string ReadInputPayload(const CliOptions& options, std::istream& stdin_stream) {
  if (options.use_stdin) {
    return ReadAll(stdin_stream);
  }

  std::ifstream file(options.input_path);
  if (!file.is_open()) {
    ThrowInvalidInput("Unable to open input file: " + options.input_path + ".");
  }
  return ReadAll(file);
}

}  // namespace

CliOptions ParseCliOptions(const std::vector<std::string>& arguments) {
  CliOptions options;

  CLI::App app{"maxflow_engine"};
  app.allow_extras(false);
  app.add_flag("--stdin", options.use_stdin, "Read wrapper JSON payload from stdin");
  app.add_option("--input", options.input_path, "Read wrapper JSON payload from file");

  std::vector<std::string> storage;
  storage.reserve(arguments.size() + 1);
  storage.emplace_back("maxflow_engine");
  storage.insert(storage.end(), arguments.begin(), arguments.end());
  std::vector<const char*> argv;
  argv.reserve(storage.size());
  for (const std::string& argument : storage) {
    argv.push_back(argument.c_str());
  }
  try {
    app.parse(static_cast<int>(argv.size()), argv.data());
  } catch (const CLI::ParseError& error) {
    ThrowInvalidInput(std::string("Invalid CLI arguments: ") + error.what());
  }

  const bool has_file = !options.input_path.empty();
  if (options.use_stdin == has_file) {
    ThrowInvalidInput("Use exactly one input mode: --stdin or --input <path>.");
  }

  return options;
}

int RunCli(const CliOptions& options, std::istream& stdin_stream, std::ostream& stdout_stream,
           std::ostream& stderr_stream) {
  try {
    const std::string payload = ReadInputPayload(options, stdin_stream);
    const JsonValue root = ParseJson(payload);
    const InternalRequest request = ParseInternalRequest(root);
    const SolveResponse response = SolveInstance(request.input);
    stdout_stream << SerializeResponse(response);
    return static_cast<int>(ExitCode::kSuccess);
  } catch (const EngineError& error) {
    stderr_stream << SerializeError(ErrorPayload{error.code(), error.what()});
    return static_cast<int>(error.exit_code());
  } catch (const std::exception& error) {
    stderr_stream << SerializeError(ErrorPayload{"INTERNAL_ERROR", error.what()});
    return static_cast<int>(ExitCode::kInternalError);
  }
}

}  // namespace engine
