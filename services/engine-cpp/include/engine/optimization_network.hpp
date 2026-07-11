#ifndef ENGINE_OPTIMIZATION_NETWORK_HPP
#define ENGINE_OPTIMIZATION_NETWORK_HPP

#include <vector>

#include "engine/contract.hpp"
#include "engine/cost_flow.hpp"
#include "engine/normalized_instance.hpp"

namespace engine {

struct CostAssignmentArc {
  CostEdgeRef edge_ref;
  int medic_index = 0;
  int period_index = 0;
  int day_index = 0;
};

struct OptimizationNetwork {
  CostGraph graph;
  int source = 0;
  int sink = 0;
  std::vector<CostEdgeRef> day_sink_edges;
  std::vector<CostAssignmentArc> assignment_arcs;
};

[[nodiscard]] int FairnessMarginalCost(int load_level);
[[nodiscard]] OptimizationNetwork BuildFairnessNetwork(const NormalizedInstance& instance);
[[nodiscard]] std::vector<Assignment> ExtractAssignments(const OptimizationNetwork& network,
                                                         const NormalizedInstance& instance);
[[nodiscard]] std::vector<std::string> FindUncoveredDays(const OptimizationNetwork& network,
                                                         const NormalizedInstance& instance);
[[nodiscard]] SolveOptimization BuildFairnessOptimization(const NormalizedInstance& instance,
                                                         const std::vector<Assignment>& assignments,
                                                         int total_cost);

}  // namespace engine

#endif
