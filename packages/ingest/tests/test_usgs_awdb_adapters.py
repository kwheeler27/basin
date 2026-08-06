"""USGS OGC and AWDB parsing, against REAL captured payloads."""

import json
from pathlib import Path

import pytest

from basin_ingest.adapters.awdb import parse_data, stations_in_hucs
from basin_ingest.adapters.usgs import parse_features
from basin_ingest.observation import QUALITY_APPROVED, QUALITY_MISSING, QUALITY_PROVISIONAL

FIXTURES = Path(__file__).parent / "fixtures"


# ------------------------------------------------------------------ USGS


@pytest.fixture
def usgs_pages():
    return [json.loads((FIXTURES / "usgs_lees_ferry_daily_2026-07.json").read_text())]


@pytest.fixture
def usgs_obs(usgs_pages):
    return parse_features(
        usgs_pages,
        measure_id="colorado.gauge.lees_ferry.discharge",
        geography_id="usgs.09380000",
        snapshot_uri="raw/usgs/test.json",
        canonical_unit="cubic_foot_per_second",
    )


def test_usgs_parses_july_2026_daily_values(usgs_pages, usgs_obs):
    assert len(usgs_obs) == len(usgs_pages[0]["features"]) == 31


def test_usgs_string_values_are_coerced_to_float(usgs_obs):
    """The API returns value as a STRING ("7870") — verified live."""
    by_date = {o.valid_time.date().isoformat(): o.value_canonical for o in usgs_obs}
    assert by_date["2026-07-07"] == pytest.approx(7870.0)
    assert all(isinstance(v, float) for v in by_date.values() if v is not None)


def test_usgs_bare_dates_anchor_to_utc_not_local(usgs_obs):
    """Calendar-dated water data must never be timezone-shifted."""
    o = next(o for o in usgs_obs if o.valid_time.date().isoformat() == "2026-07-07")
    assert o.valid_time.tzinfo is not None
    assert (o.valid_time.hour, o.valid_time.minute) == (0, 0)
    assert o.valid_time.utcoffset().total_seconds() == 0


def test_usgs_approval_status_maps_to_quality_flag(usgs_obs):
    # July 2026 data is recent, hence Provisional.
    assert all(o.quality_flag == QUALITY_PROVISIONAL for o in usgs_obs)


def test_usgs_approved_status_is_recognized():
    page = {
        "features": [
            {
                "properties": {
                    "time": "2015-06-01",
                    "value": "12300",
                    "approval_status": "Approved",
                    "last_modified": "2016-03-01T00:00:00+00:00",
                }
            }
        ]
    }
    obs = parse_features(
        [page], measure_id="m", geography_id="g", snapshot_uri="x"
    )
    assert obs[0].quality_flag == QUALITY_APPROVED


def test_usgs_provisional_to_approved_changes_source_version():
    """Approval is a revision: it must yield a new natural key, not an overwrite."""
    def one(status):
        return parse_features(
            [{"features": [{"properties": {
                "time": "2026-07-07", "value": "7870",
                "approval_status": status, "last_modified": "2026-07-08T09:07:08+00:00",
            }}]}],
            measure_id="m", geography_id="g", snapshot_uri="x",
        )[0]

    assert one("Provisional").natural_key != one("Approved").natural_key


def test_usgs_empty_value_becomes_missing_not_zero():
    page = {"features": [{"properties": {"time": "2026-07-07", "value": "", "approval_status": "Provisional"}}]}
    obs = parse_features([page], measure_id="m", geography_id="g", snapshot_uri="x")
    assert obs[0].value_canonical is None
    assert obs[0].quality_flag == QUALITY_MISSING


def test_usgs_water_year_spans_the_october_boundary():
    page = {
        "features": [
            {"properties": {"time": "2025-09-30", "value": "100", "approval_status": "Approved"}},
            {"properties": {"time": "2025-10-01", "value": "100", "approval_status": "Approved"}},
        ]
    }
    obs = parse_features([page], measure_id="m", geography_id="g", snapshot_uri="x")
    assert [o.water_year for o in obs] == [2025, 2026]


# ------------------------------------------------------------------ AWDB


@pytest.fixture
def awdb_payload():
    return json.loads((FIXTURES / "awdb_swe_2026-03.json").read_text())


@pytest.fixture
def awdb_obs(awdb_payload):
    return parse_data(
        awdb_payload,
        measure_id="colorado.snow.stations.swe",
        snapshot_uri="raw/awdb/test.json",
        canonical_unit="millimeter",
    )


def test_awdb_converts_inches_to_millimeters(awdb_obs):
    """Source is inches; canonical is mm. 10.0 in -> 254.0 mm."""
    by_date = {o.valid_time.date().isoformat(): o.value_canonical for o in awdb_obs}
    assert by_date["2026-03-01"] == pytest.approx(254.0)
    assert by_date["2026-03-02"] == pytest.approx(254.0)


def test_awdb_derives_geography_from_station_triplet(awdb_obs):
    assert all(o.geography_id == "nrcs.713_co_sntl" for o in awdb_obs)


def test_awdb_march_dates_are_water_year_2026(awdb_obs):
    assert {o.water_year for o in awdb_obs} == {2026}


def test_awdb_empty_response_yields_no_rows_not_zeros():
    """[] is a valid AWDB response and must never become a row of zeros."""
    assert parse_data([], measure_id="m", snapshot_uri="x") == []


def test_awdb_null_value_becomes_missing():
    payload = [
        {
            "stationTriplet": "713:CO:SNTL",
            "data": [
                {
                    "stationElement": {"elementCode": "WTEQ", "storedUnitCode": "in"},
                    "values": [{"date": "2026-03-01", "value": None}],
                }
            ],
        }
    ]
    obs = parse_data(payload, measure_id="m", snapshot_uri="x")
    assert obs[0].value_canonical is None
    assert obs[0].quality_flag == QUALITY_MISSING


def test_awdb_changed_value_changes_source_version():
    """AWDB has no revision stamp, so content hashing must detect corrections."""
    def one(v):
        return parse_data(
            [{"stationTriplet": "713:CO:SNTL", "data": [{
                "stationElement": {"elementCode": "WTEQ", "storedUnitCode": "in"},
                "values": [{"date": "2026-03-01", "value": v}]}]}],
            measure_id="m", snapshot_uri="x",
        )[0]

    assert one(10.0).natural_key != one(10.5).natural_key


def test_awdb_temperature_elements_use_affine_conversion():
    payload = [
        {
            "stationTriplet": "713:CO:SNTL",
            "data": [
                {
                    "stationElement": {"elementCode": "TOBS", "storedUnitCode": "degF"},
                    "values": [{"date": "2026-03-01", "value": 32.0}],
                }
            ],
        }
    ]
    obs = parse_data(payload, measure_id="m", snapshot_uri="x", canonical_unit="degree_celsius")
    assert obs[0].value_canonical == pytest.approx(0.0)


def test_huc_filter_includes_associated_hucs():
    """Divide-adjacent stations legitimately serve more than one basin."""
    stations = [
        {"stationTriplet": "a", "huc": "140300030103", "associatedHucs": []},
        {"stationTriplet": "b", "huc": "110200060406", "associatedHucs": ["140100010101"]},
        {"stationTriplet": "c", "huc": "110200060406", "associatedHucs": []},
    ]
    kept = {s["stationTriplet"] for s in stations_in_hucs(stations, ("14",))}
    assert kept == {"a", "b"}
