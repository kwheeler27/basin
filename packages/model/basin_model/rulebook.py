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

# ---------------------------------------------------------------------------
# v2027-og — 2027–2028 Operating Guidelines (issued with the Post-2026 ROD,
# 2026-08-21). A structurally different regime from the 2007 IG: Powell is
# determined by RANGE (on a projected October 1 elevation) with a release
# ladder tested against a protection target via Exhibit Runs, and Mead is a
# FIXED Shortage Condition with fixed state apportionments — no elevation
# tiers. Encoded from the Operating Guidelines PDF (August 2026), read
# 2026-08-25; section references are to that document.
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PowellRange:
    """§5.1 operational range, keyed on the Most Probable August 24-Month
    Study projection of the OCTOBER 1 Lake Powell elevation for the coming
    Water Year — a different trigger than the 2007 IG's January 1 Mead
    projection."""

    name: str
    band: Band
    #: Candidate Water Year releases evaluated IN ORDER via Exhibit Runs
    #: (§5.1.A.1 / B.1 / C.1). The initial release is the first candidate
    #: projected to keep Powell at or above the protection target (3,510 ft)
    #: through the Water Year. That test requires model runs, so this engine
    #: reports the range and its ladder — never a single release number.
    release_ladder_af: tuple[float, ...]
    note: str = ""


@dataclass(frozen=True)
class StateApportionment:
    """§5.3.A.2 fixed apportionment for one Lower Division State, with the
    reduction it represents from the Normal Condition quantity."""

    party: Party
    apportionment_af: float
    reduction_af: float


@dataclass(frozen=True)
class SuccessorRulebook:
    """The 2027–2028 Operating Guidelines, as data.

    Deliberately a distinct shape from `Rulebook`: forcing the new regime
    into tiers-and-reductions would misstate it. UI and model code must
    treat the two structures explicitly.
    """

    version: str
    label: str
    authority: str
    effective_from: str
    effective_to: str
    status: str
    trigger: str
    powell_ranges: tuple[PowellRange, ...]
    #: §5.1: monthly Oct–Apr downward adjustments stop at this floor.
    powell_release_floor_af: float
    #: §5.1: operations initially seek to maintain this elevation…
    powell_protection_target_ft: float
    #: …to protect this critical elevation (§5.1.D consultation below it).
    powell_critical_ft: float
    #: §5.1.A.4/B.4/C.1.b: upward adjustment when projected end-of-WY
    #: elevation exceeds this (half the excess volume added to the release).
    powell_upward_adjust_above_ft: float
    #: §5.7.B.5: consult on releases above 8.23 MAF if projected above this.
    powell_consult_high_ft: float
    #: §5.1.D.1 / ROD §10.7: lowest and highest contemplated releases.
    powell_contemplated_release_range_af: tuple[float, float]
    #: §5.3.A.1: the Secretary WILL determine this condition in both years.
    mead_condition: str
    mead_total_apportionment_af: float
    mead_total_reduction_af: float
    mead_apportionments: tuple[StateApportionment, ...]
    #: §5.3.B: additional System Conservation, TOTAL across 2026–2028.
    additional_system_conservation_total_af: float
    #: §5.3.A.4: consult if any 24MS Most Probable projects Mead below this
    #: within 12 months.
    mead_consult_low_projected_ft: float
    #: §5.3.A.5: consult on increasing apportionments if likely to reach this.
    mead_consult_raise_apportionments_ft: float
    #: §5.4.B.6: no ICS delivery in a year with January 1 Mead below this.
    ics_no_delivery_below_jan1_ft: float
    #: §5.4.B.5: ICS delivery requests consulted in this January 1 band.
    ics_consult_band_ft: tuple[float, float]
    critical_elevations: dict[str, float] = field(default_factory=dict)
    notes: tuple[str, ...] = ()


_POWELL_RANGES_2027 = (
    PowellRange(
        name="Upper Elevation Range",
        band=Band(upper=None, lower=3565.0, lower_inclusive=True,
                  wording="projected October 1 elevation at or above 3,565 ft"),
        release_ladder_af=(8_230_000, 8_000_000, 7_500_000),
        note=(
            "Evaluate 8.23, then 8.0, then 7.5 MAF; the initial release is "
            "the first projected to maintain 3,510 ft through the Water Year "
            "(§5.1.A)."
        ),
    ),
    PowellRange(
        name="Mid-Elevation Range",
        band=Band(upper=3565.0, lower=3540.0, upper_inclusive=False,
                  lower_inclusive=True,
                  wording="projected October 1 elevation below 3,565 ft and at or above 3,540 ft"),
        release_ladder_af=(8_000_000, 7_500_000, 7_000_000),
        note=(
            "Evaluate 8.0, then 7.5, then 7.0 MAF; the initial release is "
            "the first projected to maintain 3,510 ft through the Water Year "
            "(§5.1.B)."
        ),
    ),
    PowellRange(
        name="Low Elevation Infrastructure Protection Range",
        band=Band(upper=3540.0, lower=None, upper_inclusive=False,
                  wording="projected October 1 elevation below 3,540 ft"),
        release_ladder_af=(7_000_000,),
        note=(
            "Assume 7.0 MAF; if that holds 3,510 ft, begin the year at 7.0. "
            "If not, defer the Water Year release determination to April and "
            "set it between 6.0 and 7.0 MAF per the §5.1.C Table 1 process, "
            "coordinated with CRSP Upper Initial Unit drought releases."
        ),
    ),
)

RULEBOOK_2027_OG = SuccessorRulebook(
    version="v2027-og",
    label="2027–2028 Operating Guidelines (Post-2026 ROD Decision Framework)",
    authority=(
        "Colorado River Guidelines for Coordinated Operations of Lake Powell "
        "and Lake Mead, Operating Years 2027 and 2028 (August 2026), issued "
        "pursuant to the Record of Decision for the Decision Framework "
        "(2027–2036) · Powell §5.1, Mead §5.3, ICS §5.4, Mexico §5.6. ROD "
        "issuance date (2026-08-21) per Reclamation's post-2026 operations "
        "page, retrieved 2026-08-25 — the guidelines PDF itself carries only "
        "'August 2026'."
    ),
    effective_from="2026-10-01",
    effective_to="2028-12-31",
    status="issued",
    trigger=(
        "Powell: Most Probable AUGUST 24-Month Study projection of the "
        "OCTOBER 1 elevation for the coming Water Year (monthly Most "
        "Probable projections govern in-year adjustments). Mead: a fixed "
        "August determination for the following Calendar Year — no "
        "elevation tiers."
    ),
    powell_ranges=_POWELL_RANGES_2027,
    powell_release_floor_af=6_000_000,
    powell_protection_target_ft=3510.0,
    powell_critical_ft=3500.0,
    powell_upward_adjust_above_ft=3565.0,
    powell_consult_high_ft=3665.0,
    powell_contemplated_release_range_af=(5_000_000, 12_000_000),
    mead_condition="Shortage Condition (both Operating Years)",
    mead_total_apportionment_af=6_250_000,
    mead_total_reduction_af=1_250_000,
    mead_apportionments=(
        StateApportionment(Party.ARIZONA, 2_040_000, 760_000),
        StateApportionment(Party.CALIFORNIA, 3_960_000, 440_000),
        StateApportionment(Party.NEVADA, 250_000, 50_000),
    ),
    additional_system_conservation_total_af=700_000,
    mead_consult_low_projected_ft=1010.0,
    mead_consult_raise_apportionments_ft=1125.0,
    ics_no_delivery_below_jan1_ft=1000.0,
    ics_consult_band_ft=(1000.0, 1025.0),
    critical_elevations={
        "powell_dead_pool": 3370.0,
        "powell_min_power_pool": 3490.0,
        "powell_full_pool": 3700.0,
        "mead_dead_pool": 895.0,
        "mead_min_power_pool": 950.0,
        "mead_full_pool": 1229.0,
    },
    notes=(
        "The state apportionment split (AZ 2.04 / CA 3.96 / NV 0.25 MAF) is "
        "'in accordance with a Lower Basin implementing agreement(s)' "
        "(§5.3.A.2); absent executed agreements the Secretary determines the "
        "apportionment of the same 6.25 MAF total under applicable law "
        "(§5.3.A.3).",
        "Reductions for Mexico are determined by the IBWC under 1944 Treaty "
        "Minutes, separate from and in addition to the §5.3 apportionment "
        "(§5.6). Minute 323 is, by its own terms, in effect through "
        "2026-12-31 (source: IBWC Minute 323, not these guidelines); no "
        "successor Minute announced as of 2026-08-25.",
        "Effectiveness is conditional (§3): the guidelines take effect upon "
        "(1) execution by the Secretary and (2) execution of the necessary "
        "implementing and parallel agreements; absent (2), the Secretary "
        "proceeds under the §§5.2–5.4 default paths. The effective_from/"
        "effective_to span here is our reading of the Operating Years "
        "covered (Powell WY2027 begins 2026-10-01; Mead CY2028 ends "
        "2028-12-31), not a verbatim document range.",
        "The guidelines confirm in a primary document that 3,490 ft is Lake "
        "Powell's minimum power pool (§5.1) and that hydropower cannot be "
        "produced below 950 ft at Lake Mead (§5.3) — both previously held "
        "at medium confidence from secondary sources.",
        "These guidelines are not a precedent for future operations (ROD "
        "§10.11) and could be superseded during the Effective Period by "
        "consensus guidelines (§3).",
    ),
)

RULEBOOKS: dict[str, Rulebook] = {RULEBOOK_2007_IG_DCP.version: RULEBOOK_2007_IG_DCP}
