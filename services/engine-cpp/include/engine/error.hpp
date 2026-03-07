#ifndef ENGINE_ERROR_HPP
#define ENGINE_ERROR_HPP

#include <stdexcept>
#include <string>

namespace engine {

enum class ExitCode {
  kSuccess = 0,
  kInvalidInput = 2,
  kInternalError = 3,
};

struct ErrorPayload {
  std::string code;
  std::string message;
};

class EngineError : public std::runtime_error {
 public:
  EngineError(ExitCode exit_code, std::string code, std::string message);

  [[nodiscard]] ExitCode exit_code() const noexcept;
  [[nodiscard]] const std::string& code() const noexcept;

 private:
  ExitCode exit_code_;
  std::string code_;
};

[[noreturn]] void ThrowInvalidInput(const std::string& message);
[[noreturn]] void ThrowInternalError(const std::string& message);

}  // namespace engine

#endif
