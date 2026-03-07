#include "engine/error.hpp"

#include <utility>

namespace engine {

EngineError::EngineError(ExitCode exit_code, std::string code, std::string message)
    : std::runtime_error(message), exit_code_(exit_code), code_(std::move(code)) {}

ExitCode EngineError::exit_code() const noexcept { return exit_code_; }

const std::string& EngineError::code() const noexcept { return code_; }

void ThrowInvalidInput(const std::string& message) {
  throw EngineError(ExitCode::kInvalidInput, "INVALID_INPUT", message);
}

void ThrowInternalError(const std::string& message) {
  throw EngineError(ExitCode::kInternalError, "INTERNAL_ERROR", message);
}

}  // namespace engine
