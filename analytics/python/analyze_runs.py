#!/usr/bin/env python3
# /// script
# dependencies = ["polars==1.14.0"]
# ///
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

try:
    import polars as pl
except ModuleNotFoundError as error:
    raise SystemExit(
        "Missing Python dependency: polars==1.14.0\n"
        "Install analytics dependencies with: pnpm analytics:setup"
    ) from error


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = REPO_ROOT / "data/analytics/latest-runs.jsonl"
DEFAULT_JSON_OUTPUT = REPO_ROOT / "data/analytics/latest-summary.json"
DEFAULT_CSV_OUTPUT = REPO_ROOT / "data/analytics/latest-summary.csv"


def main() -> None:
    args = parse_args()
    input_path = resolve_path(args.input)
    json_output = resolve_path(args.json_output)
    csv_output = resolve_path(args.csv_output)

    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")

    runs = pl.read_ndjson(input_path)
    summary = summarize_runs(runs)
    rows = summary.to_dicts()

    json_output.parent.mkdir(parents=True, exist_ok=True)
    csv_output.parent.mkdir(parents=True, exist_ok=True)
    json_output.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
    write_csv(csv_output, rows)

    print(
        json.dumps(
            {
                "input": relative_to_repo(input_path),
                "scenarios": len(rows),
                "json": relative_to_repo(json_output),
                "csv": relative_to_repo(csv_output),
                "engine": "polars",
            },
            indent=2,
        )
    )


def summarize_runs(runs: pl.DataFrame) -> pl.DataFrame:
    ok_runs = runs.filter(pl.col("status") == "ok")

    if ok_runs.is_empty():
        return pl.DataFrame(
            schema={
                "scenarioName": pl.String,
                "runs": pl.UInt32,
                "okRuns": pl.UInt32,
                "errorRuns": pl.UInt32,
                "feasibleRuns": pl.UInt32,
                "infeasibleRuns": pl.UInt32,
                "feasibilityRatePct": pl.Float64,
                "avgUncoveredDays": pl.Float64,
                "avgNodes": pl.Float64,
                "avgEdges": pl.Float64,
                "avgEdgesPerNode": pl.Float64,
                "p50RuntimeMs": pl.Float64,
                "p95RuntimeMs": pl.Float64,
                "p99RuntimeMs": pl.Float64,
                "maxRuntimeMs": pl.Float64,
                "p95WallTimeMs": pl.Float64,
                "maxWallTimeMs": pl.Float64,
            }
        )

    total_by_scenario = runs.group_by("scenarioName").agg(pl.len().alias("runs"))

    return (
        ok_runs.group_by("scenarioName")
        .agg(
            pl.len().alias("okRuns"),
            pl.col("feasible").sum().cast(pl.UInt32).alias("feasibleRuns"),
            (~pl.col("feasible")).sum().cast(pl.UInt32).alias("infeasibleRuns"),
            (pl.col("feasible").mean() * 100).round(2).alias("feasibilityRatePct"),
            pl.col("uncoveredDaysCount").mean().round(2).alias("avgUncoveredDays"),
            pl.col("nodes").mean().round(2).alias("avgNodes"),
            pl.col("edges").mean().round(2).alias("avgEdges"),
            pl.col("edgesPerNode").mean().round(4).alias("avgEdgesPerNode"),
            pl.col("runtimeMs").quantile(0.5, interpolation="nearest").alias("p50RuntimeMs"),
            pl.col("runtimeMs").quantile(0.95, interpolation="nearest").alias("p95RuntimeMs"),
            pl.col("runtimeMs").quantile(0.99, interpolation="nearest").alias("p99RuntimeMs"),
            pl.col("runtimeMs").max().alias("maxRuntimeMs"),
            pl.col("wallTimeMs").quantile(0.95, interpolation="nearest").alias("p95WallTimeMs"),
            pl.col("wallTimeMs").max().alias("maxWallTimeMs"),
        )
        .join(total_by_scenario, on="scenarioName", how="left")
        .with_columns((pl.col("runs") - pl.col("okRuns")).alias("errorRuns"))
        .select(
            "scenarioName",
            "runs",
            "okRuns",
            "errorRuns",
            "feasibleRuns",
            "infeasibleRuns",
            "feasibilityRatePct",
            "avgUncoveredDays",
            "avgNodes",
            "avgEdges",
            "avgEdgesPerNode",
            "p50RuntimeMs",
            "p95RuntimeMs",
            "p99RuntimeMs",
            "maxRuntimeMs",
            "p95WallTimeMs",
            "maxWallTimeMs",
        )
        .sort("scenarioName")
    )


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8")
        return

    with path.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Aggregate analytics run records with Polars.")
    parser.add_argument("--input", default=str(DEFAULT_INPUT), help="JSONL runs file.")
    parser.add_argument("--json-output", default=str(DEFAULT_JSON_OUTPUT), help="Summary JSON output path.")
    parser.add_argument("--csv-output", default=str(DEFAULT_CSV_OUTPUT), help="Summary CSV output path.")
    return parser.parse_args()


def resolve_path(value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else REPO_ROOT / path


def relative_to_repo(path: Path) -> str:
    return str(path.relative_to(REPO_ROOT))


if __name__ == "__main__":
    main()
