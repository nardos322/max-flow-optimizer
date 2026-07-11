#include "engine/solver.hpp"

#include <chrono>

#include "engine/max_flow.hpp"
#include "engine/normalized_instance.hpp"
#include "engine/optimization_network.hpp"
#include "engine/problem_network.hpp"

namespace engine {
namespace {

constexpr const char* kInsufficientCoverageMessage = "Unable to cover all days under current constraints.";

int ElapsedMs(std::chrono::steady_clock::time_point started_at, std::chrono::steady_clock::time_point finished_at) {
  return static_cast<int>(std::chrono::duration_cast<std::chrono::milliseconds>(finished_at - started_at).count());
}

}  // namespace

ProfiledSolveResult SolveMaxFlowInstance(const NormalizedInstance& instance,
                                         std::chrono::steady_clock::time_point started_at,
                                         std::chrono::steady_clock::time_point normalized_at) {
  ProblemNetwork network = BuildProblemNetwork(instance);
  const auto network_built_at = std::chrono::steady_clock::now();
  const MaxFlowResult max_flow = ComputeMaxFlow(network.graph, network.source, network.sink);
  const auto max_flow_finished_at = std::chrono::steady_clock::now();

  SolveResponse response;
  response.instance_id = instance.instance_id;
  response.required_flow = static_cast<int>(instance.days.size());
  response.max_flow = max_flow.max_flow;
  response.feasible = response.max_flow == response.required_flow;
  response.stats.nodes = network.graph.node_count();
  response.stats.edges = network.graph.logical_edge_count();
  response.stats.runtime_ms = ElapsedMs(started_at, max_flow_finished_at);

  if (response.feasible) {
    response.assignments = ExtractAssignments(network, instance);
  } else {
    response.assignments.clear();
    response.diagnostics = Diagnostics{"INSUFFICIENT_COVERAGE", kInsufficientCoverageMessage,
                                       FindUncoveredDays(network, instance)};
  }

  const auto finished_at = std::chrono::steady_clock::now();
  return ProfiledSolveResult{
      .response = response,
      .timings = SolveTimingStats{.normalize_ms = ElapsedMs(started_at, normalized_at),
                                  .build_network_ms = ElapsedMs(normalized_at, network_built_at),
                                  .max_flow_ms = ElapsedMs(network_built_at, max_flow_finished_at),
                                  .finalize_ms = ElapsedMs(max_flow_finished_at, finished_at),
                                  .total_ms = ElapsedMs(started_at, finished_at)}};
}

ProfiledSolveResult SolveFairnessInstance(const NormalizedInstance& instance,
                                          std::chrono::steady_clock::time_point started_at,
                                          std::chrono::steady_clock::time_point normalized_at) {
  OptimizationNetwork network = BuildFairnessNetwork(instance);
  const auto network_built_at = std::chrono::steady_clock::now();
  const MinCostMaxFlowResult min_cost_flow = ComputeMinCostMaxFlow(network.graph, network.source, network.sink);
  const auto flow_finished_at = std::chrono::steady_clock::now();

  SolveResponse response;
  response.instance_id = instance.instance_id;
  response.required_flow = static_cast<int>(instance.days.size());
  response.max_flow = min_cost_flow.max_flow;
  response.feasible = response.max_flow == response.required_flow;
  response.stats.nodes = network.graph.node_count();
  response.stats.edges = network.graph.logical_edge_count();
  response.stats.runtime_ms = ElapsedMs(started_at, flow_finished_at);

  if (response.feasible) {
    response.assignments = ExtractAssignments(network, instance);
    response.optimization = BuildFairnessOptimization(instance, response.assignments, min_cost_flow.total_cost);
  } else {
    response.assignments.clear();
    response.diagnostics = Diagnostics{"INSUFFICIENT_COVERAGE", kInsufficientCoverageMessage,
                                       FindUncoveredDays(network, instance)};
  }

  const auto finished_at = std::chrono::steady_clock::now();
  return ProfiledSolveResult{
      .response = response,
      .timings = SolveTimingStats{.normalize_ms = ElapsedMs(started_at, normalized_at),
                                  .build_network_ms = ElapsedMs(normalized_at, network_built_at),
                                  .max_flow_ms = ElapsedMs(network_built_at, flow_finished_at),
                                  .finalize_ms = ElapsedMs(flow_finished_at, finished_at),
                                  .total_ms = ElapsedMs(started_at, finished_at)}};
}

ProfiledSolveResult SolveInstanceProfiled(const SolveInput& input) {
  const auto started_at = std::chrono::steady_clock::now();
  const NormalizedInstance instance = NormalizeInput(input);
  const auto normalized_at = std::chrono::steady_clock::now();
  if (input.optimization.objective == OptimizationObjective::kFairness) {
    return SolveFairnessInstance(instance, started_at, normalized_at);
  }
  return SolveMaxFlowInstance(instance, started_at, normalized_at);
}

ProfiledSolveResult SolveNormalizedInstanceProfiled(const NormalizedInstance& instance) {
  const auto started_at = std::chrono::steady_clock::now();
  return SolveMaxFlowInstance(instance, started_at, started_at);
}

SolveResponse SolveInstance(const SolveInput& input) {
  return SolveInstanceProfiled(input).response;
}

}  // namespace engine
