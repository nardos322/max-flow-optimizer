from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def compare_with_previous_summary(
    current_rows: list[dict[str, Any]], previous_summary_path: Path | None, repo_root: Path
) -> dict[str, Any]:
    if previous_summary_path is None:
        return {
            "status": "no_baseline",
            "baseline": None,
            "changes": [],
        }

    return compare_with_summary(current_rows, previous_summary_path, repo_root)


def compare_with_summary(
    current_rows: list[dict[str, Any]],
    baseline_summary_path: Path | None,
    repo_root: Path,
    *,
    max_p95_runtime_regression_pct: float | None = None,
) -> dict[str, Any]:
    if baseline_summary_path is None:
        return {
            "status": "no_baseline",
            "baseline": None,
            "changes": [],
        }

    previous_rows = json.loads(baseline_summary_path.read_text(encoding="utf-8"))
    previous_by_scenario = {row["scenarioName"]: row for row in previous_rows}
    changes = []
    regressions = []

    for current in current_rows:
        scenario = current["scenarioName"]
        previous = previous_by_scenario.get(scenario)
        if previous is None:
            changes.append(
                {
                    "scenarioName": scenario,
                    "status": "new_scenario",
                    "metrics": {},
                }
            )
            continue

        metrics = {
            "feasibilityRatePct": compare_metric(previous, current, "feasibilityRatePct"),
            "p95RuntimeMs": compare_metric(previous, current, "p95RuntimeMs"),
            "avgEdges": compare_metric(previous, current, "avgEdges"),
            "errorRuns": compare_metric(previous, current, "errorRuns"),
        }
        changes.append(
            {
                "scenarioName": scenario,
                "status": "compared",
                "metrics": metrics,
            }
        )

        p95_delta = metrics["p95RuntimeMs"].get("pctDelta")
        if (
            max_p95_runtime_regression_pct is not None
            and p95_delta is not None
            and p95_delta > max_p95_runtime_regression_pct
        ):
            regressions.append(
                {
                    "scenarioName": scenario,
                    "metric": "p95RuntimeMs",
                    "pctDelta": p95_delta,
                    "thresholdPct": max_p95_runtime_regression_pct,
                    "previous": metrics["p95RuntimeMs"].get("previous"),
                    "current": metrics["p95RuntimeMs"].get("current"),
                }
            )

    previous_scenarios = set(previous_by_scenario)
    current_scenarios = {row["scenarioName"] for row in current_rows}
    for scenario in sorted(previous_scenarios - current_scenarios):
        changes.append(
            {
                "scenarioName": scenario,
                "status": "removed_scenario",
                "metrics": {},
            }
        )

    return {
        "status": "failed" if regressions else "passed",
        "baseline": relative_to_repo(repo_root, baseline_summary_path),
        "thresholds": {
            "maxP95RuntimeRegressionPct": max_p95_runtime_regression_pct,
        },
        "failedRegressions": len(regressions),
        "regressions": regressions,
        "changes": changes,
    }


def compare_metric(previous: dict[str, Any], current: dict[str, Any], field: str) -> dict[str, Any]:
    previous_value = previous.get(field)
    current_value = current.get(field)
    delta = None if previous_value is None or current_value is None else current_value - previous_value
    pct_delta = None

    if delta is not None and previous_value not in (None, 0):
        pct_delta = round((delta / previous_value) * 100, 2)

    return {
        "previous": previous_value,
        "current": current_value,
        "delta": round(delta, 4) if isinstance(delta, float) else delta,
        "pctDelta": pct_delta,
    }


def relative_to_repo(repo_root: Path, path: Path) -> str:
    try:
        return str(path.relative_to(repo_root))
    except ValueError:
        return str(path)
