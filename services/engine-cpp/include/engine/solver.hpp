#ifndef ENGINE_SOLVER_HPP
#define ENGINE_SOLVER_HPP

#include "engine/contract.hpp"

namespace engine {

struct SolveTimingStats {
  int normalize_ms = 0;
  int build_network_ms = 0;
  int max_flow_ms = 0;
  int finalize_ms = 0;
  int total_ms = 0;
};

struct ProfiledSolveResult {
  SolveResponse response;
  SolveTimingStats timings;
};

[[nodiscard]] SolveResponse SolveInstance(const SolveInput& input);
[[nodiscard]] ProfiledSolveResult SolveInstanceProfiled(const SolveInput& input);

}  // namespace engine

#endif
