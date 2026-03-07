#ifndef ENGINE_TEST_UTILS_HPP
#define ENGINE_TEST_UTILS_HPP

#include <filesystem>
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <string_view>

#include "engine/contract.hpp"
#include "engine/json.hpp"

#ifndef ENGINE_REPO_ROOT
#error "ENGINE_REPO_ROOT must be defined for tests"
#endif

namespace engine::test {

inline std::filesystem::path RepoRoot() { return std::filesystem::path(ENGINE_REPO_ROOT); }

inline std::filesystem::path FixturePath(std::string_view relative_path) {
  return RepoRoot() / "packages" / "test-data" / relative_path;
}

inline std::string ReadFile(const std::filesystem::path& path) {
  std::ifstream file(path);
  if (!file.is_open()) {
    throw std::runtime_error("Unable to open file: " + path.string());
  }
  std::ostringstream stream;
  stream << file.rdbuf();
  return stream.str();
}

inline JsonValue LoadJsonFixture(std::string_view relative_path) {
  return ParseJson(ReadFile(FixturePath(relative_path)));
}

inline SolveInput LoadSolveInput(std::string_view relative_path) {
  return ParseSolveInput(LoadJsonFixture(relative_path));
}

inline JsonValue WrapInputJson(std::string_view request_id, const JsonValue& input) {
  JsonValue wrapped = JsonValue::object();
  wrapped["requestId"] = std::string(request_id);
  wrapped["input"] = input;
  return wrapped;
}

inline JsonValue WrapInput(std::string_view request_id, std::string_view relative_path) {
  return WrapInputJson(request_id, LoadJsonFixture(relative_path));
}

inline void NormalizeRuntimeMs(JsonValue& value) {
  if (value.contains("stats") && value["stats"].contains("runtimeMs")) {
    value["stats"]["runtimeMs"] = 0;
  }
}

}  // namespace engine::test

#endif
