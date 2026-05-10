from __future__ import annotations

import os
from pathlib import Path
from typing import Any

os.environ.setdefault("MPLCONFIGDIR", "/tmp/max-flow-optimizer-matplotlib")

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt


def write_charts(output_dir: Path, rows: list[dict[str, Any]]) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    charts = [
        (
            "feasibility-rate.png",
            "Feasibility Rate By Scenario",
            "Feasible runs (%)",
            "feasibilityRatePct",
            "%",
            "#2563eb",
            100,
        ),
        (
            "p95-runtime.png",
            "P95 Runtime By Scenario",
            "Runtime (ms)",
            "p95RuntimeMs",
            " ms",
            "#059669",
            None,
        ),
        (
            "avg-edges.png",
            "Average Graph Edges By Scenario",
            "Average edges",
            "avgEdges",
            "",
            "#7c3aed",
            None,
        ),
    ]
    written_paths = []

    for file_name, title, x_label, field, suffix, color, fixed_max in charts:
        path = output_dir / file_name
        write_horizontal_bar_chart(
            path=path,
            rows=rows,
            title=title,
            x_label=x_label,
            field=field,
            suffix=suffix,
            color=color,
            fixed_max=fixed_max,
        )
        written_paths.append(path)

    return written_paths


def write_horizontal_bar_chart(
    *,
    path: Path,
    rows: list[dict[str, Any]],
    title: str,
    x_label: str,
    field: str,
    suffix: str,
    color: str,
    fixed_max: float | None,
) -> None:
    labels = [str(row["scenarioName"]) for row in rows]
    values = [float(row[field] or 0) for row in rows]
    height = max(3.2, 1.0 + len(rows) * 0.52)

    fig, ax = plt.subplots(figsize=(10, height))

    if rows:
        positions = range(len(rows))
        bars = ax.barh(positions, values, color=color)
        ax.set_yticks(list(positions), labels=labels)
        ax.invert_yaxis()
        ax.bar_label(bars, labels=[format_value(value, suffix) for value in values], padding=5)
    else:
        ax.text(0.5, 0.5, "No analytics rows available", ha="center", va="center")
        ax.set_yticks([])

    max_value = fixed_max or max(values or [1])
    ax.set_xlim(0, max_value * 1.15 if max_value > 0 else 1)
    ax.set_title(title, loc="left", fontsize=14, fontweight="bold")
    ax.set_xlabel(x_label)
    ax.grid(axis="x", color="#e5e7eb")
    ax.set_axisbelow(True)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_visible(False)
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def format_value(value: float, suffix: str) -> str:
    if value >= 100:
        formatted = f"{value:,.0f}"
    elif value >= 10:
        formatted = f"{value:,.1f}".rstrip("0").rstrip(".")
    else:
        formatted = f"{value:,.2f}".rstrip("0").rstrip(".")
    return f"{formatted}{suffix}"
