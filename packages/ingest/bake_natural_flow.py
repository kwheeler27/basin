"""Bake Reclamation's Lees Ferry annual natural flow to a web artifact.

Source of record: the Colorado River Basin Natural Flow database
(usbr.gov/lc/region/g4000/NaturalFlow/), currently posted as
NaturalFlows1906-2020_20221215.xlsx. Sheet AnnualWYTotalNaturalFlow,
column for USGS 09380000 (Colorado River at Lees Ferry) — TOTAL natural
flow at the node, water-year totals in acre-feet.

"Natural" flow is a computed quantity: observed flow with upstream
consumptive use and reservoir operations added back. Reclamation revises
it; the vintage is part of the artifact.

Run from packages/ingest:  python3 bake_natural_flow.py
Cadence: annual — re-run when Reclamation posts a new workbook (the
lookout does not watch this page; check with the decree-accounting
annual refresh).
"""

from __future__ import annotations

import datetime as dt
import json
import tempfile
import urllib.request
from pathlib import Path

import openpyxl

URL = (
    "https://www.usbr.gov/lc/region/g4000/NaturalFlow/"
    "NaturalFlows1906-2020_20221215.xlsx"
)
VINTAGE = "2022-12-15 release, WY1906-2020"
GAUGE = "09380000"

# Reclamation also posts a provisional Lees Ferry-only workbook that runs
# past the official release. Provisional years are kept in a SEPARATE map
# with their own provenance — they never override the final record, and a
# provisional value for a year the final record already covers is ignored.
PROV_URL = (
    "https://www.usbr.gov/lc/region/g4000/NaturalFlow/"
    "LFnatFlow1906-2024.2024.9.12.xlsx"
)
PROV_RANGE = (4_000_000, 26_000_000)  # plausible WY total at Lees Ferry
OUT = (
    Path(__file__).resolve().parents[2]
    / "apps" / "web" / "public" / "geo" / "natural_flow_wy.json"
)


def fetch_workbook(url: str) -> openpyxl.Workbook:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 basin/0.1"})
    with urllib.request.urlopen(req, timeout=120) as r:
        blob = r.read()
    with tempfile.NamedTemporaryFile(suffix=".xlsx") as f:
        f.write(blob)
        f.flush()
        return openpyxl.load_workbook(f.name, read_only=True, data_only=True)


def provisional_years(after: int) -> tuple[dict[int, int], str]:
    """Years past the final record from the provisional workbook, plus its
    own 'Last Updated' stamp."""
    wb = fetch_workbook(PROV_URL)
    ws = wb["Water Year"]
    rows = list(ws.iter_rows(values_only=True))
    stamp = next(
        (str(c) for r in rows[:3] for c in r if isinstance(c, str) and "Updated" in c),
        "",
    )
    out: dict[int, int] = {}
    for r in rows:
        try:
            y = int(str(r[0]))
        except (TypeError, ValueError):
            continue
        v = r[1]
        if y > after and isinstance(v, (int, float)):
            lo, hi = PROV_RANGE
            assert lo <= v <= hi, f"provisional WY{y} out of range: {v}"
            out[y] = round(v)
    ys = sorted(out)
    assert ys and ys[0] == after + 1 and ys == list(range(ys[0], ys[-1] + 1)), (
        f"provisional years not contiguous from WY{after + 1}: {ys}"
    )
    return out, stamp


def main() -> None:
    wb = fetch_workbook(URL)
    ws = wb["AnnualWYTotalNaturalFlow"]

    # Locate the Lees Ferry TOTAL column by its USGS gauge id (row 3).
    gauge_row = next(ws.iter_rows(min_row=3, max_row=3, values_only=True))
    col = next(i for i, g in enumerate(gauge_row) if str(g) == GAUGE)

    wy: dict[int, int] = {}
    for row in ws.iter_rows(min_row=7, values_only=True):
        y, v = row[2], row[col]
        if isinstance(y, (int, float)) and isinstance(v, (int, float)) and 1900 < y < 2100:
            wy[int(y)] = round(v)

    years = sorted(wy)
    assert years[0] == 1906 and len(years) >= 110, "unexpected sheet shape"

    prov, prov_stamp = provisional_years(after=years[-1])

    payload = {
        "source": (
            "US Bureau of Reclamation, Colorado River Basin Natural Flow "
            "database — Colorado River at Lees Ferry (USGS 09380000), "
            "water-year TOTAL natural flow, acre-feet"
        ),
        "url": URL,
        "vintage": VINTAGE,
        "accountingConcept": "flow (naturalized — computed, not gauged)",
        "measurementClass": "estimated",
        "fetched": dt.date.today().isoformat(),
        "wy": {str(y): wy[y] for y in years},
        "provisionalUrl": PROV_URL,
        "provisionalVintage": prov_stamp,
        "provisionalNote": (
            "Years past the official release, from Reclamation's provisional "
            "Lees Ferry workbook — subject to revision, kept apart from the "
            "final record"
        ),
        "provisionalWy": {str(y): prov[y] for y in sorted(prov)},
    }
    OUT.write_text(json.dumps(payload))
    mean_all = sum(wy.values()) / len(wy)
    recent = [wy[y] for y in years if y >= 2000]
    prov_ys = sorted(prov)
    print(
        f"wrote {OUT.name}: WY{years[0]}-{years[-1]} ({len(years)} yrs), "
        f"mean {mean_all/1e6:.2f} MAF, 2000+ mean {sum(recent)/len(recent)/1e6:.2f} MAF, "
        f"provisional WY{prov_ys[0]}-{prov_ys[-1]} ('{prov_stamp}')"
    )


if __name__ == "__main__":
    main()
