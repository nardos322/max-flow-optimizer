#ifndef ENGINE_ANALYTICS_HPP
#define ENGINE_ANALYTICS_HPP

#include <string>
#include <string_view>

#include "engine/contract.hpp"

namespace engine {

struct AnalyticsSolveResult {
  SolveResponse response;
  int availability_pairs = 0;
};

[[nodiscard]] AnalyticsSolveResult SolveAnalyticsPayload(std::string_view payload);
[[nodiscard]] std::string SerializeAnalyticsResponse(const AnalyticsSolveResult& result);

}  // namespace engine

#endif
