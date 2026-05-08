#include "engine/max_flow.hpp"

#include <algorithm>
#include <limits>
#include <vector>

namespace engine {
namespace {

struct SearchState {
  std::vector<int> level;
  std::vector<int> next_edge_index;
  std::vector<int> queue;
};

bool BuildLevelGraph(const Graph& graph, int source, int sink, SearchState& state) {
  std::fill(state.level.begin(), state.level.end(), -1);
  state.queue.clear();
  state.level[static_cast<std::size_t>(source)] = 0;
  state.queue.push_back(source);

  std::size_t queue_head = 0;
  while (queue_head < state.queue.size()) {
    const int current = state.queue[queue_head++];
    const auto& edges = graph.edges_from(current);
    for (const Edge& edge : edges) {
      if (edge.capacity - edge.flow <= 0 || state.level[static_cast<std::size_t>(edge.to)] != -1) {
        continue;
      }
      state.level[static_cast<std::size_t>(edge.to)] = state.level[static_cast<std::size_t>(current)] + 1;
      state.queue.push_back(edge.to);
    }
  }

  return state.level[static_cast<std::size_t>(sink)] != -1;
}

int SendBlockingFlow(Graph& graph, int current, int sink, int flow, SearchState& state) {
  if (current == sink) {
    return flow;
  }

  auto& edges = graph.mutable_edges_from(current);
  for (int& edge_index = state.next_edge_index[static_cast<std::size_t>(current)];
       edge_index < static_cast<int>(edges.size()); ++edge_index) {
    const Edge& edge = edges[static_cast<std::size_t>(edge_index)];
    const int residual_capacity = edge.capacity - edge.flow;
    if (residual_capacity <= 0) {
      continue;
    }
    if (state.level[static_cast<std::size_t>(edge.to)] != state.level[static_cast<std::size_t>(current)] + 1) {
      continue;
    }

    const int pushed =
        SendBlockingFlow(graph, edge.to, sink, std::min(flow, residual_capacity), state);
    if (pushed <= 0) {
      continue;
    }

    graph.Augment(EdgeRef{current, edge_index}, pushed);
    return pushed;
  }

  return 0;
}

}  // namespace

MaxFlowResult ComputeMaxFlow(Graph& graph, int source, int sink) {
  MaxFlowResult result;
  SearchState search_state;
  search_state.level.resize(static_cast<std::size_t>(graph.node_count()));
  search_state.next_edge_index.resize(static_cast<std::size_t>(graph.node_count()));
  search_state.queue.reserve(static_cast<std::size_t>(graph.node_count()));

  while (BuildLevelGraph(graph, source, sink, search_state)) {
    std::fill(search_state.next_edge_index.begin(), search_state.next_edge_index.end(), 0);

    while (true) {
      const int pushed = SendBlockingFlow(graph, source, sink, std::numeric_limits<int>::max(), search_state);
      if (pushed <= 0) {
        break;
      }
      result.max_flow += pushed;
      ++result.augmenting_paths;
    }
  }

  return result;
}

}  // namespace engine
