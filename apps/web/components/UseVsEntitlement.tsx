/**
 * Use vs. entitlement — the disambiguation the landing owes the reader.
 * Entitlements are legal ceilings on consumption (administrative);
 * use is what actually happened (estimated). DESIGN_PRINCIPLES §2 requires
 * exactly this explicit framing before the two may share a picture: the
 * ceiling draws as an outlined reference, never as a data bar.
 */

import {
  APPORTIONMENTS,
  DEMAND_RECLAMATION,
  UPPER_BASIN_SHARES,
} from "@/lib/system";
import { acreFeet } from "@/lib/format";

const MEXICO_TREATY_AF = 1_500_000; // 1944 Treaty delivery obligation

interface Row {
  label: string;
  entitlementAf: number | null;
  useAf: number;
  useNote: string;
  disputed?: boolean;
}

export function UseVsEntitlement() {
  const use = (id: string) =>
    DEMAND_RECLAMATION.find((d) => d.id === id)!.acreFeet;
  const lbEntitlement = APPORTIONMENTS.reduce((s, a) => s + a.acreFeet, 0);

  const rows: Row[] = [
    {
      label: "Lower Basin states",
      entitlementAf: lbEntitlement,
      useAf: use("demand.lower_basin"),
      useNote:
        "draws from Lake Mead — storage lets use track the ceiling even in dry years; shortage rules and paid conservation currently hold it below",
    },
    {
      label: "Upper Basin states",
      entitlementAf: UPPER_BASIN_SHARES.totalAcreFeet,
      useAf: use("demand.upper_basin"),
      useNote:
        "draws from the river itself — the full share was never developed, and the unused portion simply flows downstream",
      disputed: true,
    },
    {
      label: "Mexico",
      entitlementAf: MEXICO_TREATY_AF,
      useAf: use("demand.mexico"),
      useNote:
        "the one true delivery obligation, set by the 1944 Treaty; reduced under shortage minutes",
    },
    {
      label: "Reservoir evaporation & system losses",
      entitlementAf: null,
      useAf: use("demand.evaporation"),
      useNote:
        "no one's entitlement — physics takes it before anyone's accounting does",
    },
  ];

  const max = Math.max(...rows.map((r) => r.entitlementAf ?? r.useAf));

  return (
    <div className="demand-breakdown">
      {rows.map((r) => (
        <div key={r.label} className="db-row">
          <div className="db-label">
            {r.label}
            {r.disputed && (
              <span
                className="badge badge-med"
                title="Reclamation's own documents give 3.8 and 4.3 MAF; both are federal figures answering different questions"
              >
                use disputed · 3.8 vs 4.3
              </span>
            )}
          </div>
          <div className="uve-line">
            {r.entitlementAf !== null ? (
              <>
                <div
                  className="db-track uve-ceiling"
                  style={{ width: `${(r.entitlementAf / max) * 70}%` }}
                  title={`Entitlement (legal ceiling): ${acreFeet(r.entitlementAf)}`}
                >
                  <div
                    className="db-fill"
                    style={{ width: `${(r.useAf / r.entitlementAf) * 100}%` }}
                  />
                </div>
                <span className="uve-num">
                  used {acreFeet(r.useAf)} of {acreFeet(r.entitlementAf)}
                </span>
              </>
            ) : (
              <>
                <div
                  className="db-track"
                  style={{ width: `${(r.useAf / max) * 70}%` }}
                >
                  <div className="db-fill" style={{ width: "100%" }} />
                </div>
                <span className="uve-num">{acreFeet(r.useAf)}</span>
              </>
            )}
          </div>
          <div className="uve-note">{r.useNote}</div>
        </div>
      ))}
      <div className="db-total">
        Outlined box: the legal ceiling{" "}
        <span className="chip chip-administrative">administrative</span> ·
        filled bar: estimated actual consumptive use, 2020&ndash;24 average.
        Compared deliberately — use vs. entitlement — never summed.
      </div>
    </div>
  );
}
