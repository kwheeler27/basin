import Link from "next/link";
import {
  DEMAND_RECLAMATION,
  DEMAND_RECLAMATION_TOTAL,
  STRUCTURAL_DEFICIT,
  SUPPLY,
} from "@/lib/system";
import { acreFeet } from "@/lib/format";

/**
 * The spine: supply on one side, committed demand on the other, drawn to the
 * same scale so the gap between them is visible rather than asserted.
 *
 * Uses Reclamation accounting throughout — mixing in Richter's broader total
 * (which counts natural vegetation ET) would produce a meaningless bar.
 */
export function SystemChain({
  storedNow,
}: {
  storedNow: number | null;
}) {
  const scale = Math.max(DEMAND_RECLAMATION_TOTAL, SUPPLY.modernMean.acreFeet);
  const pct = (af: number) => (af / scale) * 100;

  return (
    <section className="chain">
      <div className="chain-row">
        <div className="chain-side">
          <div className="chain-label">
            <Link href="/report/supply">Supply →</Link>
          </div>
          <div className="chain-title">What the river produces</div>
          <div className="chain-value">
            {acreFeet(SUPPLY.modernMean.acreFeet)}
            <span className="chain-unit">per year</span>
          </div>
          <div className="chain-sub">modern average, ≈2000–2025</div>
          <div className="chain-bar">
            <div
              className="chain-fill supply"
              style={{ width: `${pct(SUPPLY.modernMean.acreFeet)}%` }}
            />
          </div>
          <div className="chain-hist">
            <span>Long-term mean {acreFeet(SUPPLY.observedMean.acreFeet)}</span>
            <span>
              Assumed at the 1922 Compact{" "}
              {acreFeet(SUPPLY.compactAssumption.acreFeet)}
            </span>
          </div>
        </div>

        <div className="chain-arrow" aria-hidden="true">
          <svg viewBox="0 0 40 24" width="40" height="24">
            <path
              d="M0,12 L30,12 M22,5 L30,12 L22,19"
              fill="none"
              stroke="var(--faint)"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        <div className="chain-side">
          <div className="chain-label">
            <Link href="/report/demand">Demand →</Link>
          </div>
          <div className="chain-title">What the system consumes</div>
          <div className="chain-value">
            {acreFeet(DEMAND_RECLAMATION_TOTAL)}
            <span className="chain-unit">per year</span>
          </div>
          <div className="chain-sub">Reclamation accounting, 2020–2024</div>
          <div className="chain-bar">
            {DEMAND_RECLAMATION.map((d, i) => (
              <div
                key={d.id}
                className={`chain-fill demand d${i}`}
                style={{ width: `${pct(d.acreFeet)}%` }}
                title={`${d.label}: ${acreFeet(d.acreFeet)}`}
              />
            ))}
          </div>
          <div className="chain-legend">
            {DEMAND_RECLAMATION.map((d, i) => (
              <span key={d.id} className="chain-key">
                <i className={`swatch d${i}`} />
                {d.label.replace(" consumptive use", "")}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="chain-gap">
        <div className="chain-gap-bar">
          <div
            className="chain-gap-fill"
            style={{ width: `${pct(STRUCTURAL_DEFICIT)}%` }}
          />
        </div>
        <div className="chain-gap-text">
          <strong>{acreFeet(STRUCTURAL_DEFICIT)} per year</strong> more is
          committed than the river now produces. That gap has been absorbed by
          draining the reservoirs
          {storedNow !== null && (
            <>
              {" "}
              — which now hold {acreFeet(storedNow)}, about{" "}
              {(storedNow / STRUCTURAL_DEFICIT).toFixed(0)} more years of it
            </>
          )}
          .
        </div>
      </div>

      <p className="chain-caveat">
        Supply and demand here are both estimates on Reclamation&rsquo;s
        accounting basis, and the Upper Basin component is itself disputed
        between two federal sources (3.8 vs 4.3 MAF). The deficit is a
        structural fact, not a precise one.
      </p>
    </section>
  );
}
