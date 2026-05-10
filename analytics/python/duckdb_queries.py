from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import duckdb

from analytics_io import write_csv, write_json


def run_duckdb_queries(*, repo_root: Path, queries_dir: Path, output_dir: Path) -> list[dict[str, Any]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    results = []
    original_cwd = Path.cwd()

    try:
        os.chdir(repo_root)
        with duckdb.connect(database=":memory:") as connection:
            for query_path in sorted(queries_dir.glob("*.sql")):
                query_name = query_path.stem
                rows = run_query(connection, query_path)
                json_path = output_dir / f"{query_name}.json"
                csv_path = output_dir / f"{query_name}.csv"

                write_json(json_path, rows)
                write_csv(csv_path, rows)
                results.append(
                    {
                        "name": query_name,
                        "rows": len(rows),
                        "json": json_path,
                        "csv": csv_path,
                    }
                )
    finally:
        os.chdir(original_cwd)

    return results


def run_query(connection: duckdb.DuckDBPyConnection, query_path: Path) -> list[dict[str, Any]]:
    query = query_path.read_text(encoding="utf-8")
    relation = connection.sql(query)
    columns = [column[0] for column in relation.description]
    values = relation.fetchall()

    return [dict(zip(columns, row, strict=True)) for row in values]
