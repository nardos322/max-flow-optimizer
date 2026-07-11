#include <gtest/gtest.h>

#include "engine/cost_flow.hpp"
#include "engine/optimization_network.hpp"

TEST(CostFlowTest, ComputesMaximumFlowWithMinimumCost) {
  engine::CostGraph graph(4);
  const engine::CostEdgeRef cheap = graph.AddEdge(0, 1, 1, 0);
  const engine::CostEdgeRef expensive = graph.AddEdge(0, 2, 1, 5);
  (void)graph.AddEdge(1, 3, 1, 0);
  (void)graph.AddEdge(2, 3, 1, 0);
  (void)graph.AddEdge(1, 2, 1, 1);

  const engine::MinCostMaxFlowResult result = engine::ComputeMinCostMaxFlow(graph, 0, 3);

  EXPECT_EQ(result.max_flow, 2);
  EXPECT_EQ(result.total_cost, 5);
  EXPECT_EQ(result.augmenting_paths, 2);
  EXPECT_EQ(graph.GetEdge(cheap).flow, 1);
  EXPECT_EQ(graph.GetEdge(expensive).flow, 1);
}

TEST(CostFlowTest, ComputesFairnessMarginalCosts) {
  EXPECT_EQ(engine::FairnessMarginalCost(1), 0);
  EXPECT_EQ(engine::FairnessMarginalCost(2), 1);
  EXPECT_EQ(engine::FairnessMarginalCost(3), 3);
  EXPECT_EQ(engine::FairnessMarginalCost(4), 6);
}
