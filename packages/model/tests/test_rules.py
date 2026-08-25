"""Rules engine tests.

The load-bearing test is `test_derived_table_matches_published_combined_table`:
the engine composes four legal instruments independently, and the result must
reproduce the combined table verified against primary documents on 2026-08-01
(STEP-0 gate G1, docs/OPERATING_RULES.md §2).

Tier errors self-amplify — a wrong volume changes Mead's elevation, which
selects the next tier — so boundaries are tested exhaustively from both sides.
"""

import pytest

from basin_model.rulebook import (
    Party,
    ReductionKind,
    RULEBOOK_2007_IG_DCP as RB,
)
from basin_model.rules import (
    determine_mead_reductions,
    determine_powell_release,
    overlapping_reductions,
)

KAF = 1_000


# --------------------------------------------------------- published oracle
# docs/OPERATING_RULES.md §2, verified against primary documents.
# (elevation, AZ, NV, CA, US LB total, Mexico III.A, Mexico IV, grand total)
PUBLISHED = [
    (1080.0, 192, 8, 0, 200, 0, 41, 241),
    (1060.0, 512, 21, 0, 533, 50, 30, 613),
    (1047.0, 592, 25, 0, 617, 70, 34, 721),
    (1042.0, 640, 27, 200, 867, 70, 76, 1013),
    (1037.0, 640, 27, 250, 917, 70, 84, 1071),
    (1032.0, 640, 27, 300, 967, 70, 92, 1129),
    (1027.0, 640, 27, 350, 1017, 70, 101, 1188),
    (1020.0, 720, 30, 350, 1100, 125, 150, 1375),
]


@pytest.mark.parametrize(
    "elev,az,nv,ca,us_total,mx_iiia,mx_iv,grand", PUBLISHED
)
def test_derived_table_matches_published_combined_table(
    elev, az, nv, ca, us_total, mx_iiia, mx_iv, grand
):
    d = determine_mead_reductions(RB, elev)
    assert d.by_party(Party.ARIZONA) == az * KAF
    assert d.by_party(Party.NEVADA) == nv * KAF
    assert d.by_party(Party.CALIFORNIA) == ca * KAF
    assert d.us_lower_basin_af == us_total * KAF
    assert d.mexico_reduction_af == mx_iiia * KAF
    assert d.mexico_savings_af == mx_iv * KAF
    assert d.total_including_savings_af == grand * KAF


def test_ig_and_dcp_layers_sum_to_the_party_totals():
    """The composition property: totals are IG + DCP, not a magic constant."""
    d = determine_mead_reductions(RB, 1060.0)
    ig = d.by_party(Party.ARIZONA, (ReductionKind.IG_SHORTAGE,))
    dcp = d.by_party(Party.ARIZONA, (ReductionKind.DCP_CONTRIBUTION,))
    assert (ig, dcp) == (320 * KAF, 192 * KAF)
    assert ig + dcp == d.by_party(Party.ARIZONA)


def test_mexico_mechanisms_stay_separate():
    """Conflating §III.A with §IV is the exact error that made secondary
    sources irreconcilable. 80 kaf at Tier 1 is 50 + 30, not one number."""
    d = determine_mead_reductions(RB, 1060.0)
    assert d.mexico_reduction_af == 50 * KAF   # unrecoverable
    assert d.mexico_savings_af == 30 * KAF     # recoverable
    assert d.by_party(Party.MEXICO) == 80 * KAF
    assert d.mexico_reduction_af != d.by_party(Party.MEXICO)


def test_minute_323_cross_check_against_its_own_restatement():
    """Minute 323 restates the US IG reductions as 333/417/500 kaf. Those must
    equal AZ+NV under the IG layer alone — an independent arithmetic check
    that our IG encoding is right."""
    for elev, expected in ((1060.0, 333), (1030.0, 417), (1020.0, 500)):
        d = determine_mead_reductions(RB, elev)
        ig_only = (ReductionKind.IG_SHORTAGE,)
        total = d.by_party(Party.ARIZONA, ig_only) + d.by_party(Party.NEVADA, ig_only)
        assert total == expected * KAF, f"at {elev} ft"


# ------------------------------------------------------------- boundaries


@pytest.mark.parametrize(
    "elev,az_expected",
    [
        (1090.01, 0),      # above the DCP band entirely
        (1090.0, 192),     # "at or below 1,090" — inclusive
        (1075.01, 192),    # IG not yet triggered
        (1075.0, 512),     # "at or below 1,075" — IG begins
        (1050.0, 512),     # IG band 1 is "at or above 1,050" — closed
        (1049.99, 592),    # IG band 2
        (1045.01, 592),    # DCP still in upper band
        (1045.0, 640),     # "at or below 1,045" — DCP steps up
        (1025.0, 640),     # IG band 2 is "at or above 1,025" — closed
        (1024.99, 720),    # IG band 3
    ],
)
def test_arizona_boundaries_from_both_sides(elev, az_expected):
    assert determine_mead_reductions(RB, elev).by_party(Party.ARIZONA) == az_expected * KAF


@pytest.mark.parametrize(
    "elev,ca_expected",
    [
        (1045.01, 0), (1045.0, 200), (1040.01, 200), (1040.0, 250),
        (1035.0, 300), (1030.0, 350), (1000.0, 350),
    ],
)
def test_california_contributes_only_below_1045(elev, ca_expected):
    assert determine_mead_reductions(RB, elev).by_party(Party.CALIFORNIA) == ca_expected * KAF


def test_instruments_disagree_at_exactly_1050():
    """A real consequence of encoding each instrument faithfully.

    The 2007 IG band is "at or below 1,075 and AT OR ABOVE 1,050" (closed),
    while Minute 323 §IV's corresponding band is "at or below 1,075 and ABOVE
    1,050" (open). At exactly 1,050.0 ft they select different bands, so
    Mexico's §IV savings are 34 kaf, not the 30 kaf a flattened combined table
    would imply. No published summary table captures this.
    """
    d = determine_mead_reductions(RB, 1050.0)
    assert d.by_party(Party.ARIZONA) == 512 * KAF          # IG band 1 (closed lower)
    assert d.mexico_reduction_af == 50 * KAF               # §III.A band 1 (closed lower)
    assert d.mexico_savings_af == 34 * KAF                 # §IV band 3 (open lower)
    # And one foot higher, the flattened table's value does hold.
    assert determine_mead_reductions(RB, 1051.0).mexico_savings_af == 30 * KAF


def test_no_reduction_above_all_bands():
    d = determine_mead_reductions(RB, 1150.0)
    assert d.by_party_and_kind == {}
    assert d.us_lower_basin_af == 0
    assert d.tier_label == "Normal / surplus condition"


def test_no_layer_double_counts_within_an_instrument():
    """Layers stack across instruments, never within one."""
    assert overlapping_reductions(RB) == []


# ------------------------------------------------------------ Powell tiers


@pytest.mark.parametrize(
    "powell,expected_tier",
    [
        (3600.0, "Upper Elevation Balancing Tier"),
        (3575.0, "Upper Elevation Balancing Tier"),   # "at or above 3,575"
        (3574.99, "Mid-Elevation Release Tier"),
        (3525.0, "Mid-Elevation Release Tier"),       # "at or above 3,525"
        (3524.99, "Lower Elevation Balancing Tier"),
        (3400.0, "Lower Elevation Balancing Tier"),
    ],
)
def test_powell_tier_boundaries(powell, expected_tier):
    assert determine_powell_release(RB, powell, mead_elevation=1100.0).tier == expected_tier


def test_mid_elevation_release_is_748_maf():
    d = determine_powell_release(RB, 3550.0, mead_elevation=1100.0)
    assert d.release_af == 7_480_000
    assert d.mead_override_applied is False


def test_mid_elevation_override_when_mead_below_1025():
    """The coupling that makes the two reservoirs one system."""
    d = determine_powell_release(RB, 3550.0, mead_elevation=1020.0)
    assert d.release_af == 8_230_000
    assert d.mead_override_applied is True


def test_upper_elevation_balances_when_mead_below_1075():
    d = determine_powell_release(RB, 3600.0, mead_elevation=1060.0)
    assert d.release_af is None
    assert d.balancing_range == (7_000_000, 9_000_000)
    assert d.mead_override_applied is True


def test_upper_elevation_releases_823_when_mead_healthy():
    d = determine_powell_release(RB, 3600.0, mead_elevation=1100.0)
    assert d.release_af == 8_230_000
    assert d.mead_override_applied is False


def test_todays_actual_conditions_land_in_lower_elevation_balancing():
    """Live values from 2026-07-31 (verified via RISE, STEP-0 gate G3)."""
    d = determine_powell_release(RB, 3522.27, mead_elevation=1041.10)
    assert d.tier == "Lower Elevation Balancing Tier"
    assert d.balancing_range == (7_000_000, 9_500_000)
    assert d.release_or_midpoint == 8_250_000


def test_current_mead_elevation_is_tier_2():
    d = determine_mead_reductions(RB, 1041.10)
    assert d.tier_label == "Tier 2 shortage"
    assert d.by_party(Party.ARIZONA) == 640 * KAF
    assert d.by_party(Party.CALIFORNIA) == 200 * KAF


def test_balancing_midpoint_is_an_explicit_assumption():
    d = determine_powell_release(RB, 3400.0, mead_elevation=1100.0)
    assert d.release_af is None                      # no single legal number
    assert d.release_or_midpoint == 8_250_000        # our modeling choice


def test_rulebook_metadata_is_present_for_provenance():
    assert RB.version == "v2007-ig-dcp"
    assert RB.effective_to == "2026-09-30"
    assert "24-month study" in RB.trigger.lower()
    assert any("RECOVERABLE" in n or "recoverable" in n for n in RB.notes)


# ---------------------------------------------------------------------------
# v2027-og — 2027–2028 Operating Guidelines
# ---------------------------------------------------------------------------

from basin_model.rulebook import RULEBOOK_2027_OG
from basin_model.rules import determine_powell_range

OG = RULEBOOK_2027_OG


def test_og_powell_range_boundaries_match_section_5_1():
    # "at or above 3,565" → Upper; "below 3,565 and at or above 3,540" → Mid;
    # "below 3,540" → Low Elevation Infrastructure Protection.
    assert determine_powell_range(OG, 3565.0).range_name == "Upper Elevation Range"
    assert determine_powell_range(OG, 3564.99).range_name == "Mid-Elevation Range"
    assert determine_powell_range(OG, 3540.0).range_name == "Mid-Elevation Range"
    assert (determine_powell_range(OG, 3539.99).range_name
            == "Low Elevation Infrastructure Protection Range")


def test_og_release_ladders_are_as_written():
    assert determine_powell_range(OG, 3600.0).release_ladder_af == (
        8_230_000, 8_000_000, 7_500_000)
    assert determine_powell_range(OG, 3550.0).release_ladder_af == (
        8_000_000, 7_500_000, 7_000_000)
    assert determine_powell_range(OG, 3516.16).release_ladder_af == (7_000_000,)


def test_og_live_projection_lands_in_infrastructure_protection_range():
    # July 2026 Most Probable 24MS projects Oct 1, 2026 at 3,516.16 ft.
    d = determine_powell_range(OG, 3516.16)
    assert d.range_name == "Low Elevation Infrastructure Protection Range"
    assert d.release_floor_af == 6_000_000
    assert d.protection_target_ft == 3510.0
    assert d.critical_ft == 3500.0


def test_og_mead_apportionments_sum_exactly():
    # §5.3.A.2: 2.04 + 3.96 + 0.25 = 6.25 MAF; reductions 0.76 + 0.44 + 0.05
    # = 1.25 MAF. Both totals are stated in §5.3.A.1–2 and must reconcile.
    total_app = sum(a.apportionment_af for a in OG.mead_apportionments)
    total_red = sum(a.reduction_af for a in OG.mead_apportionments)
    assert total_app == OG.mead_total_apportionment_af == 6_250_000
    assert total_red == OG.mead_total_reduction_af == 1_250_000
    # Each state's apportionment + reduction reproduces its Normal quantity.
    normal = {a.party.value: a.apportionment_af + a.reduction_af
              for a in OG.mead_apportionments}
    assert normal == {"arizona": 2_800_000, "california": 4_400_000,
                      "nevada": 300_000}


def test_og_metadata_and_succession():
    assert OG.version == "v2027-og"
    assert OG.effective_from == "2026-10-01"
    assert OG.effective_to == "2028-12-31"
    assert "OCTOBER 1" in OG.trigger
    assert OG.powell_contemplated_release_range_af == (5_000_000, 12_000_000)
    assert OG.powell_upward_adjust_above_ft == 3565.0
    assert OG.powell_consult_high_ft == 3665.0
    assert OG.ics_no_delivery_below_jan1_ft == 1000.0
    assert OG.ics_consult_band_ft == (1000.0, 1025.0)
    # Provenance discipline: the Aug-21 issuance date must carry its source
    # (the agency page), and conditional effectiveness must be noted.
    assert "post-2026 operations page" in OG.authority
    assert any("Effectiveness is conditional" in n for n in OG.notes)
