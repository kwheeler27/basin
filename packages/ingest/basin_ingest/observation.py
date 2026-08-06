"""The Observation record — what every adapter produces.

Adapters never write to the database directly and never convert units
implicitly. They emit Observations already in canonical units, carrying full
provenance, and the loader handles persistence and revision detection.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from .water_year import water_year

# Quality flags. `missing` exists so a genuinely absent value is recorded as a
# row with value_canonical=None rather than being dropped (a gap the UI must
# render as a gap) or coerced to zero.
QUALITY_PROVISIONAL = "provisional"
QUALITY_APPROVED = "approved"
QUALITY_ESTIMATED = "estimated"
QUALITY_MISSING = "missing"


@dataclass(frozen=True)
class Observation:
    measure_id: str
    valid_time: datetime
    geography_id: str
    value_canonical: float | None
    measurement_class: str
    source_version: str
    snapshot_uri: str
    quality_flag: str = QUALITY_PROVISIONAL
    publication_time: datetime | None = None
    # model provenance — None for observations
    model_version: str | None = None
    rulebook_version: str | None = None
    scenario_id: str | None = None
    trace_id: int | None = None
    input_data_version: str | None = None

    @property
    def water_year(self) -> int:
        return water_year(self.valid_time)

    @property
    def natural_key(self) -> tuple:
        """Matches observation_natural_key in db/schema.sql."""
        return (
            self.measure_id,
            self.valid_time,
            self.geography_id,
            self.measurement_class,
            self.scenario_id or "",
            self.trace_id if self.trace_id is not None else -1,
            self.source_version,
        )

    def __post_init__(self) -> None:
        if self.value_canonical is None and self.quality_flag != QUALITY_MISSING:
            raise ValueError(
                f"{self.measure_id} @ {self.valid_time}: null value must carry "
                f"quality_flag={QUALITY_MISSING!r}, got {self.quality_flag!r}. "
                "Missing is not zero and must be explicit."
            )
        if self.valid_time.tzinfo is None:
            raise ValueError(
                f"{self.measure_id}: valid_time must be timezone-aware "
                "(calendar dates for water data are never naive-local)"
            )


@dataclass
class FetchResult:
    """One adapter fetch: the observations plus the raw payload that produced
    them. The payload is snapshotted to R2 BEFORE parsing, so every row can be
    traced back to bytes we actually received."""

    observations: list[Observation] = field(default_factory=list)
    raw_payload: bytes = b""
    source_url: str = ""
    fetched_at: datetime | None = None
    notes: list[str] = field(default_factory=list)

    @property
    def payload_digest(self) -> str:
        return hashlib.sha256(self.raw_payload).hexdigest()

    def snapshot_key(self, adapter: str) -> str:
        """Content-addressed snapshot path. Re-fetching identical bytes
        produces the same key, so unchanged payloads don't duplicate storage."""
        assert self.fetched_at is not None, "fetched_at must be set before snapshotting"
        day = self.fetched_at.strftime("%Y/%m/%d")
        return f"raw/{adapter}/{day}/{self.payload_digest[:16]}.json"


def json_payload(obj: Any) -> bytes:
    """Canonical JSON bytes for snapshotting — sorted keys so the digest is
    stable across runs for identical content."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")
