from pathlib import Path
import sys

import pandas as pd


def find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "rawdata").exists():
            return candidate
    raise RuntimeError("Could not find repository root containing rawdata/")


def main() -> None:
    repo_root = find_repo_root(Path.cwd())
    sys.path.append(str(repo_root / "analysis" / "src"))

    from io_utils import load_csv
    from profiling import basic_profile

    alarms_path = repo_root / "rawdata" / "Alarms" / "alarms.csv"
    work_orders_path = repo_root / "rawdata" / "Work orders" / "work_orders_anonymized 1.csv"
    plans_path = repo_root / "rawdata" / "Maintenance schedule (EH-työt)" / "Scheduled maitenance plans.csv"

    df_alarms = load_csv(alarms_path)
    df_work = load_csv(work_orders_path, sep=";")
    df_plans = load_csv(plans_path)

    summary = pd.concat(
        [
            basic_profile(df_alarms, "alarms"),
            basic_profile(df_work, "work_orders"),
            basic_profile(df_plans, "maintenance_plans"),
        ],
        ignore_index=True,
    )

    out_dir = repo_root / "analysis" / "outputs"
    out_dir.mkdir(parents=True, exist_ok=True)
    output_path = out_dir / "quick_profile_summary.csv"
    summary.to_csv(output_path, index=False)

    print(summary.to_string(index=False))
    print(f"\nSaved: {output_path}")


if __name__ == "__main__":
    main()
