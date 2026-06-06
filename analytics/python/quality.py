from __future__ import annotations

from typing import Any

import polars as pl


def validate_runs(runs: pl.DataFrame | pl.LazyFrame, summary_rows: list[dict[str, Any]]) -> dict[str, Any]:
    runs = runs.lazy() if isinstance(runs, pl.DataFrame) else runs
    expected_columns = {
        "runId",
        "scenarioName",
        "status",
        "feasible",
        "runtimeMs",
        "wallTimeMs",
        "nodes",
        "edges",
        "errorCode",
    }
    actual_columns = set(runs.collect_schema().names())
    total_runs = runs.select(pl.len()).collect().item()
    checks = [
        build_check(
            name="required_columns_present",
            passed=expected_columns.issubset(actual_columns),
            details={
                "missing": sorted(expected_columns - actual_columns),
            },
        ),
        build_check(
            name="run_ids_present",
            **check_predicate(runs, pl.col("runId").is_not_null() & (pl.col("runId") != "")),
        ),
        build_check(
            name="scenario_names_present",
            **check_predicate(runs, pl.col("scenarioName").is_not_null() & (pl.col("scenarioName") != "")),
        ),
        build_check(
            name="status_values_valid",
            **check_predicate(runs, pl.col("status").is_in(["ok", "error"])),
        ),
        build_check(
            name="ok_runs_have_feasibility",
            **check_predicate(runs, (pl.col("status") != "ok") | pl.col("feasible").is_not_null()),
        ),
        build_check(
            name="error_runs_have_error_code",
            **check_predicate(
                runs,
                (pl.col("status") == "ok") | (pl.col("errorCode").is_not_null() & (pl.col("errorCode") != "")),
            ),
        ),
        build_check(
            name="numeric_metrics_non_negative",
            **check_predicate(runs, numeric_metrics_are_non_negative()),
        ),
        build_check(
            name="summary_counts_match_runs",
            passed=summary_counts_match_runs(runs, summary_rows),
            details={
                "summaryScenarios": len(summary_rows),
                "runScenarios": runs.select(pl.col("scenarioName").drop_nulls().n_unique()).collect().item(),
            },
        ),
    ]

    return {
        "status": "passed" if all(check["passed"] for check in checks) else "failed",
        "totalRuns": total_runs,
        "totalChecks": len(checks),
        "failedChecks": sum(1 for check in checks if not check["passed"]),
        "checks": checks,
    }


def build_check(*, name: str, passed: bool, details: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": name,
        "passed": passed,
        "details": details,
    }


def check_predicate(runs: pl.LazyFrame, predicate: pl.Expr) -> dict[str, Any]:
    invalid_runs = runs.filter(~predicate)
    invalid_count = invalid_runs.select(pl.len()).collect().item()
    sample = []
    if invalid_count > 0:
        sample = invalid_runs.select("runId").limit(5).collect().get_column("runId").to_list()
    return {
        "passed": invalid_count == 0,
        "details": {
            "invalidCount": invalid_count,
            "sampleRunIds": sample,
        },
    }


def numeric_metrics_are_non_negative() -> pl.Expr:
    fields = ["runtimeMs", "wallTimeMs", "nodes", "edges", "edgesPerNode", "uncoveredDaysCount"]
    predicate = pl.lit(True)
    for field in fields:
        predicate = predicate & (pl.col(field).is_null() | (pl.col(field) >= 0))
    return predicate


def summary_counts_match_runs(runs: pl.LazyFrame, summary_rows: list[dict[str, Any]]) -> bool:
    counts_by_scenario = {
        row["scenarioName"]: row
        for row in runs.group_by("scenarioName")
        .agg(
            pl.len().alias("runs"),
            (pl.col("status") == "ok").sum().alias("okRuns"),
            (pl.col("status") != "ok").sum().alias("errorRuns"),
        )
        .collect()
        .to_dicts()
    }

    summary_by_scenario = {row["scenarioName"]: row for row in summary_rows}
    if set(counts_by_scenario) != set(summary_by_scenario):
        return False

    return all(
        summary_by_scenario[scenario]["runs"] == counts["runs"]
        and summary_by_scenario[scenario]["okRuns"] == counts["okRuns"]
        and summary_by_scenario[scenario]["errorRuns"] == counts["errorRuns"]
        for scenario, counts in counts_by_scenario.items()
    )
