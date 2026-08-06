"""USDA-NRCS AWDB REST adapter (SNOTEL).

Verified live 2026-08-01 (STEP-0 gate G4b). Behaviors that shape this code:

  * No authentication. Response is a bare JSON LIST, not an envelope.
  * Values arrive in INCHES (`storedUnitCode: "in"`) and are converted to
    canonical millimeters at ingest.
  * An empty result is `[]` — valid JSON, not an error. A bad station id looks
    identical to a station with no data, so station existence must be checked
    against the /stations endpoint rather than inferred from response shape.
  * AWDB exposes NO revision stamp. We refetch a trailing window and let the
    content hash serve as source_version, so a changed value produces a new
    natural key.
  * Station HUC membership comes from /stations (`huc`, `associatedHucs`) and
    changes over time — it is synced as a dimension, never hardcoded.
"""

from __future__ import annotations

import hashlib
import json
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from typing import Any

from ..observation import (
    QUALITY_MISSING,
    QUALITY_PROVISIONAL,
    FetchResult,
    Observation,
    json_payload,
)
from ..units import convert

AWDB_BASE = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1"
USER_AGENT = "basin/0.1 (+https://github.com/kwheeler27/basin)"
DEFAULT_LOOKBACK_DAYS = 14

# AWDB element codes -> the unit they are stored in.
ELEMENT_SOURCE_UNITS = {
    "WTEQ": "inch",          # snow water equivalent
    "SNWD": "inch",          # snow depth
    "PREC": "inch",          # accumulated precipitation
    "TOBS": "degree_fahrenheit",
    "TMAX": "degree_fahrenheit",
    "TMIN": "degree_fahrenheit",
}


def _get(url: str, timeout: float = 90.0) -> Any:
    req = urllib.request.Request(
        url, headers={"Accept": "application/json", "User-Agent": USER_AGENT}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (fixed host)
        return json.loads(resp.read().decode("utf-8"))


def fetch_stations(state_code: str = "*", network: str = "SNTL", active_only: bool = True) -> list[dict[str, Any]]:
    """Station dimension, including HUC membership and period of record."""
    query = urllib.parse.urlencode(
        {"stationTriplets": f"{state_code}:*:{network}" if state_code == "*" else f"*:{state_code}:{network}",
         "activeOnly": str(active_only).lower()}
    )
    return _get(f"{AWDB_BASE}/stations?{query}") or []


def stations_in_hucs(stations: list[dict[str, Any]], huc_prefixes: tuple[str, ...]) -> list[dict[str, Any]]:
    """Filter stations to those whose primary or associated HUC matches.

    Associated HUCs are included because SNOTEL sites near basin divides
    legitimately contribute to more than one watershed rollup.
    """
    out = []
    for s in stations:
        hucs = [s.get("huc") or ""] + list(s.get("associatedHucs") or [])
        if any(h.startswith(p) for h in hucs for p in huc_prefixes if h):
            out.append(s)
    return out


def fetch_data(
    station_triplets: list[str],
    element: str,
    measure_id: str,
    *,
    begin: date | None = None,
    end: date | None = None,
    canonical_unit: str = "millimeter",
    duration: str = "DAILY",
    measurement_class: str = "observed",
) -> FetchResult:
    """Fetch one element for a batch of stations."""
    if begin is None:
        begin = date.today() - timedelta(days=DEFAULT_LOOKBACK_DAYS)
    if end is None:
        end = date.today()

    query = urllib.parse.urlencode(
        {
            "stationTriplets": ",".join(station_triplets),
            "elements": element,
            "duration": duration,
            "beginDate": begin.isoformat(),
            "endDate": end.isoformat(),
        }
    )
    fetched_at = datetime.now(timezone.utc)
    payload = _get(f"{AWDB_BASE}/data?{query}")

    result = FetchResult(
        raw_payload=json_payload(payload),
        source_url=f"{AWDB_BASE}/data?{query}",
        fetched_at=fetched_at,
    )
    if not payload:
        # Empty is valid JSON here — record it as a note, never as zeros.
        result.notes.append(
            f"AWDB returned no data for {len(station_triplets)} station(s), element {element}, "
            f"{begin}..{end}. Empty [] does not distinguish 'no data' from 'bad station id'."
        )
    result.observations = parse_data(
        payload,
        measure_id=measure_id,
        snapshot_uri="",
        canonical_unit=canonical_unit,
        measurement_class=measurement_class,
    )
    return result


def parse_data(
    payload: Any,
    *,
    measure_id: str,
    snapshot_uri: str,
    canonical_unit: str = "millimeter",
    measurement_class: str = "observed",
) -> list[Observation]:
    """Pure parse of the AWDB list response — unit-testable against fixtures."""
    out: list[Observation] = []
    for station_block in payload or []:
        triplet = station_block.get("stationTriplet") or ""
        geography_id = f"nrcs.{triplet.replace(':', '_').lower()}" if triplet else "nrcs.unknown"
        for series in station_block.get("data") or []:
            element_meta = series.get("stationElement") or {}
            element = element_meta.get("elementCode") or ""
            source_unit = ELEMENT_SOURCE_UNITS.get(
                element, _unit_from_code(element_meta.get("storedUnitCode"))
            )
            for point in series.get("values") or []:
                raw_date = point.get("date")
                if not raw_date:
                    continue
                valid_time = datetime.fromisoformat(f"{raw_date}T00:00:00+00:00")

                raw_value = point.get("value")
                value = None if raw_value is None else float(raw_value)
                if value is not None and source_unit and source_unit != canonical_unit:
                    value = convert(value, source_unit, canonical_unit)

                out.append(
                    Observation(
                        measure_id=measure_id,
                        valid_time=valid_time,
                        geography_id=geography_id,
                        value_canonical=value,
                        measurement_class=measurement_class,
                        quality_flag=QUALITY_PROVISIONAL if value is not None else QUALITY_MISSING,
                        # No upstream revision stamp: hash the observed value so
                        # a later correction yields a different natural key.
                        source_version=_content_version(raw_value),
                        snapshot_uri=snapshot_uri,
                    )
                )
    return out


def _unit_from_code(code: str | None) -> str | None:
    return {"in": "inch", "degF": "degree_fahrenheit", "degC": "degree_celsius"}.get(code or "")


def _content_version(raw_value: Any) -> str:
    return "v" + hashlib.sha256(repr(raw_value).encode()).hexdigest()[:12]
