#!/usr/bin/env python3
# /// script
# dependencies = ["polars==1.14.0", "matplotlib==3.9.2", "duckdb==1.1.3"]
# ///
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

try:
    import polars  # noqa: F401
except ModuleNotFoundError as error:
    raise SystemExit(
        "Missing Python dependency: polars==1.14.0\n"
        "Install analytics dependencies with: pnpm analytics:setup"
    ) from error

try:
    os.environ.setdefault("MPLCONFIGDIR", "/tmp/max-flow-optimizer-matplotlib")
    import matplotlib  # noqa: F401
except ModuleNotFoundError as error:
    raise SystemExit(
        "Missing Python dependency: matplotlib==3.9.2\n"
        "Install analytics dependencies with: pnpm analytics:setup"
    ) from error

try:
    import duckdb  # noqa: F401
except ModuleNotFoundError as error:
    raise SystemExit(
        "Missing Python dependency: duckdb==1.1.3\n"
        "Install analytics dependencies with: pnpm analytics:setup"
    ) from error

from analytics_io import (
    create_timestamp,
    find_latest_history_summary,
    read_runs,
    relative_to_repo,
    resolve_path,
    write_csv,
    write_history,
    write_json,
    write_parquet,
)
from charts import write_charts
from comparison import compare_with_previous_summary
from duckdb_queries import run_duckdb_queries
from quality import validate_runs
from summarizer import summarize_runs


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = REPO_ROOT / "data/analytics/latest-runs.jsonl"
DEFAULT_JSON_OUTPUT = REPO_ROOT / "data/analytics/latest-summary.json"
DEFAULT_CSV_OUTPUT = REPO_ROOT / "data/analytics/latest-summary.csv"
DEFAULT_PARQUET_OUTPUT = REPO_ROOT / "data/analytics/latest-runs.parquet"
DEFAULT_QUALITY_OUTPUT = REPO_ROOT / "data/analytics/latest-quality.json"
DEFAULT_COMPARISON_OUTPUT = REPO_ROOT / "data/analytics/latest-comparison.json"
DEFAULT_HISTORY_OUTPUT = REPO_ROOT / "data/analytics/history"
DEFAULT_CHARTS_OUTPUT = REPO_ROOT / "analytics/reports/charts"
DEFAULT_QUERIES_INPUT = REPO_ROOT / "analytics/queries"
DEFAULT_DUCKDB_OUTPUT = REPO_ROOT / "data/analytics/duckdb"


def main() -> None:
    args = parse_args()
    input_path = resolve_path(REPO_ROOT, args.input)
    json_output = resolve_path(REPO_ROOT, args.json_output)
    csv_output = resolve_path(REPO_ROOT, args.csv_output)
    parquet_output = resolve_path(REPO_ROOT, args.parquet_output)
    quality_output = resolve_path(REPO_ROOT, args.quality_output)
    comparison_output = resolve_path(REPO_ROOT, args.comparison_output)
    history_output = resolve_path(REPO_ROOT, args.history_output)
    charts_output = resolve_path(REPO_ROOT, args.charts_output)
    queries_input = resolve_path(REPO_ROOT, args.queries_input)
    duckdb_output = resolve_path(REPO_ROOT, args.duckdb_output)

    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")

    previous_summary_path = find_latest_history_summary(history_output)
    runs = read_runs(input_path)
    summary = summarize_runs(runs)
    rows = summary.to_dicts()
    quality = validate_runs(runs, rows)
    comparison = compare_with_previous_summary(rows, previous_summary_path, REPO_ROOT)
    timestamp = create_timestamp()

    write_json(json_output, rows)
    write_csv(csv_output, rows)
    write_parquet(parquet_output, runs)
    write_json(quality_output, quality)
    write_json(comparison_output, comparison)
    history_paths = write_history(
        history_output=history_output,
        timestamp=timestamp,
        rows=rows,
        quality=quality,
        comparison=comparison,
        runs=runs,
    )
    chart_paths = write_charts(charts_output, rows)
    duckdb_results = run_duckdb_queries(repo_root=REPO_ROOT, queries_dir=queries_input, output_dir=duckdb_output)

    print(
        json.dumps(
            {
                "input": relative_to_repo(REPO_ROOT, input_path),
                "scenarios": len(rows),
                "json": relative_to_repo(REPO_ROOT, json_output),
                "csv": relative_to_repo(REPO_ROOT, csv_output),
                "parquet": relative_to_repo(REPO_ROOT, parquet_output),
                "quality": relative_to_repo(REPO_ROOT, quality_output),
                "comparison": relative_to_repo(REPO_ROOT, comparison_output),
                "history": [relative_to_repo(REPO_ROOT, path) for path in history_paths],
                "charts": [relative_to_repo(REPO_ROOT, path) for path in chart_paths],
                "duckdb": [
                    {
                        "name": result["name"],
                        "rows": result["rows"],
                        "json": relative_to_repo(REPO_ROOT, result["json"]),
                        "csv": relative_to_repo(REPO_ROOT, result["csv"]),
                    }
                    for result in duckdb_results
                ],
                "engine": "polars",
            },
            indent=2,
        )
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Aggregate analytics run records with Polars.")
    parser.add_argument("--input", default=str(DEFAULT_INPUT), help="JSONL runs file.")
    parser.add_argument("--json-output", default=str(DEFAULT_JSON_OUTPUT), help="Summary JSON output path.")
    parser.add_argument("--csv-output", default=str(DEFAULT_CSV_OUTPUT), help="Summary CSV output path.")
    parser.add_argument("--parquet-output", default=str(DEFAULT_PARQUET_OUTPUT), help="Parquet runs output path.")
    parser.add_argument("--quality-output", default=str(DEFAULT_QUALITY_OUTPUT), help="Quality report JSON output path.")
    parser.add_argument(
        "--comparison-output",
        default=str(DEFAULT_COMPARISON_OUTPUT),
        help="Previous-run comparison JSON output path.",
    )
    parser.add_argument("--history-output", default=str(DEFAULT_HISTORY_OUTPUT), help="Analytics history directory.")
    parser.add_argument("--charts-output", default=str(DEFAULT_CHARTS_OUTPUT), help="Charts output directory.")
    parser.add_argument("--queries-input", default=str(DEFAULT_QUERIES_INPUT), help="DuckDB SQL queries directory.")
    parser.add_argument("--duckdb-output", default=str(DEFAULT_DUCKDB_OUTPUT), help="DuckDB query output directory.")
    return parser.parse_args()


if __name__ == "__main__":
    main()
