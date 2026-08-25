"""Annual mass-balance simulator: Powell <-> Mead coupled through the
verified operating rules. Reduced-form and explicit about it.

Structure per water year:
  1. Pick the rulebook in force for that water year (v2007-ig-dcp through
     WY2026; v2027-og from WY2027, with continuation beyond OY2028 as a
     stated assumption).
  2. Determine Powell release and Mead reductions from PRIOR year-end
     elevations (a stated proxy for the 24-Month Study projections the law
     actually uses — January 1 Mead under the 2007 IG; October 1 Powell
     under the 2027–2028 Operating Guidelines).
  3. Powell:  S' = S + inflow - release - evap(S)
  4. Mead:    S' = S + release + GAINS - outflow - evap(S)
     outflow = calibrated base - incremental rule cuts - extra_cut

Calibrated constants (each a named, documented assumption):
  GAINS   intervening Grand Canyon tributary gains, Powell->Mead
  EVAP_F  evaporation as a linear fraction of storage per year
"""

from __future__ import annotations

from dataclasses import dataclass

from .curves import Curve
from .rulebook import RULEBOOK_2007_IG_DCP, RULEBOOK_2027_OG
from .rules import (
    determine_mead_reductions,
    determine_powell_range,
    determine_powell_release,
)

MAF = 1_000_000.0

# --- named assumptions (documented in the UI's assumptions panel) ---------
GAINS_AF = 800_000.0          # Paria + Little Colorado + Virgin + side inflows
# RISE "unregulated inflow" nearly closes Powell's observed balance by itself
# (2019-25 residuals swing +-1.9 MAF with upstream-reservoir operations, mean
# ~+0.4): most of what looks like evaporation is already netted into the
# series. A small fraction remains as a conservative loss term.
EVAP_FRACTION_POWELL = 0.02
EVAP_FRACTION_MEAD = 0.050    # ~0.60 MAF/yr at 12 MAF storage
# Total Mead outflow in the CURRENT operating reality (LB net use + Mexico +
# losses, net of returns, already reflecting today's tier cuts and paid
# conservation). Calibrated to the observed 2023-25 era mean (7.44/8.02/8.43
# -> 7.96 MAF); assumes continuation of current-era use patterns.
BASE_OUTFLOW_AF = 7_960_000.0
POWELL_MIN_AF = 4_000_000.0   # release physically curtailed below this
DEAD_POOL_MEAD_AF = 2_000_000.0

#: First water year governed by the 2027–2028 Operating Guidelines. Years
#: beyond OY2028 assume the guidelines' provisions continue — a stated
#: assumption, matching Reclamation's own practice of extending the current
#: framework in simulated years (24-Month Study footnote 1).
OG_FIRST_WY = 2027


@dataclass
class YearResult:
    wy: int
    powell_af: float
    mead_af: float
    powell_elev: float
    mead_elev: float
    release_af: float
    lb_delivered_af: float
    tier: str
    rulebook: str = "v2007-ig-dcp"


def _og_powell_release(
    curves: dict[str, Curve], sp: float, pe: float, inflow: float
) -> tuple[float, str]:
    """Powell release under v2027-og §5.1, emulated at annual resolution.

    The guidelines pick the first ladder candidate whose Exhibit Run holds
    the protection target (3,510 ft) through the water year; our annual step
    tests the YEAR-END elevation instead — a stated proxy, since an annual
    model has no intra-year minimum. If no candidate holds, the release is
    reduced as needed to hold the target, floored at 6.0 MAF (§5.1.A.2/B.2,
    Table 1). Upward adjustment: if the year-end projection exceeds 3,565 ft,
    half the excess volume is added to the release (§5.1.A.4/B.4/C.1.b).
    CRSP Upper Initial Unit drought releases (discretionary support of up to
    ~1 MAF into Powell) are EXCLUDED — a conservative assumption.
    """
    og = RULEBOOK_2027_OG
    det = determine_powell_range(og, pe)
    evap_p = EVAP_FRACTION_POWELL * sp
    target_af = curves["powell"].inverse(og.powell_protection_target_ft)
    upper_af = curves["powell"].inverse(og.powell_upward_adjust_above_ft)

    release: float | None = None
    for cand in det.release_ladder_af:
        end = sp + inflow - cand - evap_p
        if end >= target_af:
            release = cand
            break
    if release is None:
        # Even the smallest ladder candidate breaches the target: reduce as
        # needed to hold it, but never below the 6.0 MAF floor.
        needed = sp + inflow - evap_p - target_af
        release = max(og.powell_release_floor_af, needed)

    # Upward adjustment when the year would end above 3,565 ft.
    end = sp + inflow - release - evap_p
    if end > upper_af:
        release += (end - upper_af) / 2.0

    return release, det.range_name


def simulate(
    start_powell_af: float,
    start_mead_af: float,
    inflows_af: list[float],
    curves: dict[str, Curve],
    extra_lb_cut_af: float = 0.0,
    start_wy: int = 2027,
) -> list[YearResult]:
    rb = RULEBOOK_2007_IG_DCP
    og = RULEBOOK_2027_OG
    sp, sm = start_powell_af, start_mead_af
    # Rule cuts already embedded in BASE_OUTFLOW (today's reality): only the
    # INCREMENT relative to the starting conditions applies as rules and
    # elevations move.
    cuts_at_start = determine_mead_reductions(
        rb, curves["mead"](start_mead_af)
    ).total_including_savings_af
    out: list[YearResult] = []
    for i, inflow in enumerate(inflows_af):
        wy = start_wy + i
        og_year = wy >= OG_FIRST_WY
        pe, me = curves["powell"](sp), curves["mead"](sm)

        if og_year:
            release, _range_name = _og_powell_release(curves, sp, pe, inflow)
            # Mead under v2027-og: a FIXED Shortage Condition — US Lower
            # Division cuts of 1.25 MAF from Normal, independent of
            # elevation (§5.3.A). Mexico's reductions are set by the IBWC;
            # we assume Minute-323-equivalent tiers continue (successor
            # Minute unknown) — a stated assumption.
            m323 = determine_mead_reductions(rb, me)
            total_cuts = og.mead_total_reduction_af + (
                m323.mexico_reduction_af + m323.mexico_savings_af
            )
            tier_label = f"{og.mead_condition.split(' (')[0]} (fixed)"
            rulebook_version = og.version
        else:
            det = determine_powell_release(rb, pe, me)
            release = det.release_or_midpoint
            red = determine_mead_reductions(rb, me)
            total_cuts = red.total_including_savings_af
            tier_label = red.tier_label
            rulebook_version = rb.version

        # Powell year
        evap_p = EVAP_FRACTION_POWELL * sp
        sp = sp + inflow - release - evap_p
        if sp < POWELL_MIN_AF:  # physically can't release what isn't there
            release = max(0.0, release + sp - POWELL_MIN_AF)
            sp = max(sp, POWELL_MIN_AF) if release > 0 else sp
            sp = max(sp, 1_800_000.0)

        # Mead year: base outflow, adjusted by the rules' incremental cuts
        # relative to the embedded starting conditions, and by the user's
        # what-if cut.
        incremental_cuts = total_cuts - cuts_at_start
        demand = BASE_OUTFLOW_AF - incremental_cuts - extra_lb_cut_af
        demand = max(demand, 3_500_000.0)  # deliveries never go to zero
        evap_m = EVAP_FRACTION_MEAD * sm
        sm = sm + release + GAINS_AF - demand - evap_m
        sm = max(sm, DEAD_POOL_MEAD_AF)

        out.append(YearResult(
            wy=wy,
            powell_af=sp,
            mead_af=sm,
            powell_elev=curves["powell"](sp),
            mead_elev=curves["mead"](sm),
            release_af=release,
            lb_delivered_af=demand,
            tier=tier_label,
            rulebook=rulebook_version,
        ))
    return out


def quantiles(values: list[float], qs=(0.1, 0.5, 0.9)) -> list[float]:
    s = sorted(values)
    n = len(s)
    out = []
    for q in qs:
        pos = q * (n - 1)
        lo = int(pos)
        hi = min(lo + 1, n - 1)
        out.append(s[lo] + (s[hi] - s[lo]) * (pos - lo))
    return out
