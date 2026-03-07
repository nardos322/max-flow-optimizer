#include "engine/solver.hpp"

#include <chrono>

#include "engine/edmonds_karp.hpp"
#include "engine/normalized_instance.hpp"
#include "engine/problem_network.hpp"

namespace engine {
namespace {

constexpr const char* kInsufficientCoverageMessage = "Unable to cover all days under current constraints.";

}  // namespace

SolveResponse SolveInstance(const SolveInput& input) {
  const auto started_at = std::chrono::steady_clock::now();
  const NormalizedInstance instance = NormalizeInput(input);
  ProblemNetwork network = BuildProblemNetwork(instance);
  const MaxFlowResult max_flow = ComputeMaxFlow(network.graph, network.source, network.sink);
  const auto finished_at = std::chrono::steady_clock::now();

  SolveResponse response;
  response.instance_id = instance.instance_id;
  response.required_flow = static_cast<int>(instance.days.size());
  response.max_flow = max_flow.max_flow;
  response.feasible = response.max_flow == response.required_flow;
  response.stats.nodes = network.graph.node_count();
  response.stats.edges = network.graph.logical_edge_count();
  response.stats.runtime_ms = static_cast<int>(
      std::chrono::duration_cast<std::chrono::milliseconds>(finished_at - started_at).count());

  if (response.feasible) {
    response.assignments = ExtractAssignments(network, instance);
    return response;
  }

  response.assignments.clear();
  response.diagnostics = Diagnostics{"INSUFFICIENT_COVERAGE", kInsufficientCoverageMessage,
                                     FindUncoveredDays(network, instance)};
  return response;
}

}  // namespace engine
