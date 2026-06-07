from __future__ import annotations

import csv
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import polars as pl


def scan_runs(path: Path) -> pl.LazyFrame:
    if path.is_dir():
        return pl.scan_parquet(str(path / "**/*.parquet"), hive_partitioning=False)
    if path.suffix == ".parquet":
        return pl.scan_parquet(path)
    return pl.scan_ndjson(path)


def read_runs(path: Path) -> pl.DataFrame:
    return pl.read_ndjson(path)


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        path.write_text("", encoding="utf-8")
        return

    with path.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def write_parquet(path: Path, frame: pl.DataFrame | pl.LazyFrame) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(frame, pl.LazyFrame) and hasattr(frame, "sink_parquet"):
        try:
            frame.sink_parquet(path)
            return
        except pl.exceptions.InvalidOperationError:
            pass

    materialized = frame.collect() if isinstance(frame, pl.LazyFrame) else frame
    materialized.write_parquet(path)


def write_history(
    *,
    history_output: Path,
    timestamp: str,
    rows: list[dict[str, Any]],
    quality: dict[str, Any],
    comparison: dict[str, Any],
    runs: pl.DataFrame | pl.LazyFrame,
) -> list[Path]:
    history_output.mkdir(parents=True, exist_ok=True)
    summary_path = history_output / f"summary-{timestamp}.json"
    quality_path = history_output / f"quality-{timestamp}.json"
    comparison_path = history_output / f"comparison-{timestamp}.json"
    runs_path = history_output / f"runs-{timestamp}.parquet"

    write_json(summary_path, rows)
    write_json(quality_path, quality)
    write_json(comparison_path, comparison)
    write_parquet(runs_path, runs)

    return [summary_path, quality_path, comparison_path, runs_path]


def find_latest_history_summary(history_output: Path) -> Path | None:
    if not history_output.exists():
        return None

    summaries = sorted(history_output.glob("summary-*.json"))
    return summaries[-1] if summaries else None


def create_timestamp() -> str:
    return (
        datetime.now(UTC)
        .isoformat(timespec="microseconds")
        .replace("+00:00", "Z")
        .replace(":", "")
        .replace(".", "")
    )


def resolve_path(repo_root: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else repo_root / path


def relative_to_repo(repo_root: Path, path: Path) -> str:
    try:
        return str(path.relative_to(repo_root))
    except ValueError:
        return str(path)
