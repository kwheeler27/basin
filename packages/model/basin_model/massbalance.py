"""Annual mass-balance simulator: Powell <-> Mead coupled through the
verified operating rules. Reduced-form and explicit about it.

Structure per water year:
  1. Determine Powell release and Mead shortage reductions from PRIOR
     year-end elevations (a stated proxy for the August 24-Month Study
     projection the law actually uses).
  2. Powell:  S' = S + inflow - release - evap(S)
  3. Mead:    S' = S + release + GAINS - outflow - evap(S)
     outflow = (LB nominal 7.5 + Mexico 1.5) - rule reductions - extra_cut

Calibrated constants (each a named, documented assumption):
  GAINS   intervening Grand Canyon tributary gains, Powell->Mead
  LOSSES  regulation/system losses charged below Hoover
  EVAP_F  evaporation as a linear fraction of storage per year
"""

from __future__ import annotations

from dataclasses import dataclass

from .curves import Curve
from .rulebook import RULEBOOK_2007_IG_DCP
from .rules import determine_mead_reductions, determine_powell_release

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


def simulate(
    start_powell_af: float,
    start_mead_af: float,
    inflows_af: list[float],
    curves: dict[str, Curve],
    extra_lb_cut_af: float = 0.0,
    start_wy: int = 2027,
) -> list[YearResult]:
    rb = RULEBOOK_2007_IG_DCP
    sp, sm = start_powell_af, start_mead_af
    # Rule cuts already embedded in BASE_OUTFLOW (today's reality): only the
    # INCREMENT relative to the starting tier applies as Mead moves.
    cuts_at_start = determine_mead_reductions(
        rb, curves["mead"](start_mead_af)
    ).total_including_savings_af
    out: list[YearResult] = []
    for i, inflow in enumerate(inflows_af):
        pe, me = curves["powell"](sp), curves["mead"](sm)

        det = determine_powell_release(rb, pe, me)
        release = det.release_or_midpoint
        red = determine_mead_reductions(rb, me)

        # Powell year
        evap_p = EVAP_FRACTION_POWELL * sp
        sp = sp + inflow - release - evap_p
        if sp < POWELL_MIN_AF:  # physically can't release what isn't there
            release = max(0.0, release + sp - POWELL_MIN_AF)
            sp = max(sp, POWELL_MIN_AF) if release > 0 else sp
            sp = max(sp, 1_800_000.0)

        # Mead year: base outflow, adjusted by the rules' incremental cuts
        # as elevation moves, and by the user's what-if cut.
        incremental_cuts = red.total_including_savings_af - cuts_at_start
        demand = BASE_OUTFLOW_AF - incremental_cuts - extra_lb_cut_af
        demand = max(demand, 3_500_000.0)  # deliveries never go to zero
        evap_m = EVAP_FRACTION_MEAD * sm
        sm = sm + release + GAINS_AF - demand - evap_m
        sm = max(sm, DEAD_POOL_MEAD_AF)

        out.append(YearResult(
            wy=start_wy + i,
            powell_af=sp,
            mead_af=sm,
            powell_elev=curves["powell"](sp),
            mead_elev=curves["mead"](sm),
            release_af=release,
            lb_delivered_af=demand,
            tier=red.tier_label,
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
