"""Unit conversion.

Every value is STORED in its measure's canonical unit. Conversion happens at
two boundaries only:

  ingest      source unit -> canonical unit   (e.g. SNOTEL inches -> mm)
  presentation canonical  -> display unit     (e.g. acre-feet -> household-years)

Conversions are dimension-checked against the measure's quantity_kind: a
Volume can never be converted to a Length, and no conversion crosses
accounting concepts (that guard lives in the contracts layer).
"""

from __future__ import annotations

from dataclasses import dataclass

# --- exact / authoritative constants -------------------------------------
# 1 acre-foot = 43,560 ft^3 exactly (1 acre = 43,560 ft^2, times 1 ft)
# 1 ft^3      = 28.316846592 L exactly (int'l foot = 0.3048 m exactly)
CUBIC_FEET_PER_ACRE_FOOT = 43_560.0
LITERS_PER_CUBIC_FOOT = 28.316846592
GALLONS_PER_CUBIC_FOOT = 7.480519480519481  # 231 in^3 per US gal

LITERS_PER_ACRE_FOOT = CUBIC_FEET_PER_ACRE_FOOT * LITERS_PER_CUBIC_FOOT  # 1_233_481.837…
GALLONS_PER_ACRE_FOOT = CUBIC_FEET_PER_ACRE_FOOT * GALLONS_PER_CUBIC_FOOT  # 325_851.4…
CUBIC_METERS_PER_ACRE_FOOT = LITERS_PER_ACRE_FOOT / 1000.0

MM_PER_INCH = 25.4
ACRES_PER_SQUARE_MILE = 640.0

# Recurring human anchor. Kevin's household: 110,000–140,000 gal/yr,
# midpoint ~125,000 gal/yr. Approximate by construction — always labeled so.
HOUSEHOLD_GALLONS_PER_YEAR = 125_000.0
HOUSEHOLD_ACRE_FEET_PER_YEAR = HOUSEHOLD_GALLONS_PER_YEAR / GALLONS_PER_ACRE_FOOT  # ~0.3836


QUANTITY_KIND_OF_UNIT: dict[str, str] = {
    "acre_foot": "Volume",
    "acre_foot_per_month": "Volume",
    "gallon": "Volume",
    "liter": "Volume",
    "cubic_meter": "Volume",
    "cubic_foot": "Volume",
    "foot": "Length",
    "millimeter": "Length",
    "inch": "Length",
    "meter": "Length",
    "cubic_foot_per_second": "VolumeFlowRate",
    "acre": "Area",
    "square_mile": "Area",
    "square_kilometer": "Area",
    "percent": "Dimensionless",
    "unitless": "Dimensionless",
    "degree_celsius": "Temperature",
    "degree_fahrenheit": "Temperature",
}

# Multiplicative factors to each quantity kind's base unit.
_TO_BASE: dict[str, float] = {
    # Volume, base = acre_foot
    "acre_foot": 1.0,
    "acre_foot_per_month": 1.0,
    "gallon": 1.0 / GALLONS_PER_ACRE_FOOT,
    "liter": 1.0 / LITERS_PER_ACRE_FOOT,
    "cubic_meter": 1.0 / CUBIC_METERS_PER_ACRE_FOOT,
    "cubic_foot": 1.0 / CUBIC_FEET_PER_ACRE_FOOT,
    # Length, base = foot
    "foot": 1.0,
    "inch": 1.0 / 12.0,
    "millimeter": 1.0 / (12.0 * MM_PER_INCH),
    "meter": 1.0 / 0.3048,
    # VolumeFlowRate, base = cfs
    "cubic_foot_per_second": 1.0,
    # Area, base = acre
    "acre": 1.0,
    "square_mile": ACRES_PER_SQUARE_MILE,
    "square_kilometer": ACRES_PER_SQUARE_MILE / 2.589988110336,
    # Dimensionless, base = percent
    "percent": 1.0,
    "unitless": 1.0,
}


class UnitError(ValueError):
    """Raised on an unknown unit or a cross-dimension conversion attempt."""


def convert(value: float | None, frm: str, to: str) -> float | None:
    """Convert between units of the same quantity kind. None passes through.

    Missing stays missing — a null is never silently coerced to zero.
    """
    if value is None:
        return None
    if frm == to:
        return value
    for u in (frm, to):
        if u not in QUANTITY_KIND_OF_UNIT:
            raise UnitError(f"unknown unit: {u!r}")
    kf, kt = QUANTITY_KIND_OF_UNIT[frm], QUANTITY_KIND_OF_UNIT[to]
    if kf != kt:
        raise UnitError(f"cannot convert {frm} ({kf}) to {to} ({kt}): different quantity kinds")
    if kf == "Temperature":
        return _convert_temperature(value, frm, to)
    return value * _TO_BASE[frm] / _TO_BASE[to]


def _convert_temperature(value: float, frm: str, to: str) -> float:
    """Temperature is affine, not multiplicative — handled separately."""
    celsius = (value - 32.0) * 5.0 / 9.0 if frm == "degree_fahrenheit" else value
    return celsius * 9.0 / 5.0 + 32.0 if to == "degree_fahrenheit" else celsius


# --- scale anchors --------------------------------------------------------


@dataclass(frozen=True)
class ScaleAnchor:
    """One intuitive framing of a volume. `approximate` is always True for
    human anchors — the UI must render them as approximations."""

    key: str
    label: str
    value: float
    unit: str
    approximate: bool = True


def volume_anchors(acre_feet: float) -> list[ScaleAnchor]:
    """Intuitive framings of a volume, for the <ScaleAnchor> component.

    Rule from docs/DESIGN_PRINCIPLES.md: anchors never replace the canonical
    number, and at least two of different kinds accompany a headline figure.
    """
    return [
        ScaleAnchor("gallons", "gallons", acre_feet * GALLONS_PER_ACRE_FOOT, "gallon", False),
        ScaleAnchor("liters", "liters", acre_feet * LITERS_PER_ACRE_FOOT, "liter", False),
        ScaleAnchor(
            "household_years",
            "household-years",
            acre_feet / HOUSEHOLD_ACRE_FEET_PER_YEAR,
            "household_year",
        ),
        ScaleAnchor(
            "area_depth_sq_mi_ft",
            "square miles under one foot",
            acre_feet / ACRES_PER_SQUARE_MILE,
            "square_mile",
        ),
    ]
