"""Water year is a dimension, and its boundaries are where off-by-one bugs live."""

from datetime import date, datetime, timezone

import pytest

from basin_ingest.water_year import (
    water_year,
    water_year_bounds,
    water_year_day,
)


@pytest.mark.parametrize(
    "d,expected",
    [
        # The boundary itself, from both sides.
        (date(2025, 9, 30), 2025),   # last day of WY2025
        (date(2025, 10, 1), 2026),   # first day of WY2026
        (date(2026, 9, 30), 2026),   # last day of WY2026
        (date(2026, 10, 1), 2027),
        # Named for the year it ENDS — the classic inversion bug.
        (date(2025, 12, 31), 2026),
        (date(2026, 1, 1), 2026),
        (date(2026, 7, 31), 2026),
    ],
)
def test_water_year_naming_and_boundaries(d, expected):
    assert water_year(d) == expected


def test_water_year_accepts_datetime_and_date_identically():
    d = date(2025, 10, 1)
    dt = datetime(2025, 10, 1, 7, 0, tzinfo=timezone.utc)
    assert water_year(d) == water_year(dt) == 2026


def test_bounds_are_inclusive_and_contiguous():
    start, end = water_year_bounds(2026)
    assert start == date(2025, 10, 1)
    assert end == date(2026, 9, 30)
    # No gap between consecutive water years.
    prev_start, prev_end = water_year_bounds(2025)
    assert (start - prev_end).days == 1


def test_water_year_day_indexes_from_october_first():
    assert water_year_day(date(2025, 10, 1)) == 1
    assert water_year_day(date(2025, 10, 2)) == 2
    assert water_year_day(date(2026, 9, 30)) == 365  # WY2026 is not a leap WY


def test_leap_day_falls_inside_water_year():
    # Feb 2024 is in WY2024 (Oct 2023 - Sep 2024), which contains a leap day.
    assert water_year(date(2024, 2, 29)) == 2024
    start, end = water_year_bounds(2024)
    assert (end - start).days + 1 == 366
