"""Bake Lower Basin consumptive-use history from decree accounting reports.

Source of record: Reclamation's Colorado River Accounting and Water Use
Reports (Article V decree accounting), one PDF per calendar year at
  https://www.usbr.gov/lc/region/g4000/4200Rpts/DecreeRpt/{y}/{y}.pdf
(2003 onward at this pattern; earlier years use other paths and formats
and are out of scope for v1).

Extracted per year: consumptive use for Arizona, California, Nevada, the
Lower Division total, and total treaty deliveries to Mexico. Formats
drift across eras, so every year is parsed with fallbacks and validated:
  - state totals must sum to the Lower Division total within 1%
  - every value must sit in a plausible historical range
A year that fails validation is EXCLUDED and reported — never silently
guessed.

Requires: pdftotext (poppler) on PATH.
Run from packages/ingest:  python3 bake_lb_consumption.py
Cadence: annual, when the new decree report posts (~May).
"""

from __future__ import annotations

import datetime as dt
import json
import re
import subprocess
import tempfile
import urllib.request
from pathlib import Path

YEARS = range(2003, 2026)
URL = "https://www.usbr.gov/lc/region/g4000/4200Rpts/DecreeRpt/{y}/{y}.pdf"
OUT = (
    Path(__file__).resolve().parents[2]
    / "apps" / "web" / "public" / "geo" / "lb_consumption_cy.json"
)
UA = "Mozilla/5.0 basin/0.1"

# Plausible ranges (acre-feet) — guards against grabbing a wrong number.
RANGES = {
    "az": (1_500_000, 3_400_000),
    "ca": (3_400_000, 5_600_000),
    "nv": (120_000, 360_000),
    "lbTotal": (5_500_000, 8_600_000),
    "mexico": (1_200_000, 1_900_000),
}


def fetch_text(y: int) -> str:
    req = urllib.request.Request(URL.format(y=y), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        blob = r.read()
    with tempfile.NamedTemporaryFile(suffix=".pdf") as f:
        f.write(blob)
        f.flush()
        out = subprocess.run(
            ["pdftotext", "-layout", f.name, "-"],
            capture_output=True, text=True, check=True,
        )
    return out.stdout


def last_number(line: str) -> int | None:
    nums = re.findall(r"[\d,]{4,}", line)
    if not nums:
        return None
    return int(nums[-1].replace(",", ""))


def parse(text: str) -> dict[str, int] | None:
    lines = text.splitlines()
    vals: dict[str, int] = {}

    # Lower Division total — modern then legacy phrasing.
    for i, ln in enumerate(lines):
        if re.search(r"Total Lower Division States Consumptive Use", ln):
            v = last_number(ln)
            if v:
                vals["lbTotal"] = v
                break
        if re.search(
            r"TOTAL CONSUMPTIVE USE[,\s-]+LOWER (?:DIVISION|BASIN) STATES"
            r"|TOTAL LOWER DIVISION STATES CONSUMPTIVE USE\b",
            ln,
        ):
            v = last_number(ln)
            if v:
                vals["lbTotal"] = v
                break

    # Modern summary table: state totals as single-value lines right after
    # the "Lower Division States Consumptive Use" header.
    for i, ln in enumerate(lines):
        if re.match(r"\s*Lower Division States Consumptive Use", ln):
            for follow in lines[i + 1 : i + 8]:
                m = re.match(r"\s*(Arizona|California|Nevada)\b(?!.*[A-Za-z]{3,}.*[A-Za-z])", follow)
                if m:
                    v = last_number(follow)
                    if v:
                        vals[{"Arizona": "az", "California": "ca", "Nevada": "nv"}[m.group(1)]] = v
            break

    # Middle-era fallback (≈2004-2012): a summary block headed
    # "LOWER DIVISION STATES CONSUMPTIVE USE SUMMARY" with one line per
    # state (monthly values, annual total last).
    for i, ln in enumerate(lines):
        if (
            "LOWER DIVISION STATES CONSUMPTIVE USE SUMMARY" in ln
            or "LOWER BASIN STATES WATER USE SUMMARY" in ln
        ):
            for follow in lines[i + 1 : i + 12]:
                m = re.match(r"\s*(ARIZONA|CALIFORNIA|NEVADA)\b", follow)
                if m:
                    v = last_number(follow)
                    key = {"ARIZONA": "az", "CALIFORNIA": "ca", "NEVADA": "nv"}[m.group(1)]
                    if v and key not in vals:
                        vals[key] = v
            break

    # Legacy fallback: "{STATE} TOTALS" block -> CONSUMPTIVE USE row.
    for state, key in (("ARIZONA", "az"), ("CALIFORNIA", "ca"), ("NEVADA", "nv")):
        if key in vals:
            continue
        for i, ln in enumerate(lines):
            if re.match(rf"\s*{state} TOTALS\s*$", ln):
                for follow in lines[i + 1 : i + 10]:
                    if "CONSUMPTIVE USE" in follow:
                        v = last_number(follow)
                        if v:
                            vals[key] = v
                        break
                if key in vals:
                    break

    # Mexico treaty deliveries — modern then legacy phrasing.
    for ln in lines:
        if re.search(r"Total Deliveries to Mexico in Satisfaction of Treaty", ln):
            v = last_number(ln)
            if v:
                vals["mexico"] = v
                break
    if "mexico" not in vals:
        for ln in lines:
            if re.search(r"TO MEXICO IN SATISFACTION OF TREATY", ln, re.I):
                v = last_number(ln)
                if v:
                    vals["mexico"] = v
                    break

    # Validate.
    required = {"az", "ca", "nv", "lbTotal"}
    if not required.issubset(vals):
        return None
    for k, v in vals.items():
        lo, hi = RANGES[k]
        if not (lo <= v <= hi):
            print(f"    RANGE FAIL {k}={v:,}")
            return None
    if abs(vals["az"] + vals["ca"] + vals["nv"] - vals["lbTotal"]) > 0.01 * vals["lbTotal"]:
        print(f"    SUM FAIL {vals['az']+vals['ca']+vals['nv']:,} vs {vals['lbTotal']:,}")
        return None
    return vals


def main() -> None:
    years: dict[str, dict[str, int]] = {}
    failed: list[int] = []
    for y in YEARS:
        try:
            text = fetch_text(y)
        except Exception as e:  # noqa: BLE001
            print(f"  {y}: fetch failed ({e})")
            failed.append(y)
            continue
        vals = parse(text)
        if vals is None:
            print(f"  {y}: PARSE/VALIDATION FAILED — excluded")
            failed.append(y)
            continue
        years[str(y)] = vals
        mex = f" mex={vals.get('mexico', 0)/1e6:.2f}" if "mexico" in vals else " mex=—"
        print(f"  {y}: az={vals['az']/1e6:.2f} ca={vals['ca']/1e6:.2f} "
              f"nv={vals['nv']/1e6:.2f} lb={vals['lbTotal']/1e6:.2f}{mex}")

    assert len(years) >= 20, f"too few years parsed ({len(years)}) — refusing to bake"
    payload = {
        "source": (
            "US Bureau of Reclamation, Colorado River Accounting and Water "
            "Use Reports (Article V decree accounting), one report per "
            "calendar year — state consumptive-use totals and treaty "
            "deliveries to Mexico"
        ),
        "urlPattern": URL,
        "accountingConcept": "consumptive_use (AZ/CA/NV, LB total) · delivery (Mexico)",
        "measurementClass": "estimated",
        "fetched": dt.date.today().isoformat(),
        "excludedYears": failed,
        "years": years,
    }
    OUT.write_text(json.dumps(payload))
    print(f"wrote {OUT.name}: {len(years)} years, excluded {failed or 'none'}")


if __name__ == "__main__":
    main()
