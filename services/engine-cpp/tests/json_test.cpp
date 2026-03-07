#include <gtest/gtest.h>

#include <string>

#include "engine/json.hpp"
#include "test_utils.hpp"

TEST(JsonTest, ParsesAndSerializesNestedPayload) {
  const engine::JsonValue parsed = engine::ParseJson(
      R"({"name":"Ana","count":2,"enabled":true,"items":[1,"x",null],"nested":{"ok":false}})");

  ASSERT_TRUE(parsed.is_object());
  EXPECT_EQ(parsed.at("count").get<int>(), 2);
  EXPECT_EQ(parsed.at("name").get<std::string>(), "Ana");
  EXPECT_TRUE(parsed.at("enabled").get<bool>());
  EXPECT_TRUE(parsed.at("items").is_array());
  EXPECT_FALSE(parsed.at("nested").at("ok").get<bool>());

  const std::string serialized = engine::SerializeJson(parsed);
  const engine::JsonValue reparsed = engine::ParseJson(serialized);
  EXPECT_EQ(reparsed, parsed);
}

TEST(JsonTest, FixtureRoundtripPreservesSemanticValue) {
  const engine::JsonValue expected = engine::test::LoadJsonFixture("expected/tiny-feasible.response.json");
  EXPECT_EQ(engine::ParseJson(engine::SerializeJson(expected)), expected);
}
