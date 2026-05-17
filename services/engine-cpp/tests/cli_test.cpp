#include <gtest/gtest.h>

#include <filesystem>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>

#include "engine/cli.hpp"
#include "engine/json.hpp"
#include "test_utils.hpp"

TEST(CliTest, ParsesSupportedArgumentShapes) {
  const engine::CliOptions stdin_options = engine::ParseCliOptions({"--stdin"});
  EXPECT_TRUE(stdin_options.use_stdin);
  EXPECT_TRUE(stdin_options.input_path.empty());
  EXPECT_FALSE(stdin_options.batch_jsonl);

  const engine::CliOptions file_options = engine::ParseCliOptions({"--input", "fixture.json"});
  EXPECT_FALSE(file_options.use_stdin);
  EXPECT_EQ(file_options.input_path, "fixture.json");
  EXPECT_FALSE(file_options.batch_jsonl);

  const engine::CliOptions batch_options = engine::ParseCliOptions({"--stdin", "--batch-jsonl"});
  EXPECT_TRUE(batch_options.use_stdin);
  EXPECT_TRUE(batch_options.batch_jsonl);
  EXPECT_FALSE(batch_options.analytics_jsonl);

  const engine::CliOptions analytics_options = engine::ParseCliOptions({"--stdin", "--analytics-jsonl"});
  EXPECT_TRUE(analytics_options.use_stdin);
  EXPECT_FALSE(analytics_options.batch_jsonl);
  EXPECT_TRUE(analytics_options.analytics_jsonl);
}

TEST(CliTest, EmitsCanonicalResponseForStdinAndFileModes) {
  std::stringstream stdin_stream(engine::SerializeJson(engine::test::WrapInput("req-stdin", "input/tiny-feasible.json")));
  std::ostringstream stdout_stream;
  std::ostringstream stderr_stream;

  EXPECT_EQ(engine::RunCli(engine::CliOptions{.use_stdin = true, .input_path = "", .batch_jsonl = false},
                           stdin_stream, stdout_stream, stderr_stream),
            0);
  EXPECT_TRUE(stderr_stream.str().empty());

  engine::JsonValue actual = engine::ParseJson(stdout_stream.str());
  engine::JsonValue expected = engine::test::LoadJsonFixture("expected/tiny-feasible.response.json");
  engine::test::NormalizeRuntimeMs(actual);
  EXPECT_EQ(actual, expected);

  const std::filesystem::path temp_valid_path = std::filesystem::temp_directory_path() / "engine-cli-valid.json";
  {
    std::ofstream temp_file(temp_valid_path);
    temp_file << engine::SerializeJson(engine::test::WrapInput("req-file", "input/tiny-feasible.json"));
  }

  std::stringstream empty_stdin;
  std::ostringstream file_stdout;
  std::ostringstream file_stderr;
  EXPECT_EQ(engine::RunCli(engine::CliOptions{.use_stdin = false,
                                             .input_path = temp_valid_path.string(),
                                             .batch_jsonl = false},
                           empty_stdin, file_stdout, file_stderr),
            0);
  EXPECT_TRUE(file_stderr.str().empty());
  engine::JsonValue file_actual = engine::ParseJson(file_stdout.str());
  engine::test::NormalizeRuntimeMs(file_actual);
  EXPECT_EQ(file_actual, expected);
  std::filesystem::remove(temp_valid_path);
}

TEST(CliTest, EmitsJsonlResponsesForBatchMode) {
  std::stringstream stdin_stream;
  stdin_stream << engine::SerializeJson(engine::test::WrapInput("req-1", "input/tiny-feasible.json")) << '\n';
  stdin_stream << engine::SerializeJson(engine::test::WrapInput("req-2", "input/tiny-infeasible-capacity.json"))
               << '\n';

  std::ostringstream stdout_stream;
  std::ostringstream stderr_stream;
  EXPECT_EQ(engine::RunCli(engine::CliOptions{.use_stdin = true, .input_path = "", .batch_jsonl = true},
                           stdin_stream, stdout_stream, stderr_stream),
            0);
  EXPECT_TRUE(stderr_stream.str().empty());

  std::istringstream output_lines(stdout_stream.str());
  std::string first_line;
  std::string second_line;
  std::string extra_line;
  ASSERT_TRUE(static_cast<bool>(std::getline(output_lines, first_line)));
  ASSERT_TRUE(static_cast<bool>(std::getline(output_lines, second_line)));
  EXPECT_FALSE(static_cast<bool>(std::getline(output_lines, extra_line)));

  engine::JsonValue first = engine::ParseJson(first_line);
  engine::JsonValue second = engine::ParseJson(second_line);
  engine::test::NormalizeRuntimeMs(first);
  engine::test::NormalizeRuntimeMs(second);
  EXPECT_EQ(first, engine::test::LoadJsonFixture("expected/tiny-feasible.response.json"));
  EXPECT_EQ(second, engine::test::LoadJsonFixture("expected/tiny-infeasible-capacity.response.json"));
}

TEST(CliTest, EmitsJsonlResponsesForCompactAnalyticsMode) {
  std::stringstream stdin_stream;
  stdin_stream << R"({"requestId":"analytics-small-sparse-0001-1101","scenarioName":"small-sparse","seed":1101,"instanceId":"small-sparse-0001","daysCount":25,"medicsCount":10,"periodsCount":5,"availabilityDensity":0.15,"maxDaysPerMedic":3})"
               << '\n';

  std::ostringstream stdout_stream;
  std::ostringstream stderr_stream;
  EXPECT_EQ(engine::RunCli(engine::CliOptions{.use_stdin = true,
                                             .input_path = "",
                                             .batch_jsonl = false,
                                             .analytics_jsonl = true},
                           stdin_stream, stdout_stream, stderr_stream),
            0);
  EXPECT_TRUE(stderr_stream.str().empty());

  engine::JsonValue actual = engine::ParseJson(stdout_stream.str());
  engine::test::NormalizeRuntimeMs(actual);
  EXPECT_EQ(actual.at("instanceId").get<std::string>(), "small-sparse-0001");
  EXPECT_EQ(actual.at("feasible").get<bool>(), false);
  EXPECT_EQ(actual.at("requiredFlow").get<int>(), 25);
  EXPECT_EQ(actual.at("maxFlow").get<int>(), 17);
  EXPECT_EQ(actual.at("stats").at("nodes").get<int>(), 87);
  EXPECT_EQ(actual.at("stats").at("edges").get<int>(), 130);
  EXPECT_EQ(actual.at("analytics").at("availabilityPairs").get<int>(), 45);
}

TEST(CliTest, RejectsAllCanonicalInvalidInputs) {
  const std::vector<std::string> invalid_inputs{
      "input/invalid-duplicate-id.json",
      "input/invalid-duplicate-day-date.json",
      "input/invalid-day-without-period.json",
      "input/invalid-day-in-multiple-periods.json",
  };

  for (const std::string& invalid_input : invalid_inputs) {
    const std::filesystem::path temp_path =
        std::filesystem::temp_directory_path() / ("engine-" + std::filesystem::path(invalid_input).stem().string() + ".json");
    {
      std::ofstream temp_file(temp_path);
      temp_file << engine::SerializeJson(engine::test::WrapInput("req-invalid", invalid_input));
    }

    std::stringstream invalid_stdin;
    std::ostringstream invalid_stdout;
    std::ostringstream invalid_stderr;
    EXPECT_EQ(engine::RunCli(engine::CliOptions{.use_stdin = false,
                                               .input_path = temp_path.string(),
                                               .batch_jsonl = false},
                             invalid_stdin, invalid_stdout, invalid_stderr),
              2);
    EXPECT_TRUE(invalid_stdout.str().empty());
    const engine::JsonValue invalid_error = engine::ParseJson(invalid_stderr.str());
    EXPECT_EQ(invalid_error.at("error").at("code").get<std::string>(), "INVALID_INPUT");
    EXPECT_FALSE(invalid_error.at("error").at("message").get<std::string>().empty());
    std::filesystem::remove(temp_path);
  }
}
