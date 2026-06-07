#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

try:
    import polars as pl
except ModuleNotFoundError as error:
    raise SystemExit(
        "Missing Python dependency: polars==1.14.0\n"
        "Install analytics dependencies with: pnpm analytics:setup"
    ) from error


RUN_SCHEMA = {
    "runId": pl.String,
    "analyticsRunId": pl.String,
    "scenarioName": pl.String,
    "seed": pl.Int64,
    "solverTarget": pl.String,
    "instanceId": pl.String,
    "daysCount": pl.Int64,
    "medicsCount": pl.Int64,
    "periodsCount": pl.Int64,
    "availabilityPairs": pl.Int64,
    "availabilityDensity": pl.Float64,
    "maxDaysPerMedic": pl.Int64,
    "wallTimeMs": pl.Float64,
    "feasible": pl.Boolean,
    "requiredFlow": pl.Int64,
    "maxFlow": pl.Int64,
    "uncoveredDaysCount": pl.Int64,
    "nodes": pl.Int64,
    "edges": pl.Int64,
    "edgesPerNode": pl.Float64,
    "runtimeMs": pl.Int64,
    "engineParseMs": pl.Int64,
    "syntheticGenerateMs": pl.Int64,
    "engineSolveMs": pl.Int64,
    "engineTotalMs": pl.Int64,
    "normalizeMs": pl.Int64,
    "buildNetworkMs": pl.Int64,
    "maxFlowMs": pl.Int64,
    "finalizeMs": pl.Int64,
    "solveTotalMs": pl.Int64,
    "status": pl.String,
    "errorCode": pl.String,
}


def main() -> None:
    args = parse_args()
    writer = StreamParquetWriter(
        output_dir=Path(args.output_dir),
        latest_output=Path(args.latest_output),
        run_date=args.run_date,
        run_id=args.run_id,
        part_prefix=args.part_prefix,
        flush_rows=args.flush_rows,
    )

    for line in sys.stdin:
        if not line.strip():
            continue
        writer.write(json.loads(line))

    result = writer.close()
    print(json.dumps(result, indent=2), file=sys.stderr)


class StreamParquetWriter:
    def __init__(
        self,
        *,
        output_dir: Path,
        latest_output: Path,
        run_date: str,
        run_id: str,
        part_prefix: str,
        flush_rows: int,
    ) -> None:
        self.output_dir = output_dir
        self.latest_output = latest_output
        self.run_date = run_date
        self.run_id = run_id
        self.part_prefix = part_prefix
        self.flush_rows = flush_rows
        self.buffers: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self.part_counts: dict[str, int] = defaultdict(int)
        self.parts: list[Path] = []
        self.rows_written = 0

    def write(self, record: dict[str, Any]) -> None:
        scenario = record.get("scenarioName")
        if not isinstance(scenario, str) or not scenario:
            raise ValueError("Analytics record must include a non-empty scenarioName.")

        record["analyticsRunId"] = self.run_id
        buffer = self.buffers[scenario]
        buffer.append(record)
        if len(buffer) >= self.flush_rows:
            self.flush(scenario)

    def close(self) -> dict[str, Any]:
        for scenario in list(self.buffers):
            self.flush(scenario)

        self.write_latest_output()
        return {
            "latestOutput": str(self.latest_output),
            "partitionedOutput": str(self.output_dir),
            "parts": len(self.parts),
            "rowsWritten": self.rows_written,
        }

    def flush(self, scenario: str) -> None:
        rows = self.buffers[scenario]
        if not rows:
            return

        self.part_counts[scenario] += 1
        part_path = (
            self.output_dir
            / f"scenarioName={scenario}"
            / f"runDate={self.run_date}"
            / f"{self.part_prefix}-{self.part_counts[scenario]:06d}.parquet"
        )
        part_path.parent.mkdir(parents=True, exist_ok=True)
        pl.DataFrame(rows, schema=RUN_SCHEMA).write_parquet(part_path)
        self.parts.append(part_path)
        self.rows_written += len(rows)
        self.buffers[scenario] = []

    def write_latest_output(self) -> None:
        self.latest_output.parent.mkdir(parents=True, exist_ok=True)
        if not self.parts:
            pl.DataFrame(schema=RUN_SCHEMA).write_parquet(self.latest_output)
            return

        scans = [pl.scan_parquet(str(path), hive_partitioning=False) for path in self.parts]
        frame = pl.concat(scans)
        try:
            frame.sink_parquet(self.latest_output)
        except pl.exceptions.InvalidOperationError:
            frame.collect().write_parquet(self.latest_output)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Stream analytics JSONL records into partitioned Parquet.")
    parser.add_argument("--output-dir", required=True, help="Root directory for partitioned Parquet output.")
    parser.add_argument("--latest-output", required=True, help="Compatibility Parquet output path.")
    parser.add_argument("--run-date", required=True, help="Run date partition value in YYYY-MM-DD format.")
    parser.add_argument("--run-id", required=True, help="Analytics run id.")
    parser.add_argument("--part-prefix", required=True, help="Prefix for Parquet part file names.")
    parser.add_argument("--flush-rows", type=positive_int, default=10000, help="Rows to buffer per scenario.")
    return parser.parse_args()


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("value must be positive")
    return parsed


if __name__ == "__main__":
    main()
