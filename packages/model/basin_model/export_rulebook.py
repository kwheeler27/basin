"""Export rulebooks to the TypeScript contracts package.

The rulebook is DATA, so the web app evaluates it directly rather than calling
Python. To stop the two evaluators from drifting, this also emits VECTORS —
determinations computed by the Python engine at every band boundary and either
side of it. `pnpm verify:rules` replays them through the TS evaluator and fails
the build on any mismatch.

Run: python -m basin_model.export_rulebook
"""

from __future__ import annotations

import json
from pathlib import Path

from .rulebook import (
    RULEBOOK_2007_IG_DCP,
    RULEBOOK_2027_OG,
    Party,
    Rulebook,
    SuccessorRulebook,
)
from .rules import (
    determine_mead_reductions,
    determine_powell_range,
    determine_powell_release,
)

OUT = (
    Path(__file__).resolve().parents[3]
    / "packages" / "contracts" / "src" / "rulebook.gen.ts"
)

#: Every band edge, plus a hair either side, plus operationally live values.
PROBE_ELEVATIONS = sorted({
    1229.0, 1150.0, 1100.0,
    1090.01, 1090.0, 1089.99,
    1075.01, 1075.0, 1074.99,
    1050.01, 1050.0, 1049.99,
    1045.01, 1045.0, 1044.99,
    1040.01, 1040.0, 1039.99,
    1035.01, 1035.0, 1034.99,
    1030.01, 1030.0, 1029.99,
    1025.01, 1025.0, 1024.99,
    1041.10,  # live 2026-07-31
    1000.0, 950.0, 895.0,
})

PROBE_POWELL = sorted({
    3700.0, 3666.0, 3600.0,
    3575.01, 3575.0, 3574.99,
    3525.01, 3525.0, 3524.99,
    3522.27,  # live 2026-07-31
    3490.0, 3400.0, 3370.0,
})


def _band(b) -> dict:
    return {
        "upper": b.upper,
        "lower": b.lower,
        "upperInclusive": b.upper_inclusive,
        "lowerInclusive": b.lower_inclusive,
        "wording": b.wording,
    }


def rulebook_to_dict(rb: Rulebook) -> dict:
    return {
        "version": rb.version,
        "label": rb.label,
        "authority": rb.authority,
        "effectiveFrom": rb.effective_from,
        "effectiveTo": rb.effective_to,
        "status": rb.status,
        "trigger": rb.trigger,
        "criticalElevations": rb.critical_elevations,
        "notes": list(rb.notes),
        "powellTiers": [
            {
                "name": t.name,
                "band": _band(t.band),
                "releaseAf": t.release_af,
                "balancingRange": list(t.balancing_range) if t.balancing_range else None,
                "meadBelow": t.mead_below,
                "meadBelowReleaseAf": t.mead_below_release_af,
                "meadBelowBalancingRange": (
                    list(t.mead_below_balancing_range)
                    if t.mead_below_balancing_range else None
                ),
                "note": t.note,
            }
            for t in rb.powell_tiers
        ],
        "meadReductions": [
            {
                "party": r.party.value,
                "kind": r.kind.value,
                "band": _band(r.band),
                "acreFeet": r.acre_feet,
            }
            for r in rb.mead_reductions
        ],
    }


def vectors(rb: Rulebook) -> dict:
    mead = []
    for e in PROBE_ELEVATIONS:
        d = determine_mead_reductions(rb, e)
        mead.append({
            "elevation": e,
            "tierLabel": d.tier_label,
            "arizona": d.by_party(Party.ARIZONA),
            "nevada": d.by_party(Party.NEVADA),
            "california": d.by_party(Party.CALIFORNIA),
            "mexicoReduction": d.mexico_reduction_af,
            "mexicoSavings": d.mexico_savings_af,
            "usLowerBasin": d.us_lower_basin_af,
            "totalIncludingSavings": d.total_including_savings_af,
        })

    powell = []
    for pe in PROBE_POWELL:
        for me in (1100.0, 1060.0, 1020.0):
            d = determine_powell_release(rb, pe, me)
            powell.append({
                "powellElevation": pe,
                "meadElevation": me,
                "tier": d.tier,
                "releaseAf": d.release_af,
                "balancingRange": list(d.balancing_range) if d.balancing_range else None,
                "meadOverrideApplied": d.mead_override_applied,
                "releaseOrMidpoint": d.release_or_midpoint,
            })
    return {"mead": mead, "powell": powell}


#: §5.1 band edges, a hair either side, and the operationally live value
#: (July 2026 Most Probable study's projected 2026-10-01 elevation).
PROBE_OCT1_2027 = sorted({
    3600.0,
    3565.01, 3565.0, 3564.99,
    3540.01, 3540.0, 3539.99,
    3516.16,  # July 2026 Most Probable 24MS, projected Oct 1, 2026
    3500.0, 3490.0, 3400.0,
})


def successor_to_dict(rb: SuccessorRulebook) -> dict:
    return {
        "version": rb.version,
        "label": rb.label,
        "authority": rb.authority,
        "effectiveFrom": rb.effective_from,
        "effectiveTo": rb.effective_to,
        "status": rb.status,
        "trigger": rb.trigger,
        "criticalElevations": rb.critical_elevations,
        "notes": list(rb.notes),
        "powellRanges": [
            {
                "name": r.name,
                "band": _band(r.band),
                "releaseLadderAf": list(r.release_ladder_af),
                "note": r.note,
            }
            for r in rb.powell_ranges
        ],
        "powellReleaseFloorAf": rb.powell_release_floor_af,
        "powellProtectionTargetFt": rb.powell_protection_target_ft,
        "powellCriticalFt": rb.powell_critical_ft,
        "powellUpwardAdjustAboveFt": rb.powell_upward_adjust_above_ft,
        "powellConsultHighFt": rb.powell_consult_high_ft,
        "powellContemplatedReleaseRangeAf": list(
            rb.powell_contemplated_release_range_af
        ),
        "meadCondition": rb.mead_condition,
        "meadTotalApportionmentAf": rb.mead_total_apportionment_af,
        "meadTotalReductionAf": rb.mead_total_reduction_af,
        "meadApportionments": [
            {
                "party": a.party.value,
                "apportionmentAf": a.apportionment_af,
                "reductionAf": a.reduction_af,
            }
            for a in rb.mead_apportionments
        ],
        "additionalSystemConservationTotalAf": (
            rb.additional_system_conservation_total_af
        ),
        "meadConsultLowProjectedFt": rb.mead_consult_low_projected_ft,
        "meadConsultRaiseApportionmentsFt": (
            rb.mead_consult_raise_apportionments_ft
        ),
        "icsNoDeliveryBelowJan1Ft": rb.ics_no_delivery_below_jan1_ft,
        "icsConsultBandFt": list(rb.ics_consult_band_ft),
    }


def successor_vectors(rb: SuccessorRulebook) -> list[dict]:
    out = []
    for e in PROBE_OCT1_2027:
        d = determine_powell_range(rb, e)
        out.append({
            "projectedOct1Elevation": e,
            "rangeName": d.range_name,
            "releaseLadderAf": list(d.release_ladder_af),
            "releaseFloorAf": d.release_floor_af,
            "protectionTargetFt": d.protection_target_ft,
        })
    return out


def main() -> None:
    rb = RULEBOOK_2007_IG_DCP
    payload = {
        "rulebook": rulebook_to_dict(rb),
        "vectors": vectors(rb),
        "successor": successor_to_dict(RULEBOOK_2027_OG),
        "successorVectors": successor_vectors(RULEBOOK_2027_OG),
    }
    body = json.dumps(payload, indent=2, sort_keys=False)
    ts = (
        "// GENERATED by packages/model/basin_model/export_rulebook.py — DO NOT EDIT.\n"
        "// Source of truth: packages/model/basin_model/rulebook.py\n"
        "// Regenerate: python -m basin_model.export_rulebook\n"
        "// VECTORS are determinations computed by the Python engine; the TS\n"
        "// evaluator must reproduce them exactly (see verify-rules.ts).\n\n"
        f"export const RULEBOOK_DATA = {body} as const;\n"
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(ts)
    n_mead = len(payload["vectors"]["mead"])
    n_powell = len(payload["vectors"]["powell"])
    print(f"wrote {OUT.relative_to(OUT.parents[3])} "
          f"({n_mead} mead + {n_powell} powell vectors)")


if __name__ == "__main__":
    main()
