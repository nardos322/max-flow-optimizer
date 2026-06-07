#ifndef ENGINE_ANALYTICS_HPP
#define ENGINE_ANALYTICS_HPP

#include <string>
#include <string_view>

#include "engine/contract.hpp"
#include "engine/solver.hpp"

namespace engine {

struct AnalyticsSolveResult {
  SolveResponse response;
  SolveTimingStats solve_timings;
  int availability_pairs = 0;
  int parse_ms = 0;
  int generate_ms = 0;
  int solve_ms = 0;
  int total_ms = 0;
};

[[nodiscard]] AnalyticsSolveResult SolveAnalyticsPayload(std::string_view payload);
[[nodiscard]] std::string SerializeAnalyticsResponse(const AnalyticsSolveResult& result);
[[nodiscard]] std::string SerializeAnalyticsSummaryResponse(const AnalyticsSolveResult& result);

}  // namespace engine

#endif
