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

  const engine::CliOptions file_options = engine::ParseCliOptions({"--input", "fixture.json"});
  EXPECT_FALSE(file_options.use_stdin);
  EXPECT_EQ(file_options.input_path, "fixture.json");
}

TEST(CliTest, EmitsCanonicalResponseForStdinAndFileModes) {
  std::stringstream stdin_stream(engine::SerializeJson(engine::test::WrapInput("req-stdin", "input/tiny-feasible.json")));
  std::ostringstream stdout_stream;
  std::ostringstream stderr_stream;

  EXPECT_EQ(engine::RunCli(engine::CliOptions{true, ""}, stdin_stream, stdout_stream, stderr_stream), 0);
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
  EXPECT_EQ(engine::RunCli(engine::CliOptions{false, temp_valid_path.string()}, empty_stdin, file_stdout, file_stderr), 0);
  EXPECT_TRUE(file_stderr.str().empty());
  engine::JsonValue file_actual = engine::ParseJson(file_stdout.str());
  engine::test::NormalizeRuntimeMs(file_actual);
  EXPECT_EQ(file_actual, expected);
  std::filesystem::remove(temp_valid_path);
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
    EXPECT_EQ(engine::RunCli(engine::CliOptions{false, temp_path.string()}, invalid_stdin, invalid_stdout, invalid_stderr), 2);
    EXPECT_TRUE(invalid_stdout.str().empty());
    const engine::JsonValue invalid_error = engine::ParseJson(invalid_stderr.str());
    EXPECT_EQ(invalid_error.at("error").at("code").get<std::string>(), "INVALID_INPUT");
    EXPECT_FALSE(invalid_error.at("error").at("message").get<std::string>().empty());
    std::filesystem::remove(temp_path);
  }
}
