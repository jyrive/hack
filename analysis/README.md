# Analysis Workspace

This folder contains a clear Python-first workflow for investigating the Luotea hackathon raw data.

## Structure

- `analysis/notebooks/01_alarms_workorders_eda.ipynb`: primary exploratory notebook (first focus: alarms + work orders)
- `analysis/src/io_utils.py`: robust data loading helpers (UTF-8 BOM safe, zone identifier skip support)
- `analysis/src/profiling.py`: quick profile and column-quality helpers
- `analysis/scripts/run_quick_profile.py`: fast CLI check to verify data loading and basic dataset health
- `analysis/outputs/`: generated outputs from scripts/notebooks

## 1) Environment setup

From repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r analysis/requirements.txt
```

## 2) Quick health check (optional)

```bash
python analysis/scripts/run_quick_profile.py
```

This writes `analysis/outputs/quick_profile_summary.csv`.

## 3) Start notebook investigation

```bash
jupyter lab
```

Open:

- `analysis/notebooks/01_alarms_workorders_eda.ipynb`

## 4) First investigation questions included

- Which sites/devices generate most alarms?
- How does daily alarm volume compare to work-order starts?
- What is the response latency from nearest prior alarm to work-order start (<= 7 days)?
- How much of work-order volume can be linked to a recent alarm?

## Notes

- Work orders CSV is semicolon-delimited (`;`), while alarms/plans are comma-delimited.
- Files ending with `:Zone.Identifier` are ignored and should not be loaded.
- Date parsing is explicit in the notebook for reproducibility.
