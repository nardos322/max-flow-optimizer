from __future__ import annotations

from typing import Any, Callable

import polars as pl


def validate_runs(runs: pl.DataFrame, summary_rows: list[dict[str, Any]]) -> dict[str, Any]:
    run_rows = runs.to_dicts()
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
    actual_columns = set(runs.columns)
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
            passed=all(bool(row.get("runId")) for row in run_rows),
            details=count_invalid(run_rows, lambda row: bool(row.get("runId"))),
        ),
        build_check(
            name="scenario_names_present",
            passed=all(bool(row.get("scenarioName")) for row in run_rows),
            details=count_invalid(run_rows, lambda row: bool(row.get("scenarioName"))),
        ),
        build_check(
            name="status_values_valid",
            passed=all(row.get("status") in {"ok", "error"} for row in run_rows),
            details=count_invalid(run_rows, lambda row: row.get("status") in {"ok", "error"}),
        ),
        build_check(
            name="ok_runs_have_feasibility",
            passed=all(row.get("feasible") is not None for row in run_rows if row.get("status") == "ok"),
            details=count_invalid(
                [row for row in run_rows if row.get("status") == "ok"],
                lambda row: row.get("feasible") is not None,
            ),
        ),
        build_check(
            name="error_runs_have_error_code",
            passed=all(bool(row.get("errorCode")) for row in run_rows if row.get("status") != "ok"),
            details=count_invalid(
                [row for row in run_rows if row.get("status") != "ok"],
                lambda row: bool(row.get("errorCode")),
            ),
        ),
        build_check(
            name="numeric_metrics_non_negative",
            passed=all(numeric_metrics_are_non_negative(row) for row in run_rows),
            details=count_invalid(run_rows, numeric_metrics_are_non_negative),
        ),
        build_check(
            name="summary_counts_match_runs",
            passed=summary_counts_match_runs(run_rows, summary_rows),
            details={
                "summaryScenarios": len(summary_rows),
                "runScenarios": len({row.get("scenarioName") for row in run_rows if row.get("scenarioName")}),
            },
        ),
    ]

    return {
        "status": "passed" if all(check["passed"] for check in checks) else "failed",
        "totalRuns": len(run_rows),
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


def count_invalid(rows: list[dict[str, Any]], predicate: Callable[[dict[str, Any]], bool]) -> dict[str, Any]:
    invalid = [row.get("runId") for row in rows if not predicate(row)]
    return {
        "invalidCount": len(invalid),
        "sampleRunIds": invalid[:5],
    }


def numeric_metrics_are_non_negative(row: dict[str, Any]) -> bool:
    fields = ["runtimeMs", "wallTimeMs", "nodes", "edges", "edgesPerNode", "uncoveredDaysCount"]
    return all(row.get(field) is None or row[field] >= 0 for field in fields)


def summary_counts_match_runs(run_rows: list[dict[str, Any]], summary_rows: list[dict[str, Any]]) -> bool:
    counts_by_scenario: dict[str, dict[str, int]] = {}

    for row in run_rows:
        scenario = row.get("scenarioName")
        if not scenario:
            continue
        counts = counts_by_scenario.setdefault(scenario, {"runs": 0, "okRuns": 0, "errorRuns": 0})
        counts["runs"] += 1
        if row.get("status") == "ok":
            counts["okRuns"] += 1
        else:
            counts["errorRuns"] += 1

    summary_by_scenario = {row["scenarioName"]: row for row in summary_rows}
    if set(counts_by_scenario) != set(summary_by_scenario):
        return False

    return all(
        summary_by_scenario[scenario]["runs"] == counts["runs"]
        and summary_by_scenario[scenario]["okRuns"] == counts["okRuns"]
        and summary_by_scenario[scenario]["errorRuns"] == counts["errorRuns"]
        for scenario, counts in counts_by_scenario.items()
    )
