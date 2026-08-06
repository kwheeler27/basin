"""Unit conversion: round-trips, dimension guards, and the documented anchors."""

import pytest

from basin_ingest.units import (
    GALLONS_PER_ACRE_FOOT,
    HOUSEHOLD_ACRE_FEET_PER_YEAR,
    LITERS_PER_ACRE_FOOT,
    UnitError,
    convert,
    volume_anchors,
)


def test_documented_constants_match_the_plan():
    # PLAN.md / DESIGN_PRINCIPLES.md quote these; they must not drift.
    assert GALLONS_PER_ACRE_FOOT == pytest.approx(325_851.4, rel=1e-6)
    assert LITERS_PER_ACRE_FOOT == pytest.approx(1_233_481.8, rel=1e-6)
    assert HOUSEHOLD_ACRE_FEET_PER_YEAR == pytest.approx(0.3836, abs=1e-4)


def test_snotel_inches_to_millimeters():
    # The conversion applied at SNOTEL ingest.
    assert convert(1.0, "inch", "millimeter") == pytest.approx(25.4)
    assert convert(0.3, "inch", "millimeter") == pytest.approx(7.62)


@pytest.mark.parametrize(
    "unit", ["gallon", "liter", "cubic_meter", "cubic_foot"]
)
def test_volume_round_trips(unit):
    af = 3_000_000.0  # the canonical "3 MAF cut" figure
    assert convert(convert(af, "acre_foot", unit), unit, "acre_foot") == pytest.approx(af)


def test_three_maf_anchors_match_documented_values():
    af = 3_000_000.0
    assert convert(af, "acre_foot", "gallon") == pytest.approx(977.6e9, rel=1e-3)
    assert convert(af, "acre_foot", "liter") == pytest.approx(3.70e12, rel=1e-3)
    households = af / HOUSEHOLD_ACRE_FEET_PER_YEAR
    assert households == pytest.approx(7.8e6, rel=2e-2)  # ~7.8M household-years


def test_cross_dimension_conversion_is_rejected():
    # A Volume must never become a Length — the guard that stops acre-feet
    # from being rendered as reservoir elevation.
    with pytest.raises(UnitError, match="different quantity kinds"):
        convert(1.0, "acre_foot", "foot")
    with pytest.raises(UnitError, match="different quantity kinds"):
        convert(1.0, "cubic_foot_per_second", "acre_foot")


def test_unknown_unit_is_rejected():
    with pytest.raises(UnitError, match="unknown unit"):
        convert(1.0, "acre_foot", "hogsheads")


def test_none_passes_through_and_is_never_coerced_to_zero():
    assert convert(None, "inch", "millimeter") is None


def test_temperature_is_affine_not_multiplicative():
    assert convert(0.0, "degree_celsius", "degree_fahrenheit") == pytest.approx(32.0)
    assert convert(-40.0, "degree_celsius", "degree_fahrenheit") == pytest.approx(-40.0)
    assert convert(212.0, "degree_fahrenheit", "degree_celsius") == pytest.approx(100.0)


def test_square_mile_is_640_acres():
    assert convert(1.0, "square_mile", "acre") == pytest.approx(640.0)


def test_anchors_flag_human_estimates_as_approximate():
    anchors = {a.key: a for a in volume_anchors(3_000_000.0)}
    # Exact arithmetic conversions are not approximations…
    assert anchors["gallons"].approximate is False
    # …but household equivalence is, and must be labeled so.
    assert anchors["household_years"].approximate is True
