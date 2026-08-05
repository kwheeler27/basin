"""Mass-balance model tests. The model may not project until it can
reproduce an observed year and behave monotonically under intervention."""

import json
from pathlib import Path

import pytest

from basin_model.curves import Curve, load_curves, load_inputs
from basin_model.massbalance import MAF, quantiles, simulate

INPUTS = load_inputs()
CURVES = load_curves()


# ------------------------------------------------------------------ curves

def test_curves_are_monotone_and_plausible():
    for rid, lo_elev, hi_elev in (("powell", 3400, 3720), ("mead", 950, 1240)):
        c = CURVES[rid]
        assert all(y2 > y1 for y1, y2 in zip(c.ys, c.ys[1:]))
        assert lo_elev < c.ys[0] < c.ys[-1] < hi_elev


def test_curve_matches_known_current_pairing():
    # 2026-07-31 observed: Powell 5.39 MAF at 3522.3 ft; Mead 7.05 MAF at 1041.1 ft
    assert CURVES["powell"](5_390_000) == pytest.approx(3522.3, abs=6)
    assert CURVES["mead"](7_050_000) == pytest.approx(1041.1, abs=6)


def test_curve_hits_tier_elevations_inside_observed_range():
    lo, hi = CURVES["mead"].observed_range
    # all Mead decision elevations must be interpolation, not extrapolation
    for elev in (1075, 1050, 1025):
        # find storage whose elevation ~ elev by scanning
        s = next(s for s in range(int(lo), int(hi), 50_000) if CURVES["mead"](s) >= elev)
        assert lo <= s <= hi


# ------------------------------------------------------------ conservation

def test_zero_inflow_drains_the_system():
    res = simulate(10 * MAF, 9 * MAF, [0.0] * 5, CURVES)
    assert res[-1].powell_af < 10 * MAF * 0.6
    assert res[0].mead_af > res[-1].mead_af


def test_huge_inflow_fills_powell():
    res = simulate(10 * MAF, 9 * MAF, [20 * MAF] * 3, CURVES)
    assert res[-1].powell_af > 15 * MAF


# ------------------------------------------------- observed-year reproduction

def test_reproduces_wy2024_within_tolerance():
    """Start from observed Oct 2023 storages, feed observed WY2024 inflow,
    compare end-of-year storages against observed Sep 2024. The reduced-form
    model must land within 1.0 MAF on each reservoir."""
    months = INPUTS["months"]
    i_start = months.index("2023-09")
    i_end = months.index("2024-09")
    sp0 = INPUTS["powellStorage"][i_start]
    sm0 = INPUTS["meadStorage"][i_start]
    inflow = INPUTS["inflowWY"]["2024"]
    res = simulate(sp0, sm0, [inflow], CURVES, start_wy=2024)[0]

    sp_obs = INPUTS["powellStorage"][i_end]
    sm_obs = INPUTS["meadStorage"][i_end]
    print(f"\nWY2024 modeled: Powell {res.powell_af/MAF:.2f} Mead {res.mead_af/MAF:.2f}"
          f" | observed: Powell {sp_obs/MAF:.2f} Mead {sm_obs/MAF:.2f}"
          f" | release modeled {res.release_af/MAF:.2f} observed {INPUTS['releaseWY']['2024']/MAF:.2f}")
    assert abs(res.powell_af - sp_obs) < 0.5 * MAF
    assert abs(res.mead_af - sm_obs) < 0.5 * MAF


# ----------------------------------------------------------- intervention

def test_bigger_cut_always_helps_mead():
    months = INPUTS["months"]
    sp0 = next(v for v in reversed(INPUTS["powellStorage"]) if v)
    sm0 = next(v for v in reversed(INPUTS["meadStorage"]) if v)
    inflows = [7 * MAF] * 5
    ends = []
    for cut in (0, 1 * MAF, 2 * MAF, 3 * MAF):
        res = simulate(sp0, sm0, inflows, CURVES, extra_lb_cut_af=cut)
        ends.append(res[-1].mead_af)
    assert ends == sorted(ends)
    # 3 MAF/yr for 5 years should move Mead by many MAF
    assert ends[-1] - ends[0] > 8 * MAF


def test_rules_react_to_recovery():
    """With big inflows and a big cut, Mead should climb out of shortage."""
    res = simulate(6 * MAF, 7 * MAF, [11 * MAF] * 6, CURVES, extra_lb_cut_af=1.5 * MAF)
    tiers = [r.tier for r in res]
    assert "shortage" in tiers[0].lower()
    assert any("Normal" in t or "Tier 0" in t for t in tiers[3:])


def test_quantiles():
    assert quantiles([1, 2, 3, 4, 5]) == [1.4, 3.0, 4.6]
