#ifndef ENGINE_COST_FLOW_HPP
#define ENGINE_COST_FLOW_HPP

#include <vector>

namespace engine {

struct CostEdgeRef {
  int from = 0;
  int edge_index = 0;
};

struct CostEdge {
  int to = 0;
  int reverse_index = 0;
  int capacity = 0;
  int flow = 0;
  int cost = 0;
};

class CostGraph {
 public:
  explicit CostGraph(int node_count = 0);

  [[nodiscard]] int node_count() const noexcept;
  [[nodiscard]] int logical_edge_count() const noexcept;

  [[nodiscard]] CostEdgeRef AddEdge(int from, int to, int capacity, int cost);
  [[nodiscard]] const std::vector<CostEdge>& edges_from(int node) const;
  [[nodiscard]] std::vector<CostEdge>& mutable_edges_from(int node);
  [[nodiscard]] const CostEdge& GetEdge(const CostEdgeRef& reference) const;
  void Augment(const CostEdgeRef& reference, int delta);

 private:
  std::vector<std::vector<CostEdge>> adjacency_;
  int logical_edge_count_ = 0;
};

struct MinCostMaxFlowResult {
  int max_flow = 0;
  int total_cost = 0;
  int augmenting_paths = 0;
};

[[nodiscard]] MinCostMaxFlowResult ComputeMinCostMaxFlow(CostGraph& graph, int source, int sink);

}  // namespace engine

#endif
