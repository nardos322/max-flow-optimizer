#include "engine/json.hpp"

#include <exception>
#include <string>

#include "engine/error.hpp"

namespace engine {

JsonValue ParseJson(std::string_view input) {
  try {
    return JsonValue::parse(input.begin(), input.end());
  } catch (const std::exception& error) {
    ThrowInvalidInput(std::string("Malformed JSON payload: ") + error.what());
  }
}

std::string SerializeJson(const JsonValue& value) { return value.dump(); }

}  // namespace engine
