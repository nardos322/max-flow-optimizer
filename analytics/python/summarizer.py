from __future__ import annotations

import polars as pl


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
