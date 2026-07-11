#include "engine/cost_flow.hpp"

#include <algorithm>
#include <cstddef>
#include <functional>
#include <limits>
#include <queue>
#include <utility>
#include <vector>

#include "engine/error.hpp"

namespace engine {
namespace {

constexpr int kInfinity = std::numeric_limits<int>::max() / 4;

struct ShortestPathState {
  std::vector<int> distance;
  std::vector<int> potential;
  std::vector<CostEdgeRef> previous_edge;
};

bool FindShortestPath(const CostGraph& graph, int source, int sink, ShortestPathState& state) {
  std::fill(state.distance.begin(), state.distance.end(), kInfinity);
  state.distance[static_cast<std::size_t>(source)] = 0;

  using QueueItem = std::pair<int, int>;
  std::priority_queue<QueueItem, std::vector<QueueItem>, std::greater<QueueItem>> queue;
  queue.push({0, source});

  while (!queue.empty()) {
    const auto [distance, current] = queue.top();
    queue.pop();
    if (distance != state.distance[static_cast<std::size_t>(current)]) {
      continue;
    }

    const auto& edges = graph.edges_from(current);
    for (int edge_index = 0; edge_index < static_cast<int>(edges.size()); ++edge_index) {
      const CostEdge& edge = edges[static_cast<std::size_t>(edge_index)];
      if (edge.capacity - edge.flow <= 0) {
        continue;
      }
      const int reduced_cost = edge.cost + state.potential[static_cast<std::size_t>(current)] -
                               state.potential[static_cast<std::size_t>(edge.to)];
      const int next_distance = distance + reduced_cost;
      if (next_distance >= state.distance[static_cast<std::size_t>(edge.to)]) {
        continue;
      }
      state.distance[static_cast<std::size_t>(edge.to)] = next_distance;
      state.previous_edge[static_cast<std::size_t>(edge.to)] = CostEdgeRef{current, edge_index};
      queue.push({next_distance, edge.to});
    }
  }

  return state.distance[static_cast<std::size_t>(sink)] != kInfinity;
}

}  // namespace

CostGraph::CostGraph(int node_count) : adjacency_(node_count) {}

int CostGraph::node_count() const noexcept { return static_cast<int>(adjacency_.size()); }

int CostGraph::logical_edge_count() const noexcept { return logical_edge_count_; }

CostEdgeRef CostGraph::AddEdge(int from, int to, int capacity, int cost) {
  if (from < 0 || to < 0 || from >= node_count() || to >= node_count() || capacity < 0 || cost < 0) {
    ThrowInternalError("Invalid cost edge parameters while building graph.");
  }

  CostEdge forward{to, static_cast<int>(adjacency_[static_cast<std::size_t>(to)].size()), capacity, 0, cost};
  CostEdge reverse{from, static_cast<int>(adjacency_[static_cast<std::size_t>(from)].size()), 0, 0, -cost};
  const int forward_index = static_cast<int>(adjacency_[static_cast<std::size_t>(from)].size());
  adjacency_[static_cast<std::size_t>(from)].push_back(forward);
  adjacency_[static_cast<std::size_t>(to)].push_back(reverse);
  ++logical_edge_count_;
  return CostEdgeRef{from, forward_index};
}

const std::vector<CostEdge>& CostGraph::edges_from(int node) const { return adjacency_.at(static_cast<std::size_t>(node)); }

std::vector<CostEdge>& CostGraph::mutable_edges_from(int node) { return adjacency_.at(static_cast<std::size_t>(node)); }

const CostEdge& CostGraph::GetEdge(const CostEdgeRef& reference) const {
  return adjacency_.at(static_cast<std::size_t>(reference.from)).at(static_cast<std::size_t>(reference.edge_index));
}

void CostGraph::Augment(const CostEdgeRef& reference, int delta) {
  CostEdge& forward =
      adjacency_.at(static_cast<std::size_t>(reference.from)).at(static_cast<std::size_t>(reference.edge_index));
  CostEdge& reverse =
      adjacency_.at(static_cast<std::size_t>(forward.to)).at(static_cast<std::size_t>(forward.reverse_index));
  forward.flow += delta;
  reverse.flow -= delta;
}

MinCostMaxFlowResult ComputeMinCostMaxFlow(CostGraph& graph, int source, int sink) {
  MinCostMaxFlowResult result;
  ShortestPathState state;
  state.distance.resize(static_cast<std::size_t>(graph.node_count()));
  state.potential.assign(static_cast<std::size_t>(graph.node_count()), 0);
  state.previous_edge.resize(static_cast<std::size_t>(graph.node_count()));

  while (FindShortestPath(graph, source, sink, state)) {
    for (int node = 0; node < graph.node_count(); ++node) {
      if (state.distance[static_cast<std::size_t>(node)] != kInfinity) {
        state.potential[static_cast<std::size_t>(node)] += state.distance[static_cast<std::size_t>(node)];
      }
    }

    int pushed = std::numeric_limits<int>::max();
    for (int current = sink; current != source;) {
      const CostEdgeRef edge_ref = state.previous_edge[static_cast<std::size_t>(current)];
      const CostEdge& edge = graph.GetEdge(edge_ref);
      pushed = std::min(pushed, edge.capacity - edge.flow);
      current = edge_ref.from;
    }

    int path_cost = 0;
    for (int current = sink; current != source;) {
      const CostEdgeRef edge_ref = state.previous_edge[static_cast<std::size_t>(current)];
      const CostEdge& edge = graph.GetEdge(edge_ref);
      path_cost += edge.cost;
      graph.Augment(edge_ref, pushed);
      current = edge_ref.from;
    }

    result.max_flow += pushed;
    result.total_cost += pushed * path_cost;
    ++result.augmenting_paths;
  }

  return result;
}

}  // namespace engine
