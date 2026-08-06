"""RISE parsing, tested against a REAL captured payload (no mocks).

Fixture: tests/fixtures/rise_mead_elevation_2026-07.json — Lake Mead pool
elevation (RISE item 6123) for July 2026, captured 2026-08-01.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest

from basin_ingest.adapters.rise import parse_pages
from basin_ingest.observation import QUALITY_MISSING, QUALITY_PROVISIONAL, Observation

FIXTURE = Path(__file__).parent / "fixtures" / "rise_mead_elevation_2026-07.json"


@pytest.fixture
def pages():
    return [json.loads(FIXTURE.read_text())]


@pytest.fixture
def observations(pages):
    return parse_pages(
        pages,
        measure_id="colorado.reservoir.mead.elevation",
        geography_id="usbr.lake_mead",
        snapshot_uri="raw/rise/test/fixture.json",
        canonical_unit="foot",
        source_unit="foot",
    )


def test_parses_every_row(pages, observations):
    assert len(observations) == len(pages[0]["data"]) == 31


def test_known_values_match_the_source_exactly(observations):
    by_date = {o.valid_time.date().isoformat(): o.value_canonical for o in observations}
    # Verified against RISE directly during STEP-0 gate G3.
    assert by_date["2026-07-31"] == pytest.approx(1041.10)
    assert by_date["2026-07-30"] == pytest.approx(1041.09)
    assert by_date["2026-07-29"] == pytest.approx(1041.12)


def test_all_timestamps_are_timezone_aware(observations):
    assert all(o.valid_time.tzinfo is not None for o in observations)


def test_measurement_class_and_quality_are_set(observations):
    assert all(o.measurement_class == "observed" for o in observations)
    assert all(o.quality_flag == QUALITY_PROVISIONAL for o in observations)


def test_water_year_is_2026_for_july_2026(observations):
    assert {o.water_year for o in observations} == {2026}


def test_source_version_captures_revisions(observations, pages):
    """RISE stamps updateDate on revision; new rows carry only createDate.
    source_version must fall back so every row gets a stable identifier —
    and so a later revision produces a DIFFERENT natural key."""
    assert all(o.source_version for o in observations), "no row may have an empty source_version"

    raw = {r["attributes"]["dateTime"][:10]: r["attributes"] for r in pages[0]["data"]}
    revised = [d for d, a in raw.items() if a.get("updateDate")]
    fresh = [d for d, a in raw.items() if not a.get("updateDate")]
    # The fixture captures both states: a week of revised history plus the newest day.
    assert len(revised) >= 25 and len(fresh) >= 1

    by_date = {o.valid_time.date().isoformat(): o for o in observations}
    for d in revised:
        assert by_date[d].source_version == raw[d]["updateDate"]
    for d in fresh:
        assert by_date[d].source_version == raw[d]["createDate"]


def test_natural_keys_are_unique(observations):
    keys = [o.natural_key for o in observations]
    assert len(set(keys)) == len(keys)


def test_a_revision_changes_the_natural_key(observations):
    """The property the append-only revision model depends on."""
    original = observations[0]
    revised = Observation(
        **{
            **original.__dict__,
            "value_canonical": (original.value_canonical or 0) + 0.01,
            "source_version": original.source_version + "-revised",
        }
    )
    assert revised.natural_key != original.natural_key


def test_unit_conversion_is_applied_on_parse(pages):
    """Same payload, declared as inches, must come out converted to mm."""
    as_mm = parse_pages(
        pages,
        measure_id="test.measure",
        geography_id="test.geo",
        snapshot_uri="x",
        source_unit="inch",
        canonical_unit="millimeter",
    )
    by_date = {o.valid_time.date().isoformat(): o.value_canonical for o in as_mm}
    assert by_date["2026-07-31"] == pytest.approx(1041.10 * 25.4)


def test_null_result_becomes_missing_not_zero():
    page = {
        "data": [
            {
                "attributes": {
                    "dateTime": "2026-07-15T07:00:00+00:00",
                    "result": None,
                    "createDate": "2026-07-16T07:00:00+00:00",
                    "updateDate": None,
                }
            }
        ]
    }
    obs = parse_pages(
        [page],
        measure_id="m",
        geography_id="g",
        snapshot_uri="x",
        canonical_unit="foot",
    )
    assert len(obs) == 1
    assert obs[0].value_canonical is None
    assert obs[0].quality_flag == QUALITY_MISSING


def test_null_value_without_missing_flag_is_rejected():
    """Structural guard: a null can never be recorded as a normal value."""
    with pytest.raises(ValueError, match="Missing is not zero"):
        Observation(
            measure_id="m",
            valid_time=datetime(2026, 7, 1, tzinfo=timezone.utc),
            geography_id="g",
            value_canonical=None,
            measurement_class="observed",
            source_version="v1",
            snapshot_uri="x",
            quality_flag=QUALITY_PROVISIONAL,
        )


def test_naive_datetime_is_rejected():
    with pytest.raises(ValueError, match="timezone-aware"):
        Observation(
            measure_id="m",
            valid_time=datetime(2026, 7, 1),
            geography_id="g",
            value_canonical=1.0,
            measurement_class="observed",
            source_version="v1",
            snapshot_uri="x",
        )
