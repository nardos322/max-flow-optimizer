#ifndef ENGINE_PROBLEM_NETWORK_HPP
#define ENGINE_PROBLEM_NETWORK_HPP

#include <vector>

#include "engine/contract.hpp"
#include "engine/graph.hpp"
#include "engine/normalized_instance.hpp"

namespace engine {

struct AssignmentArc {
  EdgeRef edge_ref;
  int medic_index = 0;
  int period_index = 0;
  int day_index = 0;
};

struct ProblemNetwork {
  Graph graph;
  int source = 0;
  int sink = 0;
  std::vector<int> medic_nodes;
  std::vector<std::vector<int>> medic_period_nodes;
  std::vector<int> day_nodes;
  std::vector<EdgeRef> day_sink_edges;
  std::vector<AssignmentArc> assignment_arcs;
};

[[nodiscard]] ProblemNetwork BuildProblemNetwork(const NormalizedInstance& instance);
[[nodiscard]] std::vector<Assignment> ExtractAssignments(const ProblemNetwork& network,
                                                         const NormalizedInstance& instance);
[[nodiscard]] std::vector<std::string> FindUncoveredDays(const ProblemNetwork& network,
                                                         const NormalizedInstance& instance);

}  // namespace engine

#endif
