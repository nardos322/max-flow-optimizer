#include "engine/graph.hpp"

#include "engine/error.hpp"

namespace engine {

Graph::Graph(int node_count) : adjacency_(node_count) {}

int Graph::node_count() const noexcept { return static_cast<int>(adjacency_.size()); }

int Graph::logical_edge_count() const noexcept { return logical_edge_count_; }

EdgeRef Graph::AddEdge(int from, int to, int capacity) {
  if (from < 0 || to < 0 || from >= node_count() || to >= node_count() || capacity < 0) {
    ThrowInternalError("Invalid edge parameters while building graph.");
  }

  Edge forward{to, static_cast<int>(adjacency_[to].size()), capacity, 0};
  Edge reverse{from, static_cast<int>(adjacency_[from].size()), 0, 0};
  const int forward_index = static_cast<int>(adjacency_[from].size());
  adjacency_[from].push_back(forward);
  adjacency_[to].push_back(reverse);
  ++logical_edge_count_;
  return EdgeRef{from, forward_index};
}

const std::vector<Edge>& Graph::edges_from(int node) const { return adjacency_.at(node); }

std::vector<Edge>& Graph::mutable_edges_from(int node) { return adjacency_.at(node); }

const Edge& Graph::GetEdge(const EdgeRef& reference) const { return adjacency_.at(reference.from).at(reference.edge_index); }

Edge& Graph::GetMutableEdge(const EdgeRef& reference) { return adjacency_.at(reference.from).at(reference.edge_index); }

int Graph::ResidualCapacity(const EdgeRef& reference) const {
  const Edge& edge = GetEdge(reference);
  return edge.capacity - edge.flow;
}

void Graph::Augment(const EdgeRef& reference, int delta) {
  Edge& forward = adjacency_.at(reference.from).at(reference.edge_index);
  Edge& reverse = adjacency_.at(forward.to).at(forward.reverse_index);
  forward.flow += delta;
  reverse.flow -= delta;
}

}  // namespace engine
