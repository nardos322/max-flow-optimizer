#include "engine/analytics.hpp"

#include <cstdint>
#include <iomanip>
#include <iterator>
#include <sstream>
#include <string_view>
#include <utility>

#include "engine/error.hpp"
#include "engine/json.hpp"
#include "engine/solver.hpp"

namespace engine {
namespace {

struct SyntheticProfile {
  std::string name;
  int days_count = 0;
  int medics_count = 0;
  int periods_count = 0;
  double availability_density = 0.0;
  int max_days_per_medic = 0;
};

class Prng {
 public:
  explicit Prng(std::uint32_t seed) : state_(seed) {}

  double Next() {
    state_ = (1664525U * state_) + 1013904223U;
    return static_cast<double>(state_) / 4294967296.0;
  }

 private:
  std::uint32_t state_;
};

std::string FormatDate2026(int day_offset) {
  constexpr int kMonthDays[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
  int month_index = 0;
  int day_of_month = day_offset + 1;
  while (month_index < static_cast<int>(std::size(kMonthDays)) && day_of_month > kMonthDays[month_index]) {
    day_of_month -= kMonthDays[month_index];
    month_index += 1;
  }
  if (month_index >= static_cast<int>(std::size(kMonthDays))) {
    ThrowInvalidInput("Analytics generated day offset is outside supported 2026 range.");
  }

  std::ostringstream output;
  output << "2026-" << std::setw(2) << std::setfill('0') << (month_index + 1) << "-" << std::setw(2)
         << std::setfill('0') << day_of_month;
  return output.str();
}

SolveInput GenerateSyntheticInput(const SyntheticProfile& profile, std::string instance_id, int seed) {
  SolveInput input;
  input.instance_id = std::move(instance_id);
  input.max_days_per_medic = profile.max_days_per_medic;

  input.days.reserve(profile.days_count);
  for (int index = 0; index < profile.days_count; ++index) {
    input.days.push_back(DayInput{.id = "d" + std::to_string(index + 1), .date = FormatDate2026(index)});
  }

  input.periods.reserve(profile.periods_count);
  for (int index = 0; index < profile.periods_count; ++index) {
    input.periods.push_back(PeriodInput{.id = "p" + std::to_string(index + 1), .day_ids = {}});
  }
  for (int index = 0; index < profile.days_count; ++index) {
    input.periods[index % profile.periods_count].day_ids.push_back(input.days[index].id);
  }

  input.medics.reserve(profile.medics_count);
  for (int index = 0; index < profile.medics_count; ++index) {
    input.medics.push_back(MedicInput{.id = "m" + std::to_string(index + 1),
                                      .name = "Medic " + std::to_string(index + 1)});
  }

  Prng random(static_cast<std::uint32_t>(seed));
  input.availability.reserve(static_cast<std::size_t>(profile.days_count * profile.medics_count *
                                                      profile.availability_density));
  for (const MedicInput& medic : input.medics) {
    for (const DayInput& day : input.days) {
      if (random.Next() < profile.availability_density) {
        input.availability.push_back(AvailabilityInput{.medic_id = medic.id, .day_id = day.id});
      }
    }
  }

  return input;
}

int RequireAnalyticsInteger(const JsonValue& root, std::string_view key) {
  if (!root.contains(key) || !root.at(key).is_number_integer()) {
    ThrowInvalidInput("Analytics request field '" + std::string(key) + "' must be an integer.");
  }
  return root.at(key).get<int>();
}

double RequireAnalyticsNumber(const JsonValue& root, std::string_view key) {
  if (!root.contains(key) || !root.at(key).is_number()) {
    ThrowInvalidInput("Analytics request field '" + std::string(key) + "' must be a number.");
  }
  return root.at(key).get<double>();
}

std::string RequireAnalyticsString(const JsonValue& root, std::string_view key) {
  if (!root.contains(key) || !root.at(key).is_string()) {
    ThrowInvalidInput("Analytics request field '" + std::string(key) + "' must be a string.");
  }
  const std::string value = root.at(key).get<std::string>();
  if (value.empty()) {
    ThrowInvalidInput("Analytics request field '" + std::string(key) + "' cannot be empty.");
  }
  return value;
}

void ValidateSyntheticProfile(const SyntheticProfile& profile) {
  if (profile.days_count <= 0 || profile.medics_count <= 0 || profile.periods_count <= 0) {
    ThrowInvalidInput("Analytics counts must be positive.");
  }
  if (profile.days_count > 366) {
    ThrowInvalidInput("Analytics daysCount cannot exceed the supported 2026 calendar range.");
  }
  if (profile.availability_density < 0.0 || profile.availability_density > 1.0) {
    ThrowInvalidInput("Analytics availabilityDensity must be between 0 and 1.");
  }
  if (profile.max_days_per_medic < 0) {
    ThrowInvalidInput("Analytics maxDaysPerMedic cannot be negative.");
  }
}

}  // namespace

AnalyticsSolveResult SolveAnalyticsPayload(std::string_view payload) {
  const JsonValue root = ParseJson(payload);
  if (!root.is_object()) {
    ThrowInvalidInput("Analytics request must be a JSON object.");
  }

  SyntheticProfile profile;
  profile.name = RequireAnalyticsString(root, "scenarioName");
  profile.days_count = RequireAnalyticsInteger(root, "daysCount");
  profile.medics_count = RequireAnalyticsInteger(root, "medicsCount");
  profile.periods_count = RequireAnalyticsInteger(root, "periodsCount");
  profile.availability_density = RequireAnalyticsNumber(root, "availabilityDensity");
  profile.max_days_per_medic = RequireAnalyticsInteger(root, "maxDaysPerMedic");
  ValidateSyntheticProfile(profile);

  const int seed = RequireAnalyticsInteger(root, "seed");
  const std::string instance_id = RequireAnalyticsString(root, "instanceId");
  SolveInput input = GenerateSyntheticInput(profile, instance_id, seed);
  const int availability_pairs = static_cast<int>(input.availability.size());
  return AnalyticsSolveResult{.response = SolveInstance(input), .availability_pairs = availability_pairs};
}

std::string SerializeAnalyticsResponse(const AnalyticsSolveResult& result) {
  JsonValue root = ToJson(result.response);
  root["analytics"] = JsonValue{{"availabilityPairs", result.availability_pairs}};
  return SerializeJson(root);
}

}  // namespace engine
