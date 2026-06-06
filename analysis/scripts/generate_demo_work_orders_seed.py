#!/usr/bin/env python3
"""Generate diverse demo work orders per building from the anonymized CSV.

Usage:
  python3 analysis/scripts/generate_demo_work_orders_seed.py \
    --input "rawdata/Work orders/work_orders_anonymized 1.csv" \
    --output analysis/sql/work_orders_demo_seed.sql \
    --per-building 4
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Tuple


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def to_sql_value(value: str | int | None) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, int):
        return str(value)
    return sql_quote(value)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate demo work order SQL seed")
    parser.add_argument("--input", required=True, help="Path to source CSV")
    parser.add_argument("--output", required=True, help="Path to output SQL")
    parser.add_argument(
        "--per-building",
        type=int,
        default=4,
        help="How many demo work orders to generate per building",
    )
    return parser.parse_args()


def pick_priority(service_line: str, idx: int) -> int:
    # Keep priorities mixed but deterministic.
    if "Technical" in service_line:
        return 1 + (idx % 2)
    if "Property" in service_line:
        return 2 + (idx % 2)
    if "Facility" in service_line:
        return 2 + (idx % 3)
    return 3 + (idx % 2)


def main() -> None:
    args = parse_args()

    csv_path = Path(args.input)
    out_path = Path(args.output)
    per_building = max(1, args.per_building)

    by_building: Dict[Tuple[str, str, str], List[Tuple[str, str, str]]] = defaultdict(list)

    with csv_path.open("r", encoding="latin-1", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            site_name = (row.get("customer_site_name") or "").strip()
            site_address = (row.get("site_address") or "").strip()
            site_no = (row.get("CUSTOMER_SITE_NO") or "").strip()
            wo_type = (row.get("WORK_ORDER_TYPE_ENG") or "").strip() or "On-demand work"
            service_line = (row.get("SERVICE_LINE_ENG") or "").strip() or "Facility services"
            assignment = (row.get("ASSIGNMENT_TYPE_ENG") or "").strip() or "Manually assigned"

            if not site_name:
                continue

            key = (site_name, site_address, site_no)
            by_building[key].append((wo_type, service_line, assignment))

    now = datetime.now(timezone.utc)

    rows_sql: List[str] = []

    for building_index, ((site_name, site_address, site_no), raw_kinds) in enumerate(sorted(by_building.items())):
        unique_kinds: List[Tuple[str, str, str]] = list(dict.fromkeys(raw_kinds))
        if not unique_kinds:
            unique_kinds = [("On-demand work", "Facility services", "Manually assigned")]

        for idx in range(per_building):
            wo_type, service_line, assignment = unique_kinds[idx % len(unique_kinds)]

            # Add a little variety when source categories are sparse.
            if idx % 4 == 1:
                service_line = "Technical services"
            elif idx % 4 == 2:
                service_line = "Property maintenance"
            elif idx % 4 == 3:
                service_line = "Cleaning services"

            if idx % 2 == 1 and wo_type == "On-demand work":
                wo_type = "Scheduled work"

            started_at = now - timedelta(hours=(building_index * 3 + idx + 1))
            sla_end_at = started_at + timedelta(hours=6 + idx)

            wo_no = f"DEMO-{site_no or building_index + 1:0>4}-{idx + 1:02d}"

            payload = {
                "seed": "demo_per_building",
                "assignment_type_eng": assignment,
                "service_line_eng": service_line,
                "source_building": site_name,
            }

            row_sql = "(" + ", ".join(
                [
                    to_sql_value(wo_no),
                    to_sql_value(site_name),
                    to_sql_value(site_address or None),
                    to_sql_value(f"{wo_type} - {service_line}"),
                    to_sql_value(pick_priority(service_line, idx)),
                    to_sql_value(sla_end_at.isoformat()),
                    to_sql_value(started_at.isoformat()),
                    "NULL",  # finished_at
                    "true",  # is_open
                    to_sql_value(json.dumps(payload, ensure_ascii=True)),
                ]
            ) + ")"
            rows_sql.append(row_sql)

    out_path.parent.mkdir(parents=True, exist_ok=True)

    sql = "\n".join(
        [
            "-- Generated demo seed: diverse work orders per building from source CSV",
            "-- Run in Supabase SQL Editor.",
            "",
            "begin;",
            "",
            "insert into public.work_orders (",
            "    wo_no,",
            "    customer_site_name,",
            "    site_address,",
            "    work_order_type_eng,",
            "    priority_id,",
            "    sla_end_at,",
            "    started_at,",
            "    finished_at,",
            "    is_open,",
            "    source_payload",
            ") values",
            "    " + ",\n    ".join(rows_sql),
            "on conflict (wo_no) do update set",
            "    customer_site_name = excluded.customer_site_name,",
            "    site_address = excluded.site_address,",
            "    work_order_type_eng = excluded.work_order_type_eng,",
            "    priority_id = excluded.priority_id,",
            "    sla_end_at = excluded.sla_end_at,",
            "    started_at = excluded.started_at,",
            "    finished_at = excluded.finished_at,",
            "    is_open = excluded.is_open,",
            "    source_payload = excluded.source_payload,",
            "    updated_at = now();",
            "",
            "commit;",
            "",
        ]
    )

    out_path.write_text(sql, encoding="utf-8")

    print(f"Generated {len(rows_sql)} work orders across {len(by_building)} buildings")
    print(f"Wrote SQL seed to: {out_path}")


if __name__ == "__main__":
    main()
