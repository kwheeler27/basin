/**
 * What the basin consumes — labeled component bars, largest first, on
 * Reclamation's accounting basis. Server-rendered;
 * the DISPUTED Upper Basin figure carries its marker inline.
 */

import { DEMAND_RECLAMATION, DEMAND_RECLAMATION_TOTAL } from "@/lib/system";
import { acreFeet } from "@/lib/format";

export function ConsumptionBreakdown() {
  const sorted = [...DEMAND_RECLAMATION].sort((a, b) => b.acreFeet - a.acreFeet);
  const max = sorted[0]!.acreFeet;

  return (
    <div className="demand-breakdown">
      {sorted.map((c) => (
        <div key={c.id} className="db-row">
          <div className="db-label">
            {c.label}
            {c.note?.startsWith("DISPUTED") && (
              <span className="badge badge-med" title={c.note}>
                disputed · 3.8 vs 4.3
              </span>
            )}
          </div>
          <div className="db-track">
            <div className="db-fill" style={{ width: `${(c.acreFeet / max) * 100}%` }} />
            <span className="db-num">{acreFeet(c.acreFeet)}</span>
          </div>
        </div>
      ))}
      <div className="db-total">
        Total consumption on this accounting:{" "}
        <strong>{acreFeet(DEMAND_RECLAMATION_TOTAL)}</strong> a year.
      </div>
    </div>
  );
}
