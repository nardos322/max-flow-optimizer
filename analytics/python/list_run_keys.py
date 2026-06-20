#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

try:
    import polars as pl
except ModuleNotFoundError as error:
    raise SystemExit(
        "Missing Python dependency: polars==1.14.0\n"
        "Install analytics dependencies with: pnpm analytics:setup"
    ) from error


def main() -> None:
    args = parse_args()
    path = Path(args.input)
    if not path.exists():
        return

    if path.is_dir():
        emit_directory_keys(path)
        return
    if path.suffix == ".parquet":
        emit_parquet_keys(path)
        return

    emit_jsonl_keys(path)


def emit_directory_keys(path: Path) -> None:
    for jsonl_path in sorted(path.glob("**/*.jsonl")):
        emit_jsonl_keys(jsonl_path)
    if list(path.glob("**/*.parquet")):
        emit_parquet_keys(path)


def emit_parquet_keys(path: Path) -> None:
    if path.is_dir() and not list(path.glob("**/*.parquet")):
        return
    source = str(path / "**/*.parquet") if path.is_dir() else str(path)
    frame = pl.scan_parquet(source, hive_partitioning=False).select(["instanceId", "seed"]).unique()
    for row in frame.collect().iter_rows(named=True):
        print(format_key(row["instanceId"], row["seed"]))


def emit_jsonl_keys(path: Path) -> None:
    with path.open("r", encoding="utf-8") as input_file:
        for line in input_file:
            if not line.strip():
                continue
            record = json.loads(line)
            print(format_key(record.get("instanceId"), record.get("seed")))


def format_key(instance_id: object, seed: object) -> str:
    if not isinstance(instance_id, str) or not isinstance(seed, int):
        raise ValueError("Run record must include instanceId string and seed integer.")
    return f"{instance_id}\t{seed}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="List analytics record keys already persisted for a run.")
    parser.add_argument("--input", required=True, help="JSONL, Parquet file, or partitioned Parquet directory.")
    return parser.parse_args()


if __name__ == "__main__":
    main()
