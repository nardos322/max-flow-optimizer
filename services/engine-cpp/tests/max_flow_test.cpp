#include <gtest/gtest.h>

#include "engine/edmonds_karp.hpp"
#include "engine/graph.hpp"

TEST(MaxFlowTest, ComputesKnownMaximumFlow) {
  engine::Graph graph(4);
  const engine::EdgeRef s_to_a = graph.AddEdge(0, 1, 3);
  (void)graph.AddEdge(0, 2, 2);
  (void)graph.AddEdge(1, 2, 1);
  (void)graph.AddEdge(1, 3, 2);
  (void)graph.AddEdge(2, 3, 3);

  EXPECT_EQ(graph.node_count(), 4);
  EXPECT_EQ(graph.logical_edge_count(), 5);
  EXPECT_EQ(graph.ResidualCapacity(s_to_a), 3);

  const engine::MaxFlowResult result = engine::ComputeMaxFlow(graph, 0, 3);
  EXPECT_EQ(result.max_flow, 5);
  EXPECT_EQ(result.augmenting_paths, 3);
  EXPECT_EQ(graph.GetEdge(s_to_a).flow, 3);
}
