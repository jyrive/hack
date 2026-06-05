from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def rawdata_root() -> Path:
    return repo_root() / "rawdata"


def outputs_root() -> Path:
    path = repo_root() / "analysis" / "outputs"
    path.mkdir(parents=True, exist_ok=True)
    return path
