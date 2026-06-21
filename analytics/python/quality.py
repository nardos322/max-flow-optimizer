from __future__ import annotations

from typing import Any

import polars as pl


def validate_runs(
    runs: pl.DataFrame | pl.LazyFrame,
    summary_rows: list[dict[str, Any]],
    *,
    expected_manifest: dict[str, Any] | None = None,
    run_metadata: dict[str, Any] | None = None,
    allow_partial: bool = False,
    max_error_rate: float = 0.0,
) -> dict[str, Any]:
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
        build_check(
            name="run_keys_unique",
            **check_unique_run_keys(runs, actual_columns),
        ),
        build_check(
            name="error_rate_within_threshold",
            **check_error_rate(runs, max_error_rate),
        ),
        build_check(
            name="manifest_total_count_matches_runs",
            **check_manifest_total_count(runs, expected_manifest, allow_partial),
        ),
        build_check(
            name="manifest_scenario_counts_match_runs",
            **check_manifest_scenario_counts(runs, expected_manifest, allow_partial),
        ),
        build_check(
            name="run_metadata_matches_manifest",
            **check_run_metadata(expected_manifest, run_metadata),
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


def check_unique_run_keys(runs: pl.LazyFrame, actual_columns: set[str]) -> dict[str, Any]:
    required_columns = {"scenarioName", "instanceId", "seed"}
    missing = sorted(required_columns - actual_columns)
    if missing:
        return {
            "passed": False,
            "details": {
                "missing": missing,
            },
        }

    duplicate_keys = (
        runs.group_by("scenarioName", "instanceId", "seed")
        .agg(pl.len().alias("count"), pl.col("runId").first().alias("sampleRunId"))
        .filter(pl.col("count") > 1)
    )
    duplicate_count = duplicate_keys.select(pl.len()).collect().item()
    sample = []
    if duplicate_count > 0:
        sample = duplicate_keys.select("sampleRunId").limit(5).collect().get_column("sampleRunId").to_list()
    return {
        "passed": duplicate_count == 0,
        "details": {
            "duplicateKeys": duplicate_count,
            "sampleRunIds": sample,
        },
    }


def check_error_rate(runs: pl.LazyFrame, max_error_rate: float) -> dict[str, Any]:
    if max_error_rate < 0 or max_error_rate > 1:
        return {
            "passed": False,
            "details": {
                "invalidThreshold": max_error_rate,
            },
        }

    totals = runs.select(
        pl.len().alias("runs"),
        (pl.col("status") != "ok").sum().alias("errors"),
    ).collect().to_dicts()[0]
    total_runs = totals["runs"]
    errors = totals["errors"]
    error_rate = 0 if total_runs == 0 else errors / total_runs
    return {
        "passed": error_rate <= max_error_rate,
        "details": {
            "runs": total_runs,
            "errors": errors,
            "errorRate": round(error_rate, 6),
            "maxErrorRate": max_error_rate,
        },
    }


def check_manifest_total_count(
    runs: pl.LazyFrame,
    expected_manifest: dict[str, Any] | None,
    allow_partial: bool,
) -> dict[str, Any]:
    if expected_manifest is None:
        return skipped("No expected manifest provided.")

    expected_total = len(expected_manifest.get("scenarios", []))
    actual_total = runs.select(pl.len()).collect().item()
    passed = actual_total <= expected_total if allow_partial else actual_total == expected_total
    return {
        "passed": passed,
        "details": {
            "expectedRows": expected_total,
            "actualRows": actual_total,
            "allowPartial": allow_partial,
        },
    }


def check_manifest_scenario_counts(
    runs: pl.LazyFrame,
    expected_manifest: dict[str, Any] | None,
    allow_partial: bool,
) -> dict[str, Any]:
    if expected_manifest is None:
        return skipped("No expected manifest provided.")

    expected_counts = scenario_counts_from_manifest(expected_manifest)
    actual_counts = {
        row["scenarioName"]: row["runs"]
        for row in runs.group_by("scenarioName").agg(pl.len().alias("runs")).collect().to_dicts()
    }
    missing = sorted(name for name in expected_counts if name not in actual_counts)
    unexpected = sorted(name for name in actual_counts if name not in expected_counts)
    mismatched = []

    for scenario, expected_count in expected_counts.items():
        actual_count = actual_counts.get(scenario, 0)
        if allow_partial:
            mismatch = actual_count > expected_count
        else:
            mismatch = actual_count != expected_count
        if mismatch:
            mismatched.append(
                {
                    "scenarioName": scenario,
                    "expected": expected_count,
                    "actual": actual_count,
                }
            )

    return {
        "passed": not missing and not unexpected and not mismatched,
        "details": {
            "missingScenarios": missing,
            "unexpectedScenarios": unexpected,
            "mismatchedScenarios": mismatched[:10],
            "mismatchedScenarioCount": len(mismatched),
            "allowPartial": allow_partial,
        },
    }


def check_run_metadata(
    expected_manifest: dict[str, Any] | None,
    run_metadata: dict[str, Any] | None,
) -> dict[str, Any]:
    if expected_manifest is None or run_metadata is None:
        return skipped("Expected manifest or run metadata not provided.")

    fingerprint = run_metadata.get("manifestFingerprint") or {}
    expected_entries = len(expected_manifest.get("scenarios", []))
    expected_counts = scenario_counts_from_manifest(expected_manifest)
    metadata_counts = {
        item.get("name"): item.get("entries")
        for item in fingerprint.get("scenarios", [])
        if item.get("name") is not None
    }

    return {
        "passed": fingerprint.get("entries") == expected_entries and metadata_counts == expected_counts,
        "details": {
            "metadataEntries": fingerprint.get("entries"),
            "expectedEntries": expected_entries,
            "metadataScenarios": metadata_counts,
            "expectedScenarios": expected_counts,
            "manifestSha256": fingerprint.get("sha256"),
        },
    }


def scenario_counts_from_manifest(manifest: dict[str, Any]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for entry in manifest.get("scenarios", []):
        scenario = entry.get("scenarioName")
        if scenario:
            counts[scenario] = counts.get(scenario, 0) + 1
    return counts


def skipped(reason: str) -> dict[str, Any]:
    return {
        "passed": True,
        "details": {
            "skipped": True,
            "reason": reason,
        },
    }
