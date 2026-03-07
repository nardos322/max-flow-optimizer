#include <gtest/gtest.h>

#include <string>

#include "engine/normalized_instance.hpp"
#include "engine/problem_network.hpp"
#include "test_utils.hpp"

TEST(ProblemNetworkTest, BuildsCanonicalTinyNetwork) {
  const engine::SolveInput input = engine::test::LoadSolveInput("input/tiny-feasible.json");
  const engine::NormalizedInstance normalized = engine::NormalizeInput(input);
  const engine::ProblemNetwork network = engine::BuildProblemNetwork(normalized);

  EXPECT_EQ(static_cast<int>(normalized.periods.size()), 2);
  EXPECT_EQ(static_cast<int>(normalized.medics.size()), 2);
  EXPECT_EQ(static_cast<int>(normalized.days.size()), 3);
  EXPECT_EQ(network.graph.node_count(), 11);
  EXPECT_EQ(network.graph.logical_edge_count(), 12);
  EXPECT_EQ(network.source, 0);
  EXPECT_EQ(network.sink, 10);
  EXPECT_EQ(static_cast<int>(network.assignment_arcs.size()), 3);
}

TEST(ProblemNetworkTest, NormalizationIgnoresInputOrdering) {
  const engine::SolveInput input = engine::test::LoadSolveInput("input/valid-same-instance-different-order.json");
  const engine::NormalizedInstance normalized = engine::NormalizeInput(input);

  ASSERT_EQ(normalized.medics.size(), 2U);
  ASSERT_EQ(normalized.periods.size(), 2U);
  ASSERT_EQ(normalized.days.size(), 3U);
  EXPECT_EQ(normalized.medics[0].id, "m1");
  EXPECT_EQ(normalized.medics[1].id, "m2");
  EXPECT_EQ(normalized.periods[0].id, "p1");
  EXPECT_EQ(normalized.days[0].id, "d1");
}
