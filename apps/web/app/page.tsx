import Link from "next/link";
import type { Route } from "next";
import { DemandBreakdown } from "@/components/DemandBreakdown";
import { SupplySeries } from "@/components/SupplySeries";
import {
  COMBINED_CAPACITY_ACRE_FEET,
  MEAD,
  POWELL,
  RULEBOOK,
} from "@/lib/reservoirs";
import { fetchSeries } from "@/lib/rise";
import { acreFeet, formatDate, percent } from "@/lib/format";
import {
  DEMAND_RECLAMATION_TOTAL,
  SUPPLY,
  TOTAL_APPORTIONED,
} from "@/lib/system";
import flow from "@/public/geo/natural_flow_wy.json";

export const revalidate = 3600;
// Pin static despite the no-store RISE fetches (see lib/rise.ts) — data
// updates via page-level ISR, never per-request.
export const dynamic = "force-static";

/**
 * The landing page IS the executive summary (Kevin, 2026-08-27): the
 * thesis, four headline takeaways, the supply story as a century-long
 * time-series, the demand side as a labeled breakdown, live proof, and
 * three doors. Chapter lists, instrument indexes, and the free-roam map
 * live on their own surfaces.
 */
export default async function Landing() {
  const [powellStor, meadStor] = await Promise.all([
    fetchSeries(POWELL.riseStorageItem),
    fetchSeries(MEAD.riseStorageItem),
  ]);
  const stored =
    powellStor.latest && meadStor.latest
      ? powellStor.latest.value + meadStor.latest.value
      : null;
  const asOf = powellStor.latest?.date ?? null;
  const pct =
    stored !== null ? (stored / COMBINED_CAPACITY_ACRE_FEET) * 100 : null;

  return (
    <main>
      <div className="rulebook">
        <span>⚠</span>
        <div>
          <strong>Operating rules in force:</strong> {RULEBOOK.label} — expires{" "}
          {formatDate(RULEBOOK.expires)}.{" "}
          <span className="muted">{RULEBOOK.successorStatus}</span>
        </div>
      </div>

      <div className="landing-kicker">
        A live public picture of the Colorado River
      </div>
      <h1 className="page-title">
        The Colorado River is committed to delivering more water than it
        produces.
      </h1>

      <div className="exec-summary">
        <p className="body-text">
          On paper, the river owes{" "}
          <Link href={"/report/demand" as Route}>
            {acreFeet(TOTAL_APPORTIONED)} a year
          </Link>{" "}
          — 7.5 million acre-feet to the Upper Basin states, 7.5 to the Lower
          Basin states, 1.5 to Mexico — commitments written a century ago,
          when the river was believed to carry{" "}
          {acreFeet(SUPPLY.compactAssumption.acreFeet)}. Much of the Upper
          Basin&rsquo;s share was never developed, so the system actually
          consumes about{" "}
          <strong>{acreFeet(DEMAND_RECLAMATION_TOTAL)}</strong> a year. The river now
          produces about{" "}
          <Link href={"/report/supply" as Route}>
            {acreFeet(SUPPLY.modernMean.acreFeet)}
          </Link>
          . That smaller gap — consumption over production — has been paid
          out of savings:{" "}
          <Link href={"/report/reservoirs" as Route}>
            Lakes Powell and Mead
          </Link>{" "}
          were nearly full at the millennium and hold{" "}
          {pct !== null ? <strong>{percent(pct, 0)}</strong> : "about a quarter"}{" "}
          of their capacity today
          {stored !== null && (
            <>
              {" "}
              — {acreFeet(stored)},{" "}
              {(() => {
                const years = stored / SUPPLY.modernMean.acreFeet;
                return years > 0.85 && years < 1.15
                  ? "about one year"
                  : `about ${years.toFixed(1)} years`;
              })()}{" "}
              of what the river now produces
            </>
          )}
          . That arithmetic is why the operating rules keep changing — most
          recently on{" "}
          <Link href={"/current-state" as Route}>August 21, 2026</Link>.
        </p>
      </div>

      <h2 className="section-title">
        What the river produces — {Object.keys(flow.wy).length} years, one line
      </h2>
      <SupplySeries />
      <div className="chain-caveat" style={{ marginTop: 8 }}>
        {flow.source}. Vintage: {flow.vintage} — a computed, revisable series
        (natural flow adds back upstream use and reservoir operations). The
        full story: the <Link href={"/report/supply" as Route}>Supply chapter</Link>.
      </div>

      <h2 className="section-title">Where the commitments go</h2>
      <DemandBreakdown />
      <div className="chain-caveat" style={{ marginTop: 8 }}>
        Reclamation accounting basis, 2020&ndash;2024 averages (Post-2026
        Final EIS). Sector and crop breakdowns — a different accounting,
        never summed with this one — are in the{" "}
        <Link href={"/report/demand" as Route}>Demand chapter</Link>.
      </div>

      <Link href={"/current-state" as Route} className="state-strip">
        <div className="stat-row">
          <div className="stat">
            <div className="stat-num">
              {pct !== null ? percent(pct, 0) : "—"}
            </div>
            <div className="stat-label">
              of combined capacity left in Lakes Powell &amp; Mead
            </div>
          </div>
          <div className="stat">
            <div className="stat-num">
              {stored !== null ? acreFeet(stored) : "—"}
            </div>
            <div className="stat-label">
              in storage{asOf && <> · as of {formatDate(asOf)}</>} ·
              provisional (Reclamation RISE)
            </div>
          </div>
          <div className="stat">
            <div className="stat-num">→</div>
            <div className="stat-label">
              the full current state: inflow, drought, rules, freshness
            </div>
          </div>
        </div>
      </Link>

      <p className="body-text" style={{ marginTop: 22 }}>
        Basin shows the whole system — the live state, an eight-chapter
        report on why it is the way it is, and instruments for checking
        every number yourself.
      </p>
      <div className="cta-row">
        <Link className="cta primary" href={"/report/the-system" as Route}>
          Start the report →
        </Link>
        <Link className="cta" href={"/current-state" as Route}>
          See the current state
        </Link>
        <Link className="cta" href={"/explore" as Route}>
          Explore the data
        </Link>
      </div>

      <div className="chain-caveat" style={{ marginTop: 26 }}>
        Every takeaway links to the chapter that defends it, and every number
        on this site carries its source. Reservoir storage is live from
        Reclamation RISE, provisional. A reduced-form, independent portrait —
        not affiliated with, nor equivalent to, Reclamation&rsquo;s models.
      </div>
    </main>
  );
}
