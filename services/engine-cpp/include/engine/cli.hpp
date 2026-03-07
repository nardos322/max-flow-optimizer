#ifndef ENGINE_CLI_HPP
#define ENGINE_CLI_HPP

#include <istream>
#include <ostream>
#include <string>
#include <vector>

namespace engine {

struct CliOptions {
  bool use_stdin = false;
  std::string input_path;
};

[[nodiscard]] CliOptions ParseCliOptions(const std::vector<std::string>& arguments);
[[nodiscard]] int RunCli(const CliOptions& options, std::istream& stdin_stream, std::ostream& stdout_stream,
                         std::ostream& stderr_stream);

}  // namespace engine

#endif
