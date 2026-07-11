#ifndef ENGINE_CONTRACT_HPP
#define ENGINE_CONTRACT_HPP

#include <optional>
#include <string>
#include <vector>

#include "engine/error.hpp"
#include "engine/json.hpp"

namespace engine {

struct PeriodInput {
  std::string id;
  std::vector<std::string> day_ids;
};

struct DayInput {
  std::string id;
  std::string date;
};

struct MedicInput {
  std::string id;
  std::string name;
};

struct AvailabilityInput {
  std::string medic_id;
  std::string day_id;
};

enum class OptimizationObjective {
  kNone,
  kFairness,
};

struct OptimizationInput {
  OptimizationObjective objective = OptimizationObjective::kNone;
};

struct SolveInput {
  std::string instance_id;
  int max_days_per_medic = 0;
  std::vector<PeriodInput> periods;
  std::vector<DayInput> days;
  std::vector<MedicInput> medics;
  std::vector<AvailabilityInput> availability;
  OptimizationInput optimization;
};

struct InternalRequest {
  std::string request_id;
  SolveInput input;
};

struct Assignment {
  std::string day_id;
  std::string medic_id;
  std::string period_id;
};

struct Diagnostics {
  std::string summary_code;
  std::string message;
  std::vector<std::string> uncovered_days;
};

struct SolveStats {
  int nodes = 0;
  int edges = 0;
  int runtime_ms = 0;
};

struct MedicLoad {
  std::string medic_id;
  std::string medic_name;
  int assigned_days = 0;
};

struct SolveOptimization {
  OptimizationObjective objective = OptimizationObjective::kFairness;
  bool optimal = false;
  int score = 0;
  int total_cost = 0;
  int max_assigned_days = 0;
  int min_assigned_days = 0;
  int spread = 0;
  std::vector<MedicLoad> load_by_medic;
};

struct SolveResponse {
  std::string instance_id;
  bool feasible = false;
  int required_flow = 0;
  int max_flow = 0;
  std::vector<Assignment> assignments;
  SolveStats stats;
  std::optional<SolveOptimization> optimization;
  std::optional<Diagnostics> diagnostics;
};

[[nodiscard]] SolveInput ParseSolveInput(const JsonValue& value);
[[nodiscard]] InternalRequest ParseInternalRequest(const JsonValue& value);
[[nodiscard]] JsonValue ToJson(const SolveResponse& response);
[[nodiscard]] JsonValue ToJson(const ErrorPayload& error);
[[nodiscard]] std::string SerializeResponse(const SolveResponse& response);
[[nodiscard]] std::string SerializeError(const ErrorPayload& error);

}  // namespace engine

#endif
