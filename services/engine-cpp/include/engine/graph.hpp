#ifndef ENGINE_GRAPH_HPP
#define ENGINE_GRAPH_HPP

#include <vector>

namespace engine {

struct EdgeRef {
  int from = 0;
  int edge_index = 0;
};

struct Edge {
  int to = 0;
  int reverse_index = 0;
  int capacity = 0;
  int flow = 0;
};

class Graph {
 public:
  explicit Graph(int node_count = 0);

  [[nodiscard]] int node_count() const noexcept;
  [[nodiscard]] int logical_edge_count() const noexcept;

  [[nodiscard]] EdgeRef AddEdge(int from, int to, int capacity);
  [[nodiscard]] const std::vector<Edge>& edges_from(int node) const;
  [[nodiscard]] std::vector<Edge>& mutable_edges_from(int node);
  [[nodiscard]] const Edge& GetEdge(const EdgeRef& reference) const;
  [[nodiscard]] Edge& GetMutableEdge(const EdgeRef& reference);
  [[nodiscard]] int ResidualCapacity(const EdgeRef& reference) const;
  void Augment(const EdgeRef& reference, int delta);

 private:
  std::vector<std::vector<Edge>> adjacency_;
  int logical_edge_count_ = 0;
};

}  // namespace engine

#endif
