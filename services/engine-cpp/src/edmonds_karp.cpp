#include "engine/edmonds_karp.hpp"

#include <algorithm>
#include <limits>
#include <optional>
#include <queue>
#include <vector>

namespace engine {
namespace {

struct ParentEdge {
  bool visited = false;
  EdgeRef edge;
};

std::optional<std::vector<EdgeRef>> FindAugmentingPath(const Graph& graph, int source, int sink) {
  std::vector<ParentEdge> parents(static_cast<std::size_t>(graph.node_count()));
  std::queue<int> queue;
  parents[static_cast<std::size_t>(source)].visited = true;
  queue.push(source);

  while (!queue.empty() && !parents[static_cast<std::size_t>(sink)].visited) {
    const int current = queue.front();
    queue.pop();
    const auto& edges = graph.edges_from(current);
    for (int edge_index = 0; edge_index < static_cast<int>(edges.size()); ++edge_index) {
      const EdgeRef reference{current, edge_index};
      const Edge& edge = edges[static_cast<std::size_t>(edge_index)];
      if (graph.ResidualCapacity(reference) <= 0) {
        continue;
      }
      if (parents[static_cast<std::size_t>(edge.to)].visited) {
        continue;
      }
      parents[static_cast<std::size_t>(edge.to)].visited = true;
      parents[static_cast<std::size_t>(edge.to)].edge = reference;
      queue.push(edge.to);
      if (edge.to == sink) {
        break;
      }
    }
  }

  if (!parents[static_cast<std::size_t>(sink)].visited) {
    return std::nullopt;
  }

  std::vector<EdgeRef> path;
  for (int node = sink; node != source;) {
    const EdgeRef edge = parents[static_cast<std::size_t>(node)].edge;
    path.push_back(edge);
    const Edge& reverse = graph.edges_from(graph.GetEdge(edge).to)[static_cast<std::size_t>(graph.GetEdge(edge).reverse_index)];
    node = reverse.to;
  }
  std::reverse(path.begin(), path.end());
  return path;
}

}  // namespace

MaxFlowResult ComputeMaxFlow(Graph& graph, int source, int sink) {
  MaxFlowResult result;

  while (true) {
    const auto path = FindAugmentingPath(graph, source, sink);
    if (!path.has_value()) {
      break;
    }

    int bottleneck = std::numeric_limits<int>::max();
    for (const EdgeRef& edge : *path) {
      bottleneck = std::min(bottleneck, graph.ResidualCapacity(edge));
    }

    for (const EdgeRef& edge : *path) {
      graph.Augment(edge, bottleneck);
    }

    result.max_flow += bottleneck;
    ++result.augmenting_paths;
  }

  return result;
}

}  // namespace engine
