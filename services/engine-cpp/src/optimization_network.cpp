#include "engine/optimization_network.hpp"

#include <algorithm>
#include <cstddef>
#include <limits>
#include <unordered_map>

#include "engine/error.hpp"

namespace engine {
namespace {

int LoadNodeBase() { return 1; }

int LoadNode(const NormalizedInstance& instance, int medic_index, int load_index) {
  return LoadNodeBase() + (medic_index * instance.max_days_per_medic) + load_index;
}

int MedicPeriodInBase(const NormalizedInstance& instance) {
  return LoadNodeBase() + (static_cast<int>(instance.medics.size()) * instance.max_days_per_medic);
}

int MedicPeriodInNode(const NormalizedInstance& instance, int medic_index, int period_index) {
  return MedicPeriodInBase(instance) + (medic_index * static_cast<int>(instance.periods.size())) + period_index;
}

int MedicPeriodOutBase(const NormalizedInstance& instance) {
  return MedicPeriodInBase(instance) +
         (static_cast<int>(instance.medics.size()) * static_cast<int>(instance.periods.size()));
}

int MedicPeriodOutNode(const NormalizedInstance& instance, int medic_index, int period_index) {
  return MedicPeriodOutBase(instance) + (medic_index * static_cast<int>(instance.periods.size())) + period_index;
}

int DayNodeBase(const NormalizedInstance& instance) {
  return MedicPeriodOutBase(instance) +
         (static_cast<int>(instance.medics.size()) * static_cast<int>(instance.periods.size()));
}

int DayNode(const NormalizedInstance& instance, int day_index) { return DayNodeBase(instance) + day_index; }

}  // namespace

int FairnessMarginalCost(int load_level) {
  if (load_level <= 0) {
    ThrowInternalError("Fairness load level must be positive.");
  }
  if (load_level > 46341) {
    ThrowInternalError("Fairness load level is too large for integer cost.");
  }
  return (load_level * (load_level - 1)) / 2;
}

OptimizationNetwork BuildFairnessNetwork(const NormalizedInstance& instance) {
  const int medic_count = static_cast<int>(instance.medics.size());
  const int period_count = static_cast<int>(instance.periods.size());
  const int day_count = static_cast<int>(instance.days.size());
  const int load_node_count = medic_count * instance.max_days_per_medic;
  const int medic_period_node_count = medic_count * period_count;
  const int node_count = 2 + load_node_count + (2 * medic_period_node_count) + day_count;

  OptimizationNetwork network;
  network.graph = CostGraph(node_count);
  network.source = 0;
  network.sink = node_count - 1;
  network.day_sink_edges.resize(static_cast<std::size_t>(day_count));

  for (int medic_index = 0; medic_index < medic_count; ++medic_index) {
    for (int load_index = 0; load_index < instance.max_days_per_medic; ++load_index) {
      const int load_node = LoadNode(instance, medic_index, load_index);
      (void)network.graph.AddEdge(network.source, load_node, 1, FairnessMarginalCost(load_index + 1));
      for (int period_index = 0; period_index < period_count; ++period_index) {
        (void)network.graph.AddEdge(load_node, MedicPeriodInNode(instance, medic_index, period_index), 1, 0);
      }
    }

    for (int period_index = 0; period_index < period_count; ++period_index) {
      (void)network.graph.AddEdge(MedicPeriodInNode(instance, medic_index, period_index),
                                  MedicPeriodOutNode(instance, medic_index, period_index), 1, 0);
    }
  }

  for (int medic_index = 0; medic_index < medic_count; ++medic_index) {
    for (const int day_index : instance.availability_by_medic[static_cast<std::size_t>(medic_index)]) {
      const int period_index = instance.days[static_cast<std::size_t>(day_index)].period_index;
      const CostEdgeRef edge_ref =
          network.graph.AddEdge(MedicPeriodOutNode(instance, medic_index, period_index),
                                DayNode(instance, day_index), 1, 0);
      network.assignment_arcs.push_back({edge_ref, medic_index, period_index, day_index});
    }
  }

  for (int day_index = 0; day_index < day_count; ++day_index) {
    network.day_sink_edges[static_cast<std::size_t>(day_index)] =
        network.graph.AddEdge(DayNode(instance, day_index), network.sink, 1, 0);
  }

  return network;
}

std::vector<Assignment> ExtractAssignments(const OptimizationNetwork& network, const NormalizedInstance& instance) {
  std::vector<Assignment> assignments;
  assignments.reserve(network.assignment_arcs.size());

  for (const CostAssignmentArc& arc : network.assignment_arcs) {
    if (network.graph.GetEdge(arc.edge_ref).flow == 1) {
      assignments.push_back({instance.days[static_cast<std::size_t>(arc.day_index)].id,
                             instance.medics[static_cast<std::size_t>(arc.medic_index)].id,
                             instance.periods[static_cast<std::size_t>(arc.period_index)].id});
    }
  }

  std::sort(assignments.begin(), assignments.end(), [](const Assignment& lhs, const Assignment& rhs) {
    if (lhs.day_id != rhs.day_id) {
      return lhs.day_id < rhs.day_id;
    }
    if (lhs.medic_id != rhs.medic_id) {
      return lhs.medic_id < rhs.medic_id;
    }
    return lhs.period_id < rhs.period_id;
  });

  return assignments;
}

std::vector<std::string> FindUncoveredDays(const OptimizationNetwork& network, const NormalizedInstance& instance) {
  std::vector<std::string> uncovered;
  uncovered.reserve(instance.days.size());

  for (int day_index = 0; day_index < static_cast<int>(instance.days.size()); ++day_index) {
    if (network.graph.GetEdge(network.day_sink_edges[static_cast<std::size_t>(day_index)]).flow == 0) {
      uncovered.push_back(instance.days[static_cast<std::size_t>(day_index)].id);
    }
  }

  return uncovered;
}

SolveOptimization BuildFairnessOptimization(const NormalizedInstance& instance,
                                            const std::vector<Assignment>& assignments,
                                            int total_cost) {
  std::unordered_map<std::string, int> medic_index_by_id;
  medic_index_by_id.reserve(instance.medics.size());
  for (int medic_index = 0; medic_index < static_cast<int>(instance.medics.size()); ++medic_index) {
    medic_index_by_id.emplace(instance.medics[static_cast<std::size_t>(medic_index)].id, medic_index);
  }

  std::vector<int> assigned_days(instance.medics.size(), 0);
  for (const Assignment& assignment : assignments) {
    const auto iterator = medic_index_by_id.find(assignment.medic_id);
    if (iterator != medic_index_by_id.end()) {
      ++assigned_days[static_cast<std::size_t>(iterator->second)];
    }
  }

  int max_assigned_days = 0;
  int min_assigned_days = assigned_days.empty() ? 0 : std::numeric_limits<int>::max();
  std::vector<MedicLoad> load_by_medic;
  load_by_medic.reserve(instance.medics.size());
  for (int medic_index = 0; medic_index < static_cast<int>(instance.medics.size()); ++medic_index) {
    const int load = assigned_days[static_cast<std::size_t>(medic_index)];
    max_assigned_days = std::max(max_assigned_days, load);
    min_assigned_days = std::min(min_assigned_days, load);
    load_by_medic.push_back({instance.medics[static_cast<std::size_t>(medic_index)].id,
                             instance.medics[static_cast<std::size_t>(medic_index)].name,
                             load});
  }

  const int spread = max_assigned_days - min_assigned_days;
  return SolveOptimization{.objective = OptimizationObjective::kFairness,
                           .optimal = true,
                           .score = spread,
                           .total_cost = total_cost,
                           .max_assigned_days = max_assigned_days,
                           .min_assigned_days = min_assigned_days,
                           .spread = spread,
                           .load_by_medic = load_by_medic};
}

}  // namespace engine
