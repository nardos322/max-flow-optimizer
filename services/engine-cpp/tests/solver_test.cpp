#include <gtest/gtest.h>

#include <set>
#include <string>
#include <vector>

#include "engine/solver.hpp"
#include "test_utils.hpp"

namespace {

void ExpectFixtureMatch(const std::string& input_path, const std::string& expected_path) {
  const engine::SolveInput input = engine::test::LoadSolveInput(input_path);
  const engine::SolveResponse response = engine::SolveInstance(input);
  engine::JsonValue actual = engine::ToJson(response);
  engine::JsonValue expected = engine::test::LoadJsonFixture(expected_path);
  engine::test::NormalizeRuntimeMs(actual);
  EXPECT_EQ(actual, expected);
}

void ExpectInvariants(const engine::SolveInput& input, const engine::SolveResponse& response) {
  EXPECT_EQ(response.required_flow, static_cast<int>(input.days.size()));
  EXPECT_LE(response.max_flow, response.required_flow);
  EXPECT_EQ(response.stats.nodes,
            2 + static_cast<int>(input.medics.size()) +
                static_cast<int>(input.medics.size() * input.periods.size()) + static_cast<int>(input.days.size()));
  EXPECT_GE(response.stats.edges, static_cast<int>(input.medics.size() + input.days.size()));

  if (!response.feasible) {
    EXPECT_TRUE(response.diagnostics.has_value());
    EXPECT_TRUE(response.assignments.empty());
    return;
  }

  EXPECT_FALSE(response.diagnostics.has_value());
  EXPECT_EQ(static_cast<int>(response.assignments.size()), static_cast<int>(input.days.size()));
  std::set<std::string> seen_days;
  for (const engine::Assignment& assignment : response.assignments) {
    EXPECT_TRUE(seen_days.insert(assignment.day_id).second);
  }
}

}  // namespace

TEST(SolverTest, MatchesCanonicalExactResponses) {
  ExpectFixtureMatch("input/tiny-feasible.json", "expected/tiny-feasible.response.json");
  ExpectFixtureMatch("input/tiny-infeasible-availability.json", "expected/tiny-infeasible-availability.response.json");
  ExpectFixtureMatch("input/tiny-infeasible-capacity.json", "expected/tiny-infeasible-capacity.response.json");
  ExpectFixtureMatch("input/tiny-infeasible-per-period.json", "expected/tiny-infeasible-per-period.response.json");
  ExpectFixtureMatch("input/valid-non-contiguous-period.json", "expected/valid-non-contiguous-period.response.json");
  ExpectFixtureMatch("input/valid-medic-without-availability.json",
                     "expected/valid-medic-without-availability.response.json");
  ExpectFixtureMatch("input/valid-same-instance-different-order.json",
                     "expected/valid-same-instance-different-order.response.json");
}

TEST(SolverTest, SatisfiesSmokeInvariantsForMediumFixture) {
  const engine::SolveInput medium = engine::test::LoadSolveInput("input/medium-random-50x50.json");
  const engine::SolveResponse medium_response = engine::SolveInstance(medium);
  ExpectInvariants(medium, medium_response);
}
