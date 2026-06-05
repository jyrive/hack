from __future__ import annotations

import pandas as pd


def basic_profile(df: pd.DataFrame, name: str) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "dataset": name,
            "rows": [len(df)],
            "columns": [len(df.columns)],
            "duplicate_rows": [int(df.duplicated().sum())],
            "null_cells": [int(df.isna().sum().sum())],
        }
    )


def column_quality(df: pd.DataFrame) -> pd.DataFrame:
    rows = len(df)
    quality = pd.DataFrame({
        "column": df.columns,
        "dtype": [str(df[c].dtype) for c in df.columns],
        "missing_count": [int(df[c].isna().sum()) for c in df.columns],
        "unique_count": [int(df[c].nunique(dropna=True)) for c in df.columns],
    })
    quality["missing_pct"] = (quality["missing_count"] / rows * 100).round(2)
    return quality.sort_values(["missing_pct", "column"], ascending=[False, True]).reset_index(drop=True)
