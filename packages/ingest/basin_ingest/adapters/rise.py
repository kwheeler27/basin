"""Reclamation RISE adapter.

Verified live 2026-08-01 (STEP-0 gate G3). Notes that cost real debugging time:

  * RISE REQUIRES `Accept: application/vnd.api+json` (or application/ld+json).
    Plain `application/json` returns HTTP 406.
  * Everything is provisional. `updateDate` is the revision signal, and
    revisions are frequent: on 2026-08-01 the entire prior week of daily
    values carried fresh updateDate stamps. Always refetch a trailing window.
  * Powell (record 2362) and Mead (record 4370) are ASYMMETRIC. Powell has
    ~15 series including evaporation and unregulated inflow; Mead has 4
    (elevation, storage, release in cfs and af) — no inflow, no evaporation.
  * No published rate limit, so we throttle politely by default.
"""

from __future__ import annotations

import time
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

RISE_BASE = "https://data.usbr.gov/rise/api"
ACCEPT = "application/vnd.api+json"  # NOT application/json — 406
USER_AGENT = "basin/0.1 (+https://github.com/kwheeler27/basin)"
PAGE_SIZE = 250
POLITE_DELAY_S = 0.34  # ~3 req/s; no documented limit, so be a good citizen

# Refetch window for revision detection. RISE revises recent history without
# announcement; 14 days comfortably covers observed behavior.
DEFAULT_LOOKBACK_DAYS = 14


def _get(url: str, timeout: float = 60.0) -> dict[str, Any]:
    req = urllib.request.Request(
        url, headers={"Accept": ACCEPT, "User-Agent": USER_AGENT}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (fixed host)
        import json as _json

        return _json.loads(resp.read().decode("utf-8"))


def fetch_item(
    item_id: int,
    measure_id: str,
    geography_id: str,
    *,
    after: date | None = None,
    before: date | None = None,
    source_unit: str | None = None,
    canonical_unit: str = "acre_foot",
    measurement_class: str = "observed",
    max_pages: int = 40,
) -> FetchResult:
    """Fetch one RISE catalog item and normalize to Observations.

    `after` defaults to a trailing DEFAULT_LOOKBACK_DAYS window so routine runs
    pick up upstream revisions rather than only new days.
    """
    if after is None:
        after = date.today() - timedelta(days=DEFAULT_LOOKBACK_DAYS)

    params = [f"itemId={item_id}", f"itemsPerPage={PAGE_SIZE}"]
    params.append(f"dateTime%5Bafter%5D={after.isoformat()}")
    if before is not None:
        params.append(f"dateTime%5Bbefore%5D={before.isoformat()}")

    fetched_at = datetime.now(timezone.utc)
    pages: list[dict[str, Any]] = []
    page = 1
    while page <= max_pages:
        url = f"{RISE_BASE}/result?{'&'.join(params)}&page={page}"
        payload = _get(url)
        pages.append(payload)
        rows = payload.get("data") or []
        if len(rows) < PAGE_SIZE:
            break
        page += 1
        time.sleep(POLITE_DELAY_S)

    result = FetchResult(
        raw_payload=json_payload(pages),
        source_url=f"{RISE_BASE}/result?itemId={item_id}",
        fetched_at=fetched_at,
    )
    if page > max_pages:
        result.notes.append(
            f"hit max_pages={max_pages} for item {item_id}; range may be truncated"
        )
    result.observations = parse_pages(
        pages,
        measure_id=measure_id,
        geography_id=geography_id,
        snapshot_uri="",  # set by the loader after the snapshot is written
        source_unit=source_unit,
        canonical_unit=canonical_unit,
        measurement_class=measurement_class,
    )
    return result


def parse_pages(
    pages: list[dict[str, Any]],
    *,
    measure_id: str,
    geography_id: str,
    snapshot_uri: str,
    source_unit: str | None = None,
    canonical_unit: str = "acre_foot",
    measurement_class: str = "observed",
) -> list[Observation]:
    """Pure parse — no I/O, so it can be unit-tested against real fixtures."""
    out: list[Observation] = []
    for payload in pages:
        for row in payload.get("data") or []:
            attrs = row.get("attributes") or {}
            dt_raw = attrs.get("dateTime")
            if not dt_raw:
                continue
            valid_time = _parse_dt(dt_raw)

            raw_value = attrs.get("result")
            value = None if raw_value is None else float(raw_value)
            if value is not None and source_unit and source_unit != canonical_unit:
                value = convert(value, source_unit, canonical_unit)

            # source_version is what makes revision detection work: RISE stamps
            # updateDate when it revises a value, so a revised value produces a
            # new natural key rather than silently overwriting.
            source_version = str(
                attrs.get("updateDate") or attrs.get("createDate") or attrs.get("lastUpdate") or ""
            )

            out.append(
                Observation(
                    measure_id=measure_id,
                    valid_time=valid_time,
                    geography_id=geography_id,
                    value_canonical=value,
                    measurement_class=measurement_class,
                    quality_flag=QUALITY_PROVISIONAL if value is not None else QUALITY_MISSING,
                    source_version=source_version,
                    snapshot_uri=snapshot_uri,
                    publication_time=(
                        _parse_dt(attrs["createDate"]) if attrs.get("createDate") else None
                    ),
                )
            )
    return out


def _parse_dt(raw: str) -> datetime:
    """RISE emits ISO-8601 with offset (e.g. 2026-07-31T07:00:00+00:00)."""
    dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt
