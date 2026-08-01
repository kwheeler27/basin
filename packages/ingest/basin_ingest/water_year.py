"""Water year handling.

The water year runs October 1 through September 30 and is NAMED FOR THE YEAR
IT ENDS: WY2026 = 2025-10-01 .. 2026-09-30.

This is a dimension, not an expression. Every observation carries a
materialized water_year; nothing derives it ad hoc in a query.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

WATER_YEAR_START_MONTH = 10


def water_year(when: date | datetime) -> int:
    """Water year containing `when`, named for the year it ends."""
    d = when.date() if isinstance(when, datetime) else when
    return d.year + 1 if d.month >= WATER_YEAR_START_MONTH else d.year


def water_year_bounds(wy: int) -> tuple[date, date]:
    """Inclusive (start, end) dates of water year `wy`."""
    return date(wy - 1, WATER_YEAR_START_MONTH, 1), date(wy, 9, 30)


def water_year_day(when: date | datetime) -> int:
    """1-based day index within the water year (Oct 1 == 1)."""
    d = when.date() if isinstance(when, datetime) else when
    start, _ = water_year_bounds(water_year(d))
    return (d - start).days + 1


def current_water_year(now: datetime | None = None) -> int:
    return water_year(now or datetime.now(timezone.utc))
