#include "engine/problem_network.hpp"

#include <algorithm>

namespace engine {

ProblemNetwork BuildProblemNetwork(const NormalizedInstance& instance) {
  const int medic_count = static_cast<int>(instance.medics.size());
  const int period_count = static_cast<int>(instance.periods.size());
  const int day_count = static_cast<int>(instance.days.size());
  const int node_count = 2 + medic_count + (medic_count * period_count) + day_count;

  ProblemNetwork network;
  network.graph = Graph(node_count);
  network.source = 0;
  network.sink = node_count - 1;
  network.medic_nodes.resize(medic_count);
  network.medic_period_nodes.assign(medic_count, std::vector<int>(period_count, -1));
  network.day_nodes.resize(day_count);
  network.day_sink_edges.resize(day_count);

  int next_node = 1;
  for (int medic_index = 0; medic_index < medic_count; ++medic_index) {
    network.medic_nodes[static_cast<std::size_t>(medic_index)] = next_node++;
  }
  for (int medic_index = 0; medic_index < medic_count; ++medic_index) {
    for (int period_index = 0; period_index < period_count; ++period_index) {
      network.medic_period_nodes[static_cast<std::size_t>(medic_index)][static_cast<std::size_t>(period_index)] = next_node++;
    }
  }
  for (int day_index = 0; day_index < day_count; ++day_index) {
    network.day_nodes[static_cast<std::size_t>(day_index)] = next_node++;
  }

  for (int medic_index = 0; medic_index < medic_count; ++medic_index) {
    const int medic_node = network.medic_nodes[static_cast<std::size_t>(medic_index)];
    (void)network.graph.AddEdge(network.source, medic_node, instance.max_days_per_medic);
    for (int period_index = 0; period_index < period_count; ++period_index) {
      const int medic_period_node =
          network.medic_period_nodes[static_cast<std::size_t>(medic_index)][static_cast<std::size_t>(period_index)];
      (void)network.graph.AddEdge(medic_node, medic_period_node, 1);
    }
  }

  for (int medic_index = 0; medic_index < medic_count; ++medic_index) {
    for (const int day_index : instance.availability_by_medic[static_cast<std::size_t>(medic_index)]) {
      const int period_index = instance.days[static_cast<std::size_t>(day_index)].period_index;
      const int from =
          network.medic_period_nodes[static_cast<std::size_t>(medic_index)][static_cast<std::size_t>(period_index)];
      const int to = network.day_nodes[static_cast<std::size_t>(day_index)];
      const EdgeRef edge_ref = network.graph.AddEdge(from, to, 1);
      network.assignment_arcs.push_back({edge_ref, medic_index, period_index, day_index});
    }
  }

  for (int day_index = 0; day_index < day_count; ++day_index) {
    network.day_sink_edges[static_cast<std::size_t>(day_index)] =
        network.graph.AddEdge(network.day_nodes[static_cast<std::size_t>(day_index)], network.sink, 1);
  }

  return network;
}

std::vector<Assignment> ExtractAssignments(const ProblemNetwork& network, const NormalizedInstance& instance) {
  std::vector<Assignment> assignments;
  assignments.reserve(network.assignment_arcs.size());

  for (const AssignmentArc& arc : network.assignment_arcs) {
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

std::vector<std::string> FindUncoveredDays(const ProblemNetwork& network, const NormalizedInstance& instance) {
  std::vector<std::string> uncovered;
  uncovered.reserve(instance.days.size());

  for (int day_index = 0; day_index < static_cast<int>(instance.days.size()); ++day_index) {
    if (network.graph.GetEdge(network.day_sink_edges[static_cast<std::size_t>(day_index)]).flow == 0) {
      uncovered.push_back(instance.days[static_cast<std::size_t>(day_index)].id);
    }
  }

  return uncovered;
}

}  // namespace engine
