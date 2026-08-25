"""Rules engine — evaluate a rulebook at given reservoir elevations.

Pure functions over explicit inputs. No I/O, no database, no globals: a
determination is reproducible from (rulebook_version, powell_elev, mead_elev)
alone, which is what makes model outputs auditable.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .rulebook import (
    Party,
    PowellRange,
    PowellTier,
    ReductionKind,
    Rulebook,
    Reduction,
    SuccessorRulebook,
)


@dataclass(frozen=True)
class PowellDetermination:
    tier: str
    release_af: float | None
    balancing_range: tuple[float, float] | None
    #: True when the Mead-coupled override changed the outcome.
    mead_override_applied: bool
    rulebook_version: str
    note: str

    @property
    def release_or_midpoint(self) -> float:
        """A single number for mass balance. Balancing tiers use the range
        midpoint — an explicit modeling assumption, not a legal figure."""
        if self.release_af is not None:
            return self.release_af
        assert self.balancing_range is not None
        lo, hi = self.balancing_range
        return (lo + hi) / 2


@dataclass(frozen=True)
class MeadDetermination:
    """Reductions at a given projected elevation, kept SEPARATE by mechanism.

    `total_af` deliberately excludes Minute 323 §IV savings from the
    "reduction" concept: those are recoverable and are not a permanent
    reduction in supply. Use `total_including_savings_af` when reproducing the
    published combined tables, which do include them.
    """

    elevation: float
    rulebook_version: str
    by_party_and_kind: dict[tuple[Party, ReductionKind], float]
    applicable_bands: tuple[str, ...] = field(default_factory=tuple)

    def by_party(self, party: Party, kinds: tuple[ReductionKind, ...] | None = None) -> float:
        return sum(
            af
            for (p, kind), af in self.by_party_and_kind.items()
            if p == party and (kinds is None or kind in kinds)
        )

    def by_kind(self, kind: ReductionKind) -> float:
        return sum(af for (_, k), af in self.by_party_and_kind.items() if k == kind)

    @property
    def us_lower_basin_af(self) -> float:
        return sum(
            self.by_party(p)
            for p in (Party.ARIZONA, Party.NEVADA, Party.CALIFORNIA)
        )

    @property
    def mexico_reduction_af(self) -> float:
        """Unrecoverable only (§III.A)."""
        return self.by_party(Party.MEXICO, (ReductionKind.TREATY_REDUCTION,))

    @property
    def mexico_savings_af(self) -> float:
        """Recoverable only (§IV)."""
        return self.by_party(Party.MEXICO, (ReductionKind.TREATY_SAVINGS,))

    @property
    def total_including_savings_af(self) -> float:
        return sum(self.by_party_and_kind.values())

    @property
    def tier_label(self) -> str:
        e = self.elevation
        if e > 1090:
            return "Normal / surplus condition"
        if e > 1075:
            return "Tier 0 (DCP contributions)"
        if e >= 1050:
            return "Tier 1 shortage"
        if e >= 1025:
            return "Tier 2 shortage"
        return "Tier 3 shortage"


def determine_powell_release(
    rulebook: Rulebook, powell_elevation: float, mead_elevation: float
) -> PowellDetermination:
    """Apply Powell release tiers, including the Mead-coupled overrides."""
    tier = _first_matching_tier(rulebook.powell_tiers, powell_elevation)
    if tier is None:
        raise ValueError(
            f"no Powell tier matches elevation {powell_elevation} in "
            f"rulebook {rulebook.version}"
        )

    release = tier.release_af
    balancing = tier.balancing_range
    override = False

    if tier.mead_below is not None and mead_elevation < tier.mead_below:
        override = True
        if tier.mead_below_release_af is not None:
            release, balancing = tier.mead_below_release_af, None
        elif tier.mead_below_balancing_range is not None:
            release, balancing = None, tier.mead_below_balancing_range

    return PowellDetermination(
        tier=tier.name,
        release_af=release,
        balancing_range=balancing,
        mead_override_applied=override,
        rulebook_version=rulebook.version,
        note=tier.note,
    )


def determine_mead_reductions(
    rulebook: Rulebook, mead_elevation: float
) -> MeadDetermination:
    """Evaluate every reduction layer independently and combine.

    Each instrument's bands are evaluated as that instrument words them, so
    open/closed boundary differences are preserved rather than flattened.
    """
    totals: dict[tuple[Party, ReductionKind], float] = {}
    bands: list[str] = []
    for r in rulebook.mead_reductions:
        if r.band.contains(mead_elevation):
            key = (r.party, r.kind)
            totals[key] = totals.get(key, 0.0) + r.acre_feet
            bands.append(f"{r.party.value}/{r.kind.value}: {r.band.wording}")

    return MeadDetermination(
        elevation=mead_elevation,
        rulebook_version=rulebook.version,
        by_party_and_kind=totals,
        applicable_bands=tuple(bands),
    )


def _first_matching_tier(
    tiers: tuple[PowellTier, ...], elevation: float
) -> PowellTier | None:
    for tier in tiers:
        if tier.band.contains(elevation):
            return tier
    return None


@dataclass(frozen=True)
class PowellRangeDetermination:
    """OY2027–28 Powell determination: the RANGE and its release ladder.

    Deliberately not a single release number — under the 2027–2028 Operating
    Guidelines the initial release is the first ladder candidate that Exhibit
    Run modeling projects to hold the protection target, and in-year
    adjustments can lower it to the floor. Reporting anything more precise
    than (range, ladder, floor, target) would claim authority the engine
    does not have.
    """

    range_name: str
    release_ladder_af: tuple[float, ...]
    release_floor_af: float
    protection_target_ft: float
    critical_ft: float
    rulebook_version: str
    note: str


def determine_powell_range(
    rulebook: SuccessorRulebook, projected_oct1_elevation: float
) -> PowellRangeDetermination:
    """§5.1: locate the operational range for a projected October 1 elevation.

    The input is the Most Probable AUGUST 24-Month Study projection of the
    October 1 elevation for the coming Water Year — never a current reading.
    """
    rng = _first_matching_range(rulebook.powell_ranges, projected_oct1_elevation)
    if rng is None:
        raise ValueError(
            f"no Powell range matches projected elevation "
            f"{projected_oct1_elevation} in rulebook {rulebook.version}"
        )
    return PowellRangeDetermination(
        range_name=rng.name,
        release_ladder_af=rng.release_ladder_af,
        release_floor_af=rulebook.powell_release_floor_af,
        protection_target_ft=rulebook.powell_protection_target_ft,
        critical_ft=rulebook.powell_critical_ft,
        rulebook_version=rulebook.version,
        note=rng.note,
    )


def _first_matching_range(
    ranges: tuple[PowellRange, ...], elevation: float
) -> PowellRange | None:
    for rng in ranges:
        if rng.band.contains(elevation):
            return rng
    return None


def overlapping_reductions(rulebook: Rulebook) -> list[tuple[Reduction, Reduction]]:
    """Diagnostic: same party AND kind matching at a shared elevation.

    Layers are meant to stack ACROSS instruments, never within one — two DCP
    bands for Arizona both applying would double-count. Used as a test.
    """
    probes = [
        1229.0, 1100.0, 1090.0, 1089.9, 1080.0, 1075.0, 1074.9, 1060.0,
        1050.0, 1049.9, 1045.0, 1044.9, 1040.0, 1035.0, 1030.0,
        1025.0, 1024.9, 1000.0, 950.0, 895.0,
    ]
    clashes: list[tuple[Reduction, Reduction]] = []
    for e in probes:
        active = [r for r in rulebook.mead_reductions if r.band.contains(e)]
        for i, a in enumerate(active):
            for b in active[i + 1:]:
                if a.party == b.party and a.kind == b.kind:
                    clashes.append((a, b))
    return clashes
