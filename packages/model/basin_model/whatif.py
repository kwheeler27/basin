"""Bake the what-if response surface.

Grid: extra Lower Basin cut 0..3.0 MAF (0.25 steps). Hydrology: every rolling
5-year sequence of observed WY inflows 2001-2025 (21 traces — preserves the
autocorrelation a bootstrap would destroy). Output per (cut, year): P10/50/90
storage and elevation for both reservoirs, plus first median crossings of the
decision elevations. Also ships the recent observed elevation tail so the UI
can draw history and projection from one artifact.

Run: python -m basin_model.whatif
"""

from __future__ import annotations

import json
from pathlib import Path

from .curves import load_curves, load_inputs
from .massbalance import BASE_OUTFLOW_AF, GAINS_AF, MAF, quantiles, simulate

OUT = Path(__file__).resolve().parents[3] / "apps" / "web" / "public" / "geo" / "whatif_surface.json"

HORIZON = 5
CUTS = [round(0.25 * i, 2) for i in range(13)]  # 0 .. 3.0 MAF

MEAD_MARKS = [(1075, "Tier 1"), (1050, "Tier 2"), (1025, "Tier 3"), (950, "power pool")]
POWELL_MARKS = [(3525, "balancing tier"), (3490, "power pool")]


def main() -> None:
    inputs = load_inputs()
    curves = load_curves()

    wys = sorted(int(y) for y in inputs["inflowWY"] if 2001 <= int(y) <= 2025)
    inflows = [inputs["inflowWY"][str(y)] for y in wys]
    traces = [inflows[i : i + HORIZON] for i in range(len(inflows) - HORIZON + 1)]

    sp0 = next(v for v in reversed(inputs["powellStorage"]) if v)
    sm0 = next(v for v in reversed(inputs["meadStorage"]) if v)
    start_wy = 2027

    surface = []
    for cut in CUTS:
        runs = [
            simulate(sp0, sm0, tr, curves, extra_lb_cut_af=cut * MAF, start_wy=start_wy)
            for tr in traces
        ]
        years = []
        for yi in range(HORIZON):
            pe = [r[yi].powell_elev for r in runs]
            me = [r[yi].mead_elev for r in runs]
            ps = [r[yi].powell_af for r in runs]
            ms = [r[yi].mead_af for r in runs]
            years.append({
                "wy": start_wy + yi,
                "powellElev": [round(v, 1) for v in quantiles(pe)],
                "meadElev": [round(v, 1) for v in quantiles(me)],
                "powellAf": [round(v) for v in quantiles(ps)],
                "meadAf": [round(v) for v in quantiles(ms)],
            })
        crossings = []
        for marks, key, rid in ((MEAD_MARKS, "meadElev", "mead"), (POWELL_MARKS, "powellElev", "powell")):
            for elev, label in marks:
                hit = next((y["wy"] for y in years if y[key][1] < elev), None)
                if hit is not None:
                    crossings.append({"res": rid, "elev": elev, "label": label, "wy": hit})
        surface.append({"cutMaf": cut, "years": years, "crossings": crossings})

    months = inputs["months"]
    tail_from = months.index("2019-10")
    payload = {
        "source": (
            "Basin reduced-form annual mass balance over the verified 2007 IG/DCP "
            "rules engine; hydrology = all rolling 5-year sequences of observed "
            "WY2001-2025 unregulated inflow (Reclamation RISE). MODELED."
        ),
        "modelVersion": "whatif-0.1",
        "rulebook": "v2007-ig-dcp",
        "baked": inputs["fetched"],
        "assumptions": [
            f"Mead base outflow {BASE_OUTFLOW_AF/MAF:.2f} MAF/yr — calibrated to the observed 2023-25 conservation era; assumes current-era use continues",
            f"Powell-to-Mead tributary gains {GAINS_AF/MAF:.1f} MAF/yr (constant)",
            "Evaporation as linear fractions of storage (Powell 2%, Mead 5% per year)",
            "Tier determinations use prior year-end elevations (proxy for the August 24-Month Study)",
            "Rules held at 2007 IG + DCP; the post-2026 rulebook is not yet final",
            "Storage-elevation curves fit to 26 years of paired RISE observations",
            "Reproduces observed WY2024 within 0.2 MAF (Powell) and 0.1 MAF (Mead); release decision matches exactly",
        ],
        "startWy": start_wy,
        "traceCount": len(traces),
        "histMonths": months[tail_from:],
        "histPowellElev": inputs["powellElev"][tail_from:],
        "histMeadElev": inputs["meadElev"][tail_from:],
        "surface": surface,
    }
    OUT.write_text(json.dumps(payload))
    kb = OUT.stat().st_size / 1024
    zero = surface[0]["crossings"]
    full = surface[-1]["crossings"]
    print(f"baked {len(CUTS)} cuts x {len(traces)} traces x {HORIZON} yrs -> {kb:.0f} KB")
    print("crossings @ cut 0:", zero)
    print("crossings @ cut 3.0:", full)


if __name__ == "__main__":
    main()
