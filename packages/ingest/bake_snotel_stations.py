"""Bake the Upper Colorado SNOTEL station roster for the snowpack tile.

Source of record: NRCS AWDB REST API. Criteria: network SNTL, active, HUC
beginning 14 (Upper Colorado region). The roster changes rarely; the tile
fetches daily SWE + median for these triplets at request time.

Run from packages/ingest:  python3 bake_snotel_stations.py
Cadence: annual-ish — re-run if NRCS adds or retires stations.
"""

from __future__ import annotations

import datetime as dt
import json
import urllib.request
from pathlib import Path

URL = (
    "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1/stations"
    "?networkCds=SNTL&hucs=14*&activeOnly=true"
)
OUT = (
    Path(__file__).resolve().parents[2]
    / "apps" / "web" / "public" / "geo" / "snotel_huc14.json"
)


def main() -> None:
    req = urllib.request.Request(URL, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        stations = json.load(r)
    # The API's network filter is advisory; enforce SNTL client-side.
    sntl = sorted(
        s["stationTriplet"]
        for s in stations
        if s.get("stationTriplet", "").endswith(":SNTL")
    )
    assert len(sntl) > 100, f"unexpectedly few SNOTEL stations: {len(sntl)}"
    payload = {
        "source": (
            "USDA NRCS Air and Water Database (AWDB) — SNOTEL stations, "
            "network SNTL, active, HUC 14* (Upper Colorado region)"
        ),
        "url": URL,
        "fetched": dt.date.today().isoformat(),
        "count": len(sntl),
        "triplets": sntl,
    }
    OUT.write_text(json.dumps(payload))
    print(f"wrote {OUT.name}: {len(sntl)} stations")


if __name__ == "__main__":
    main()
