#ifndef ENGINE_JSON_HPP
#define ENGINE_JSON_HPP

#include <string>
#include <string_view>

#include <nlohmann/json.hpp>

namespace engine {

using JsonValue = nlohmann::ordered_json;

[[nodiscard]] JsonValue ParseJson(std::string_view input);
[[nodiscard]] std::string SerializeJson(const JsonValue& value);

}  // namespace engine

#endif
