"""USGS Water Data OGC API adapter.

Targets `api.waterdata.usgs.gov/ogcapi/v0/` ONLY. The legacy
`waterservices.usgs.gov/nwis/{iv,dv}` service began intentional degradation
around August 2026 and is targeted for decommission in Q1 2027 — it must
never be used, not even as a shortcut.

Migration notes that matter for parsing:
  * Field names all changed: site_no -> monitoring_location_id,
    parm_cd -> parameter_code, and the provisional/approved qualifier codes
    collapsed into a single `approval_status` field.
  * The response is GeoJSON-ish: one FEATURE PER OBSERVATION rather than a
    grouped time series.
  * The `daily` collection serves the full period of record; `continuous`
    only serves ~3 years, so long backfills must use `daily`.
"""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from typing import Any

from ..observation import (
    QUALITY_APPROVED,
    QUALITY_MISSING,
    QUALITY_PROVISIONAL,
    FetchResult,
    Observation,
    json_payload,
)
from ..units import convert

OGC_BASE = "https://api.waterdata.usgs.gov/ogcapi/v0"
USER_AGENT = "basin/0.1 (+https://github.com/kwheeler27/basin)"
PAGE_LIMIT = 10_000
POLITE_DELAY_S = 0.2

# USGS finalizes on a review cycle (~6 months after water-year end), so recent
# data stays provisional and can be revised. Refetch a generous window.
DEFAULT_LOOKBACK_DAYS = 30


def _get(url: str, api_key: str | None = None, timeout: float = 90.0) -> dict[str, Any]:
    headers = {"Accept": "application/json", "User-Agent": USER_AGENT}
    if api_key:
        headers["X-Api-Key"] = api_key
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (fixed host)
        return json.loads(resp.read().decode("utf-8"))


def fetch_daily(
    monitoring_location_id: str,
    parameter_code: str,
    measure_id: str,
    geography_id: str,
    *,
    after: date | None = None,
    before: date | None = None,
    source_unit: str | None = None,
    canonical_unit: str = "cubic_foot_per_second",
    measurement_class: str = "observed",
    api_key: str | None = None,
    statistic_id: str = "00003",
    max_pages: int = 50,
) -> FetchResult:
    """Fetch daily values for one site/parameter from the `daily` collection.

    `statistic_id` defaults to 00003 (daily MEAN), pinned explicitly so a
    future site serving multiple statistics (min/max/median) cannot silently
    mix them into one series — that would violate the measure's declared
    temporal_semantics of interval_mean.
    """
    if after is None:
        after = date.today() - timedelta(days=DEFAULT_LOOKBACK_DAYS)
    if before is None:
        before = date.today()

    fetched_at = datetime.now(timezone.utc)
    pages: list[dict[str, Any]] = []
    offset = 0
    for _ in range(max_pages):
        query = urllib.parse.urlencode(
            {
                "monitoring_location_id": monitoring_location_id,
                "parameter_code": parameter_code,
                "statistic_id": statistic_id,
                "datetime": f"{after.isoformat()}/{before.isoformat()}",
                "limit": PAGE_LIMIT,
                "offset": offset,
            }
        )
        payload = _get(f"{OGC_BASE}/collections/daily/items?{query}", api_key)
        pages.append(payload)
        features = payload.get("features") or []
        if len(features) < PAGE_LIMIT:
            break
        offset += PAGE_LIMIT
        time.sleep(POLITE_DELAY_S)

    result = FetchResult(
        raw_payload=json_payload(pages),
        source_url=f"{OGC_BASE}/collections/daily/items?monitoring_location_id={monitoring_location_id}&parameter_code={parameter_code}",
        fetched_at=fetched_at,
    )
    result.observations = parse_features(
        pages,
        measure_id=measure_id,
        geography_id=geography_id,
        snapshot_uri="",
        source_unit=source_unit,
        canonical_unit=canonical_unit,
        measurement_class=measurement_class,
    )
    return result


def parse_features(
    pages: list[dict[str, Any]],
    *,
    measure_id: str,
    geography_id: str,
    snapshot_uri: str,
    source_unit: str | None = None,
    canonical_unit: str = "cubic_foot_per_second",
    measurement_class: str = "observed",
) -> list[Observation]:
    """Pure parse of OGC feature collections — unit-testable against fixtures."""
    out: list[Observation] = []
    for payload in pages:
        for feature in payload.get("features") or []:
            props = feature.get("properties") or feature
            raw_time = props.get("time") or props.get("datetime") or props.get("date")
            if not raw_time:
                continue
            valid_time = _parse_dt(raw_time)

            # Values arrive as STRINGS ("7870"), not numbers — verified live.
            raw_value = props.get("value")
            value = None
            if raw_value is not None and raw_value != "":
                try:
                    value = float(raw_value)
                except (TypeError, ValueError):
                    value = None
            if value is not None and source_unit and source_unit != canonical_unit:
                value = convert(value, source_unit, canonical_unit)

            approval = (props.get("approval_status") or "").strip().lower()
            if value is None:
                quality = QUALITY_MISSING
            elif approval.startswith("approv"):
                quality = QUALITY_APPROVED
            else:
                quality = QUALITY_PROVISIONAL

            # No upstream revision stamp exists, so approval status doubles as
            # the version: a provisional value later approved (or corrected)
            # yields a new natural key rather than overwriting silently.
            source_version = f"{approval or 'provisional'}:{props.get('last_modified') or ''}"

            out.append(
                Observation(
                    measure_id=measure_id,
                    valid_time=valid_time,
                    geography_id=geography_id,
                    value_canonical=value,
                    measurement_class=measurement_class,
                    quality_flag=quality,
                    source_version=source_version,
                    snapshot_uri=snapshot_uri,
                )
            )
    return out


def _parse_dt(raw: str) -> datetime:
    """Daily values arrive as bare dates; instantaneous carry offsets.

    A bare date is anchored to UTC midnight rather than local time — water
    data is calendar-dated and must never be timezone-shifted through a
    naive-local round trip.
    """
    text = raw.strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(text) if "T" in text else datetime.fromisoformat(f"{text}T00:00:00+00:00")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt
