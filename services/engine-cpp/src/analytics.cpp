#include "engine/analytics.hpp"

#include <algorithm>
#include <chrono>
#include <cstdint>
#include <iomanip>
#include <iterator>
#include <numeric>
#include <sstream>
#include <string_view>
#include <unordered_map>
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

struct SyntheticTemplate {
  std::vector<NormalizedPeriod> periods;
  std::vector<NormalizedDay> days;
  std::vector<NormalizedMedic> medics;
  std::vector<int> day_index_by_numeric_index;
  std::vector<int> medic_index_by_numeric_index;
};

struct SyntheticNormalizedInput {
  NormalizedInstance instance;
  int availability_pairs = 0;
};

int ElapsedMs(std::chrono::steady_clock::time_point started_at, std::chrono::steady_clock::time_point finished_at) {
  return static_cast<int>(std::chrono::duration_cast<std::chrono::milliseconds>(finished_at - started_at).count());
}

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

SyntheticTemplate BuildSyntheticTemplate(const SyntheticProfile& profile) {
  std::vector<DayInput> raw_days;
  raw_days.reserve(profile.days_count);
  for (int index = 0; index < profile.days_count; ++index) {
    raw_days.push_back(DayInput{.id = "d" + std::to_string(index + 1), .date = FormatDate2026(index)});
  }

  std::vector<PeriodInput> raw_periods;
  raw_periods.reserve(profile.periods_count);
  for (int index = 0; index < profile.periods_count; ++index) {
    raw_periods.push_back(PeriodInput{.id = "p" + std::to_string(index + 1), .day_ids = {}});
  }

  std::vector<MedicInput> raw_medics;
  raw_medics.reserve(profile.medics_count);
  for (int index = 0; index < profile.medics_count; ++index) {
    raw_medics.push_back(MedicInput{.id = "m" + std::to_string(index + 1),
                                    .name = "Medic " + std::to_string(index + 1)});
  }

  SyntheticTemplate result;
  result.days.reserve(raw_days.size());
  result.periods.reserve(raw_periods.size());
  result.medics.reserve(raw_medics.size());
  result.day_index_by_numeric_index.assign(raw_days.size(), -1);
  result.medic_index_by_numeric_index.assign(raw_medics.size(), -1);

  std::vector<int> day_order(raw_days.size());
  std::iota(day_order.begin(), day_order.end(), 0);
  std::sort(day_order.begin(), day_order.end(), [&](int lhs, int rhs) {
    return raw_days[static_cast<std::size_t>(lhs)].id < raw_days[static_cast<std::size_t>(rhs)].id;
  });
  for (int numeric_day_index : day_order) {
    const int sorted_day_index = static_cast<int>(result.days.size());
    const DayInput& day = raw_days[static_cast<std::size_t>(numeric_day_index)];
    result.day_index_by_numeric_index[static_cast<std::size_t>(numeric_day_index)] = sorted_day_index;
    result.days.push_back({day.id, day.date, -1});
  }

  std::vector<int> period_order(raw_periods.size());
  std::iota(period_order.begin(), period_order.end(), 0);
  std::sort(period_order.begin(), period_order.end(), [&](int lhs, int rhs) {
    return raw_periods[static_cast<std::size_t>(lhs)].id < raw_periods[static_cast<std::size_t>(rhs)].id;
  });
  for (int numeric_period_index : period_order) {
    const int sorted_period_index = static_cast<int>(result.periods.size());
    const PeriodInput& period = raw_periods[static_cast<std::size_t>(numeric_period_index)];
    NormalizedPeriod normalized_period{period.id, {}};
    for (int numeric_day_index = numeric_period_index; numeric_day_index < profile.days_count;
         numeric_day_index += profile.periods_count) {
      const int sorted_day_index = result.day_index_by_numeric_index[static_cast<std::size_t>(numeric_day_index)];
      result.days[static_cast<std::size_t>(sorted_day_index)].period_index = sorted_period_index;
      normalized_period.day_indices.push_back(sorted_day_index);
    }
    std::sort(normalized_period.day_indices.begin(), normalized_period.day_indices.end());
    result.periods.push_back(std::move(normalized_period));
  }

  std::vector<int> medic_order(raw_medics.size());
  std::iota(medic_order.begin(), medic_order.end(), 0);
  std::sort(medic_order.begin(), medic_order.end(), [&](int lhs, int rhs) {
    return raw_medics[static_cast<std::size_t>(lhs)].id < raw_medics[static_cast<std::size_t>(rhs)].id;
  });
  for (int numeric_medic_index : medic_order) {
    const int sorted_medic_index = static_cast<int>(result.medics.size());
    const MedicInput& medic = raw_medics[static_cast<std::size_t>(numeric_medic_index)];
    result.medic_index_by_numeric_index[static_cast<std::size_t>(numeric_medic_index)] = sorted_medic_index;
    result.medics.push_back({medic.id, medic.name});
  }

  return result;
}

std::string TemplateCacheKey(const SyntheticProfile& profile) {
  return std::to_string(profile.days_count) + ":" + std::to_string(profile.medics_count) + ":" +
         std::to_string(profile.periods_count);
}

const SyntheticTemplate& GetSyntheticTemplate(const SyntheticProfile& profile) {
  static std::unordered_map<std::string, SyntheticTemplate> cache;
  const std::string key = TemplateCacheKey(profile);
  const auto iterator = cache.find(key);
  if (iterator != cache.end()) {
    return iterator->second;
  }

  const auto [inserted_iterator, inserted] = cache.emplace(key, BuildSyntheticTemplate(profile));
  (void)inserted;
  return inserted_iterator->second;
}

SyntheticNormalizedInput GenerateSyntheticNormalizedInput(const SyntheticProfile& profile,
                                                          std::string instance_id,
                                                          int seed) {
  const SyntheticTemplate& synthetic_template = GetSyntheticTemplate(profile);
  NormalizedInstance instance;
  instance.instance_id = std::move(instance_id);
  instance.max_days_per_medic = profile.max_days_per_medic;
  instance.days = synthetic_template.days;
  instance.periods = synthetic_template.periods;
  instance.medics = synthetic_template.medics;
  instance.availability_by_medic.assign(instance.medics.size(), {});

  const std::size_t estimated_availability_per_medic =
      static_cast<std::size_t>(static_cast<double>(profile.days_count) * profile.availability_density) + 1;
  for (std::vector<int>& medic_days : instance.availability_by_medic) {
    medic_days.reserve(estimated_availability_per_medic);
  }

  Prng random(static_cast<std::uint32_t>(seed));
  int availability_pairs = 0;
  for (int numeric_medic_index = 0; numeric_medic_index < profile.medics_count; ++numeric_medic_index) {
    const int medic_index =
        synthetic_template.medic_index_by_numeric_index[static_cast<std::size_t>(numeric_medic_index)];
    std::vector<int>& medic_days = instance.availability_by_medic[static_cast<std::size_t>(medic_index)];
    for (int numeric_day_index = 0; numeric_day_index < profile.days_count; ++numeric_day_index) {
      if (random.Next() < profile.availability_density) {
        const int day_index = synthetic_template.day_index_by_numeric_index[static_cast<std::size_t>(numeric_day_index)];
        medic_days.push_back(day_index);
        ++availability_pairs;
      }
    }
  }

  for (std::vector<int>& medic_days : instance.availability_by_medic) {
    std::sort(medic_days.begin(), medic_days.end());
  }

  return SyntheticNormalizedInput{.instance = std::move(instance), .availability_pairs = availability_pairs};
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
  const auto started_at = std::chrono::steady_clock::now();
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
  const auto parsed_at = std::chrono::steady_clock::now();
  SyntheticNormalizedInput input = GenerateSyntheticNormalizedInput(profile, instance_id, seed);
  const int availability_pairs = input.availability_pairs;
  const auto generated_at = std::chrono::steady_clock::now();
  ProfiledSolveResult solve_result = SolveNormalizedInstanceProfiled(input.instance);
  const auto solved_at = std::chrono::steady_clock::now();
  return AnalyticsSolveResult{.response = std::move(solve_result.response),
                              .solve_timings = solve_result.timings,
                              .availability_pairs = availability_pairs,
                              .parse_ms = ElapsedMs(started_at, parsed_at),
                              .generate_ms = ElapsedMs(parsed_at, generated_at),
                              .solve_ms = ElapsedMs(generated_at, solved_at),
                              .total_ms = ElapsedMs(started_at, solved_at)};
}

JsonValue ToAnalyticsTimingsJson(const AnalyticsSolveResult& result) {
  return JsonValue{{"parseMs", result.parse_ms},
                   {"generateMs", result.generate_ms},
                   {"solveMs", result.solve_ms},
                   {"totalMs", result.total_ms},
                   {"normalizeMs", result.solve_timings.normalize_ms},
                   {"buildNetworkMs", result.solve_timings.build_network_ms},
                   {"maxFlowMs", result.solve_timings.max_flow_ms},
                   {"finalizeMs", result.solve_timings.finalize_ms},
                   {"solveTotalMs", result.solve_timings.total_ms}};
}

std::string SerializeAnalyticsResponse(const AnalyticsSolveResult& result) {
  JsonValue root = ToJson(result.response);
  root["analytics"] = JsonValue{{"availabilityPairs", result.availability_pairs},
                                 {"timings", ToAnalyticsTimingsJson(result)}};
  return SerializeJson(root);
}

std::string SerializeAnalyticsSummaryResponse(const AnalyticsSolveResult& result) {
  const SolveResponse& response = result.response;
  const int uncovered_days_count =
      response.diagnostics.has_value() ? static_cast<int>(response.diagnostics->uncovered_days.size()) : 0;

  JsonValue root = JsonValue::object();
  root["instanceId"] = response.instance_id;
  root["feasible"] = response.feasible;
  root["requiredFlow"] = response.required_flow;
  root["maxFlow"] = response.max_flow;
  root["uncoveredDaysCount"] = uncovered_days_count;
  root["stats"] = JsonValue{{"nodes", response.stats.nodes},
                             {"edges", response.stats.edges},
                             {"runtimeMs", response.stats.runtime_ms}};
  root["analytics"] = JsonValue{{"availabilityPairs", result.availability_pairs},
                                 {"timings", ToAnalyticsTimingsJson(result)}};
  return SerializeJson(root);
}

}  // namespace engine
