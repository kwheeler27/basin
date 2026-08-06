"""Versioned operating rules.

Rules are DATA, never hardcoded logic. Each legal instrument is encoded as its
own layer with its own band boundaries, exactly as written, and the combined
shortage table is DERIVED. Two reasons:

  1. The instruments genuinely compose — the 2019 DCP adds contributions on
     top of the 2007 IG shortages rather than replacing them.
  2. They word their band boundaries differently (open vs. closed intervals),
     and a flattened summary table silently loses that. See
     `test_rules.py::test_instruments_disagree_at_exactly_1050` — at precisely
     1,050 ft the IG and Minute 323 §IV assign different bands, which no
     published combined table captures.

Every value here was verified against primary documents on 2026-08-01
(STEP-0 gate G1). See docs/OPERATING_RULES.md for citations and confidence.

All volumes are ACRE-FEET. All elevations are FEET above mean sea level.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class Party(str, Enum):
    ARIZONA = "arizona"
    NEVADA = "nevada"
    CALIFORNIA = "california"
    MEXICO = "mexico"


class ReductionKind(str, Enum):
    """Legally distinct mechanisms. NEVER summed into one figure without
    saying which — conflating these is precisely why secondary sources
    reported irreconcilable Mexico numbers."""

    #: 2007 Interim Guidelines shortage — apportionment reduced outright.
    IG_SHORTAGE = "ig_shortage"
    #: 2019 DCP contribution — additional water left in Lake Mead.
    DCP_CONTRIBUTION = "dcp_contribution"
    #: Minute 323 §III.A — unrecoverable reduction in delivery to Mexico.
    TREATY_REDUCTION = "treaty_reduction"
    #: Minute 323 §IV — RECOVERABLE savings; Mexico may recover this water
    #: when the August 24-Month Study projects Mead ≥ 1,110 ft on Jan 1.
    TREATY_SAVINGS = "treaty_savings"


@dataclass(frozen=True)
class Band:
    """A half-open (or closed) elevation interval, encoded as the instrument
    words it. `upper`/`lower` of None mean unbounded."""

    upper: float | None
    lower: float | None
    upper_inclusive: bool = True   # "at or below <upper>"
    lower_inclusive: bool = False  # "above <lower>"
    wording: str = ""

    def contains(self, elevation: float) -> bool:
        if self.upper is not None:
            if elevation > self.upper:
                return False
            if elevation == self.upper and not self.upper_inclusive:
                return False
        if self.lower is not None:
            if elevation < self.lower:
                return False
            if elevation == self.lower and not self.lower_inclusive:
                return False
        return True


@dataclass(frozen=True)
class Reduction:
    party: Party
    kind: ReductionKind
    band: Band
    acre_feet: float


@dataclass(frozen=True)
class PowellTier:
    name: str
    band: Band
    #: Fixed annual release, or None when the tier balances contents.
    release_af: float | None
    #: Release range when balancing (min, max).
    balancing_range: tuple[float, float] | None = None
    #: Conditional override keyed on Lake Mead's elevation.
    mead_below: float | None = None
    mead_below_release_af: float | None = None
    mead_below_balancing_range: tuple[float, float] | None = None
    note: str = ""


@dataclass(frozen=True)
class Rulebook:
    version: str
    label: str
    authority: str
    effective_from: str
    effective_to: str
    status: str
    #: Elevation used for determination — always a PROJECTED January 1 value
    #: from the August 24-Month Study, never a current reading.
    trigger: str
    powell_tiers: tuple[PowellTier, ...]
    mead_reductions: tuple[Reduction, ...]
    critical_elevations: dict[str, float] = field(default_factory=dict)
    notes: tuple[str, ...] = ()


# ---------------------------------------------------------------------------
# v2007-ig-dcp — in force through water year 2026
# ---------------------------------------------------------------------------

_POWELL_TIERS_2007 = (
    PowellTier(
        name="Equalization Tier",
        band=Band(upper=None, lower=3666.0, lower_inclusive=True,
                  wording="at or above the year-specific Equalization Elevation"),
        release_af=None,
        balancing_range=(8_230_000, 12_000_000),
        note=(
            "Release >8.23 MAF to equalize storage with Lake Mead or avoid "
            "spills. The trigger is a year-specific table in the Guidelines "
            "(historical examples 3,636–3,666 ft), approximated here by its "
            "upper value — a scenario reaching this tier should consult the "
            "table for the specific year."
        ),
    ),
    PowellTier(
        name="Upper Elevation Balancing Tier",
        band=Band(upper=3666.0, lower=3575.0, upper_inclusive=False, lower_inclusive=True,
                  wording="below the Equalization Elevation and at or above 3,575 ft"),
        release_af=8_230_000,
        mead_below=1075.0,
        mead_below_balancing_range=(7_000_000, 9_000_000),
        note=(
            "Release 8.23 MAF; if Lake Mead is below 1,075 ft, balance contents "
            "within 7.0–9.0 MAF. May shift back to Equalization if the April "
            "24-Month Study projects reaching the equalization elevation."
        ),
    ),
    PowellTier(
        name="Mid-Elevation Release Tier",
        band=Band(upper=3575.0, lower=3525.0, upper_inclusive=False, lower_inclusive=True,
                  wording="below 3,575 ft and at or above 3,525 ft"),
        release_af=7_480_000,
        mead_below=1025.0,
        mead_below_release_af=8_230_000,
        note="Release 7.48 MAF; if Lake Mead is below 1,025 ft, release 8.23 MAF instead.",
    ),
    PowellTier(
        name="Lower Elevation Balancing Tier",
        band=Band(upper=3525.0, lower=None, upper_inclusive=False,
                  wording="below 3,525 ft"),
        release_af=None,
        balancing_range=(7_000_000, 9_500_000),
        note="Balance contents within 7.0–9.5 MAF.",
    ),
)


def _ig_shortages() -> list[Reduction]:
    """2007 ROD §XI.G.2.D. Note the CLOSED lower bounds ('at or above')."""
    bands = [
        (Band(1075.0, 1050.0, True, True, "at or below 1,075 and at or above 1,050"),
         {Party.ARIZONA: 320_000, Party.NEVADA: 13_000}),
        (Band(1050.0, 1025.0, False, True, "below 1,050 and at or above 1,025"),
         {Party.ARIZONA: 400_000, Party.NEVADA: 17_000}),
        (Band(1025.0, None, False, False, "below 1,025"),
         {Party.ARIZONA: 480_000, Party.NEVADA: 20_000}),
    ]
    return [
        Reduction(party, ReductionKind.IG_SHORTAGE, band, af)
        for band, shares in bands
        for party, af in shares.items()
    ]


def _dcp_contributions() -> list[Reduction]:
    """LB DCP Exhibit 1 (LBOps) §III.B. OPEN lower bounds ('above')."""
    out: list[Reduction] = []
    for party, upper_band_af, lower_band_af in (
        (Party.ARIZONA, 192_000, 240_000),
        (Party.NEVADA, 8_000, 10_000),
    ):
        out.append(Reduction(party, ReductionKind.DCP_CONTRIBUTION,
                             Band(1090.0, 1045.0, True, False,
                                  "above 1,045 and at or below 1,090"), upper_band_af))
        out.append(Reduction(party, ReductionKind.DCP_CONTRIBUTION,
                             Band(1045.0, None, True, False, "at or below 1,045"),
                             lower_band_af))
    # California contributes only below 1,045 ft.
    for upper, lower, af, wording in (
        (1045.0, 1040.0, 200_000, "above 1,040 and at or below 1,045"),
        (1040.0, 1035.0, 250_000, "above 1,035 and at or below 1,040"),
        (1035.0, 1030.0, 300_000, "above 1,030 and at or below 1,035"),
        (1030.0, None, 350_000, "at or below 1,030"),
    ):
        out.append(Reduction(Party.CALIFORNIA, ReductionKind.DCP_CONTRIBUTION,
                             Band(upper, lower, True, False, wording), af))
    return out


def _minute_323() -> list[Reduction]:
    """Minute 323 §III.A (unrecoverable) and §IV (recoverable).

    These are legally distinct and are the reason secondary sources reported
    irreconcilable Mexico figures — they were silently summing the two.
    """
    out: list[Reduction] = []
    # §III.A — delivery reductions, mirroring the IG band structure.
    for upper, lower, ui, li, af, wording in (
        (1075.0, 1050.0, True, True, 50_000, "at or below 1,075 and at or above 1,050"),
        (1050.0, 1025.0, False, True, 70_000, "below 1,050 and at or above 1,025"),
        (1025.0, None, False, False, 125_000, "below 1,025"),
    ):
        out.append(Reduction(Party.MEXICO, ReductionKind.TREATY_REDUCTION,
                             Band(upper, lower, ui, li, wording), af))
    # §IV — recoverable savings. Note OPEN lower bounds throughout.
    for upper, lower, af in (
        (1090.0, 1075.0, 41_000),
        (1075.0, 1050.0, 30_000),
        (1050.0, 1045.0, 34_000),
        (1045.0, 1040.0, 76_000),
        (1040.0, 1035.0, 84_000),
        (1035.0, 1030.0, 92_000),
        (1030.0, 1025.0, 101_000),
        (1025.0, None, 150_000),
    ):
        wording = (f"at or below {upper:,.0f} and above {lower:,.0f}"
                   if lower else f"at or below {upper:,.0f}")
        out.append(Reduction(Party.MEXICO, ReductionKind.TREATY_SAVINGS,
                             Band(upper, lower, True, False, wording), af))
    return out


RULEBOOK_2007_IG_DCP = Rulebook(
    version="v2007-ig-dcp",
    label="2007 Interim Guidelines + 2019 Lower Basin DCP + Minute 323",
    authority=(
        "2007 ROD, Colorado River Interim Guidelines for Lower Basin Shortages "
        "(§XI.G.2.D; trigger §XI.F.1) · Lower Basin DCP Agreement, Exhibit 1 "
        "'LBOps' (§III.B–C) · IBWC Minute 323 (§III.A, §IV)"
    ),
    effective_from="2008-01-01",
    # The IG text terminates 2025-12-31 "(through preparation of the 2026 AOP)",
    # so it governs operations through water year 2026.
    effective_to="2026-09-30",
    status="in_force",
    trigger=(
        "Projected January 1 Lake Mead elevation from the AUGUST 24-Month Study, "
        "most probable inflows. Not a current reading."
    ),
    powell_tiers=_POWELL_TIERS_2007,
    mead_reductions=tuple(_ig_shortages() + _dcp_contributions() + _minute_323()),
    critical_elevations={
        "powell_dead_pool": 3370.0,
        "powell_min_power_pool": 3490.0,   # medium confidence
        "powell_full_pool": 3700.0,
        "mead_dead_pool": 895.0,           # medium confidence
        "mead_min_power_pool": 950.0,      # medium confidence
        "mead_full_pool": 1229.0,
        "mexico_recovery_threshold": 1110.0,
    },
    notes=(
        "Minute 323 §IV savings are RECOVERABLE by Mexico when the August "
        "24-Month Study projects Mead ≥ 1,110 ft on January 1; §III.A "
        "reductions are not.",
        "Total annual scheduled delivery to Mexico may not exceed 1,700,000 AF.",
        "Release volumes are revisable within the water year: WY2026 Powell "
        "release was set at 7.48 MAF in Aug 2025 and reduced to 6.00 MAF on "
        "2026-04-17 under SEIS ROD §6.E.",
        "Powell minimum power pool (3,490 ft) and both Mead critical "
        "elevations are MEDIUM confidence — convergent secondary sources, not "
        "confirmed in a primary Reclamation document.",
    ),
)

RULEBOOKS: dict[str, Rulebook] = {RULEBOOK_2007_IG_DCP.version: RULEBOOK_2007_IG_DCP}
