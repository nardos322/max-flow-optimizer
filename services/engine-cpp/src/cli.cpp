#include "engine/cli.hpp"

#include <CLI/CLI.hpp>

#include <fstream>
#include <iterator>
#include <string_view>

#include "engine/analytics.hpp"
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

SolveResponse SolvePayload(std::string_view payload) {
  const JsonValue root = ParseJson(payload);
  const InternalRequest request = ParseInternalRequest(root);
  return SolveInstance(request.input);
}

int RunSinglePayload(const CliOptions& options, std::istream& stdin_stream, std::ostream& stdout_stream) {
  const std::string payload = ReadInputPayload(options, stdin_stream);
  const SolveResponse response = SolvePayload(payload);
  stdout_stream << SerializeResponse(response);
  return static_cast<int>(ExitCode::kSuccess);
}

int RunBatchPayloadsFromStream(std::istream& lines, std::ostream& stdout_stream) {
  std::string line;

  while (std::getline(lines, line)) {
    if (line.empty()) {
      continue;
    }

    try {
      stdout_stream << SerializeResponse(SolvePayload(line)) << '\n';
    } catch (const EngineError& error) {
      stdout_stream << SerializeError(ErrorPayload{error.code(), error.what()}) << '\n';
    } catch (const std::exception& error) {
      stdout_stream << SerializeError(ErrorPayload{"INTERNAL_ERROR", error.what()}) << '\n';
    }
    stdout_stream.flush();
  }

  return static_cast<int>(ExitCode::kSuccess);
}

int RunBatchPayloads(const CliOptions& options, std::istream& stdin_stream, std::ostream& stdout_stream) {
  if (options.use_stdin) {
    return RunBatchPayloadsFromStream(stdin_stream, stdout_stream);
  }

  std::ifstream file(options.input_path);
  if (!file.is_open()) {
    ThrowInvalidInput("Unable to open input file: " + options.input_path + ".");
  }
  return RunBatchPayloadsFromStream(file, stdout_stream);
}

int RunAnalyticsPayloadsFromStream(std::istream& lines, std::ostream& stdout_stream) {
  std::string line;

  while (std::getline(lines, line)) {
    if (line.empty()) {
      continue;
    }

    try {
      stdout_stream << SerializeAnalyticsResponse(SolveAnalyticsPayload(line)) << '\n';
    } catch (const EngineError& error) {
      stdout_stream << SerializeError(ErrorPayload{error.code(), error.what()}) << '\n';
    } catch (const std::exception& error) {
      stdout_stream << SerializeError(ErrorPayload{"INTERNAL_ERROR", error.what()}) << '\n';
    }
    stdout_stream.flush();
  }

  return static_cast<int>(ExitCode::kSuccess);
}

int RunAnalyticsPayloads(const CliOptions& options, std::istream& stdin_stream, std::ostream& stdout_stream) {
  if (options.use_stdin) {
    return RunAnalyticsPayloadsFromStream(stdin_stream, stdout_stream);
  }

  std::ifstream file(options.input_path);
  if (!file.is_open()) {
    ThrowInvalidInput("Unable to open input file: " + options.input_path + ".");
  }
  return RunAnalyticsPayloadsFromStream(file, stdout_stream);
}

}  // namespace

CliOptions ParseCliOptions(const std::vector<std::string>& arguments) {
  CliOptions options;

  CLI::App app{"maxflow_engine"};
  app.allow_extras(false);
  app.add_flag("--stdin", options.use_stdin, "Read wrapper JSON payload from stdin");
  app.add_option("--input", options.input_path, "Read wrapper JSON payload from file");
  app.add_flag("--batch-jsonl", options.batch_jsonl,
               "Read newline-delimited wrapper JSON payloads and write newline-delimited responses");
  app.add_flag("--analytics-jsonl", options.analytics_jsonl,
               "Read newline-delimited compact analytics payloads and write newline-delimited responses");

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
  if (options.batch_jsonl && options.analytics_jsonl) {
    ThrowInvalidInput("Use at most one batch mode: --batch-jsonl or --analytics-jsonl.");
  }

  return options;
}

int RunCli(const CliOptions& options, std::istream& stdin_stream, std::ostream& stdout_stream,
           std::ostream& stderr_stream) {
  try {
    if (options.analytics_jsonl) {
      return RunAnalyticsPayloads(options, stdin_stream, stdout_stream);
    }
    if (options.batch_jsonl) {
      return RunBatchPayloads(options, stdin_stream, stdout_stream);
    }
    return RunSinglePayload(options, stdin_stream, stdout_stream);
  } catch (const EngineError& error) {
    stderr_stream << SerializeError(ErrorPayload{error.code(), error.what()});
    return static_cast<int>(error.exit_code());
  } catch (const std::exception& error) {
    stderr_stream << SerializeError(ErrorPayload{"INTERNAL_ERROR", error.what()});
    return static_cast<int>(ExitCode::kInternalError);
  }
}

}  // namespace engine
