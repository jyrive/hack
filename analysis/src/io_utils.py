from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

import pandas as pd


DEFAULT_ENCODING = "utf-8-sig"
FALLBACK_ENCODINGS = ("utf-8-sig", "latin-1")


def list_data_files(base_dir: Path, suffixes: Iterable[str] = (".csv", ".json")) -> list[Path]:
    files: list[Path] = []
    for path in base_dir.rglob("*"):
        if not path.is_file():
            continue
        if ":Zone.Identifier" in path.name:
            continue
        if path.suffix.lower() in suffixes:
            files.append(path)
    return sorted(files)


def load_csv(
    path: Path,
    parse_dates: list[str] | None = None,
    sep: str = ",",
) -> pd.DataFrame:
    last_error: UnicodeDecodeError | None = None
    for encoding in FALLBACK_ENCODINGS:
        try:
            return pd.read_csv(path, encoding=encoding, parse_dates=parse_dates, sep=sep)
        except UnicodeDecodeError as exc:
            last_error = exc

    if last_error is not None:
        raise last_error

    raise RuntimeError(f"Unable to read CSV file: {path}")


def load_json(path: Path) -> dict:
    with path.open("r", encoding=DEFAULT_ENCODING) as handle:
        return json.load(handle)
