#include "engine/contract.hpp"

#include <algorithm>
#include <cstdint>
#include <limits>
#include <string_view>
#include <unordered_set>

#include "engine/error.hpp"

namespace engine {
namespace {

void RejectUnknownKeys(const JsonValue& value, std::initializer_list<std::string_view> allowed_keys,
                       std::string_view context) {
  if (!value.is_object()) {
    ThrowInvalidInput("Expected JSON object for contract parsing.");
  }

  const std::unordered_set<std::string_view> allowed(allowed_keys.begin(), allowed_keys.end());
  for (const auto& item : value.items()) {
    if (allowed.find(item.key()) == allowed.end()) {
      ThrowInvalidInput(std::string("Unexpected field '") + item.key() + "' in " + std::string(context) + ".");
    }
  }
}

const JsonValue& RequireField(const JsonValue& value, std::string_view key, std::string_view context) {
  if (!value.contains(key)) {
    ThrowInvalidInput(std::string("Missing required field '") + std::string(key) + "' in " +
                      std::string(context) + ".");
  }
  return value.at(std::string(key));
}

std::string RequireString(const JsonValue& value, std::string_view context) {
  if (!value.is_string() || value.get_ref<const std::string&>().empty()) {
    ThrowInvalidInput(std::string(context) + " must be a non-empty string.");
  }
  return value.get<std::string>();
}

int RequireInteger(const JsonValue& value, std::string_view context) {
  if (!value.is_number_integer()) {
    ThrowInvalidInput(std::string(context) + " must be an integer.");
  }
  const std::int64_t raw_value = value.get<std::int64_t>();
  if (raw_value < static_cast<std::int64_t>(std::numeric_limits<int>::min()) ||
      raw_value > static_cast<std::int64_t>(std::numeric_limits<int>::max())) {
    ThrowInvalidInput(std::string(context) + " is out of supported integer range.");
  }
  return static_cast<int>(raw_value);
}

std::vector<std::string> ParseStringArray(const JsonValue& value, std::string_view context) {
  if (!value.is_array()) {
    ThrowInvalidInput(std::string(context) + " must be an array.");
  }

  std::vector<std::string> result;
  result.reserve(value.size());
  for (const JsonValue& item : value) {
    result.push_back(RequireString(item, context));
  }
  return result;
}

PeriodInput ParsePeriod(const JsonValue& value) {
  RejectUnknownKeys(value, {"id", "dayIds"}, "period");
  PeriodInput period;
  period.id = RequireString(RequireField(value, "id", "period"), "period.id");
  period.day_ids = ParseStringArray(RequireField(value, "dayIds", "period"), "period.dayIds");
  return period;
}

DayInput ParseDay(const JsonValue& value) {
  RejectUnknownKeys(value, {"id", "date"}, "day");
  DayInput day;
  day.id = RequireString(RequireField(value, "id", "day"), "day.id");
  day.date = RequireString(RequireField(value, "date", "day"), "day.date");
  return day;
}

MedicInput ParseMedic(const JsonValue& value) {
  RejectUnknownKeys(value, {"id", "name"}, "medic");
  MedicInput medic;
  medic.id = RequireString(RequireField(value, "id", "medic"), "medic.id");
  medic.name = RequireString(RequireField(value, "name", "medic"), "medic.name");
  return medic;
}

AvailabilityInput ParseAvailability(const JsonValue& value) {
  RejectUnknownKeys(value, {"medicId", "dayId"}, "availability");
  AvailabilityInput availability;
  availability.medic_id = RequireString(RequireField(value, "medicId", "availability"),
                                        "availability.medicId");
  availability.day_id = RequireString(RequireField(value, "dayId", "availability"),
                                      "availability.dayId");
  return availability;
}

JsonValue ToJsonAssignments(const std::vector<Assignment>& assignments) {
  JsonValue output = JsonValue::array();
  for (const Assignment& assignment : assignments) {
    output.push_back(JsonValue{{"dayId", assignment.day_id},
                               {"medicId", assignment.medic_id},
                               {"periodId", assignment.period_id}});
  }
  return output;
}

}  // namespace

SolveInput ParseSolveInput(const JsonValue& value) {
  RejectUnknownKeys(value, {"instanceId", "maxDaysPerMedic", "periods", "days", "medics", "availability"},
                    "solve input");
  SolveInput input;
  input.instance_id = RequireString(RequireField(value, "instanceId", "solve input"), "instanceId");
  input.max_days_per_medic =
      RequireInteger(RequireField(value, "maxDaysPerMedic", "solve input"), "maxDaysPerMedic");

  const JsonValue& periods = RequireField(value, "periods", "solve input");
  if (!periods.is_array()) {
    ThrowInvalidInput("periods must be an array.");
  }
  input.periods.reserve(periods.size());
  for (const JsonValue& period : periods) {
    input.periods.push_back(ParsePeriod(period));
  }

  const JsonValue& days = RequireField(value, "days", "solve input");
  if (!days.is_array()) {
    ThrowInvalidInput("days must be an array.");
  }
  input.days.reserve(days.size());
  for (const JsonValue& day : days) {
    input.days.push_back(ParseDay(day));
  }

  const JsonValue& medics = RequireField(value, "medics", "solve input");
  if (!medics.is_array()) {
    ThrowInvalidInput("medics must be an array.");
  }
  input.medics.reserve(medics.size());
  for (const JsonValue& medic : medics) {
    input.medics.push_back(ParseMedic(medic));
  }

  const JsonValue& availability = RequireField(value, "availability", "solve input");
  if (!availability.is_array()) {
    ThrowInvalidInput("availability must be an array.");
  }
  input.availability.reserve(availability.size());
  for (const JsonValue& item : availability) {
    input.availability.push_back(ParseAvailability(item));
  }

  return input;
}

InternalRequest ParseInternalRequest(const JsonValue& value) {
  RejectUnknownKeys(value, {"requestId", "input"}, "internal request");
  InternalRequest request;
  request.request_id = RequireString(RequireField(value, "requestId", "internal request"), "requestId");
  request.input = ParseSolveInput(RequireField(value, "input", "internal request"));
  return request;
}

JsonValue ToJson(const SolveResponse& response) {
  JsonValue root = JsonValue::object();
  root["instanceId"] = response.instance_id;
  root["feasible"] = response.feasible;
  root["requiredFlow"] = response.required_flow;
  root["maxFlow"] = response.max_flow;
  root["assignments"] = ToJsonAssignments(response.assignments);
  root["stats"] = JsonValue{{"nodes", response.stats.nodes},
                             {"edges", response.stats.edges},
                             {"runtimeMs", response.stats.runtime_ms}};

  if (response.diagnostics.has_value()) {
    JsonValue uncovered = JsonValue::array();
    for (const std::string& day_id : response.diagnostics->uncovered_days) {
      uncovered.push_back(day_id);
    }
    root["diagnostics"] = JsonValue{{"summaryCode", response.diagnostics->summary_code},
                                     {"message", response.diagnostics->message},
                                     {"uncoveredDays", uncovered}};
  }

  return root;
}

JsonValue ToJson(const ErrorPayload& error) {
  return JsonValue{{"error", JsonValue{{"code", error.code}, {"message", error.message}}}};
}

std::string SerializeResponse(const SolveResponse& response) { return SerializeJson(ToJson(response)); }

std::string SerializeError(const ErrorPayload& error) { return SerializeJson(ToJson(error)); }

}  // namespace engine
