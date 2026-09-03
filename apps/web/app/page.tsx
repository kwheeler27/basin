import Link from "next/link";
import type { Route } from "next";
import { ConsumptionLine } from "@/components/ConsumptionLine";
import { ConsumptionMiniMap } from "@/components/ConsumptionMiniMap";
import { RankedBars, type RankedBarItem } from "@/components/RankedBars";
import { Term } from "@/components/Term";
import { BasinStory } from "@/components/BasinStory";
import { Cite } from "@/components/Cite";
import { StorageHistoryLine } from "@/components/StorageHistoryLine";
import { SupplySeries } from "@/components/SupplySeries";
import { UseVsEntitlement } from "@/components/UseVsEntitlement";
import {
  COMBINED_CAPACITY_ACRE_FEET,
  MEAD,
  POWELL,
  RULEBOOK,
} from "@/lib/reservoirs";
import { MAP_RESERVOIRS } from "@/lib/mapdata";
import { fetchSeries } from "@/lib/rise";
import {
  acreFeet,
  formatDate,
  HOUSEHOLD_ACRE_FEET_PER_YEAR,
  HOUSEHOLD_GALLONS_PER_YEAR,
  percent,
} from "@/lib/format";
import hist from "@/public/geo/storage_history.json";
import lbHist from "@/public/geo/lb_consumption_cy.json";
import {
  DEMAND_RECLAMATION,
  DEMAND_RECLAMATION_TOTAL,
  RICHTER,
  STRUCTURAL_DEFICIT,
  SUPPLY,
  TOTAL_APPORTIONED,
} from "@/lib/system";

export const revalidate = 3600;
// Pin static despite the no-store RISE fetches (see lib/rise.ts) — data
// updates via page-level ISR, never per-request.
export const dynamic = "force-static";

/**
 * The landing IS the executive summary, told in Kevin's five-beat order
 * (2026-08-30): consumption → production → how the gap is covered → what
 * that did to the reserves → what it's doing to the law. The old rulebook
 * banner is absorbed into beat 5 in plain language.
 */
// Section 1's by-type rows — Richter et al. 2024, a BROADER accounting
// than Reclamation's (includes natural riparian vegetation); the two are
// shown with an explicit warning and never summed.
const SECTOR_SHORT: Record<string, string> = {
  "sector.agriculture": "Agriculture",
  "sector.natural_vegetation": "Natural vegetation",
  "sector.municipal": "Cities & industry",
  "sector.reservoir_evaporation": "Reservoir evaporation",
};
const SECTOR_ITEMS: RankedBarItem[] = RICHTER.sectors.map((s) => ({
  short: SECTOR_SHORT[s.id] ?? s.label,
  name: s.label,
  af: (s.percent / 100) * RICHTER.totalAcreFeet,
  flag: s.id === "sector.natural_vegetation" ? "not a human use" : undefined,
  sheet: {
    kicker: "Use by type",
    title: s.label,
    fact: `About ${acreFeet((s.percent / 100) * RICHTER.totalAcreFeet)} a year — ${s.percent}% of all basin consumption on this broader accounting.`,
    detail: `${s.note ?? ""} A single-study period average (2000–2019); no year-by-year series exists for this breakdown.`,
    chips: ["acre_foot", "consumptive_use"],
    source: `${RICHTER.source} · ${RICHTER.period}`,
    clock: "annual",
    clockLabel: "2000–19 STUDY AVERAGE",
  },
}));

// Section 1's Pareto rows, derived from the sourced DEMAND_RECLAMATION
// components — no landing-local numbers.
const CONSUMPTION_SHORT: Record<string, string> = {
  "demand.lower_basin": "Lower Basin",
  "demand.upper_basin": "Upper Basin",
  "demand.mexico": "Mexico",
  "demand.evaporation": "Evaporation",
};
const SERIES_STATUS =
  "Year-by-year history lives in annual PDF accounting reports; a machine-readable series is queued.";
// Decree-accounting history (2003–2025, parsed from the annual reports;
// unparsed years are honest gaps) — feeds the LB and Mexico card series.
const LB_YEARS_MAP = (lbHist as {
  years: Record<string, { lbTotal: number; mexico?: number }>;
}).years;
const LB_FIRST = Math.min(...Object.keys(LB_YEARS_MAP).map(Number));
const LB_LAST = Math.max(...Object.keys(LB_YEARS_MAP).map(Number));
function lbSeries(key: "lbTotal" | "mexico") {
  const points: (readonly [string, number | null])[] = [];
  for (let y = LB_FIRST; y <= LB_LAST; y++) {
    const v = LB_YEARS_MAP[String(y)]?.[key];
    points.push([String(y), v ?? null] as const);
  }
  return {
    points,
    unit: "acre-feet/yr",
    startLabel: String(LB_FIRST),
    endLabel: String(LB_LAST),
  };
}
const CONSUMPTION_MECHANISM: Record<string, string> = {
  "demand.lower_basin":
    "Supplied on demand from Lake Mead, so use can track entitlement even in dry years; shortage rules and paid conservation currently hold it below the 7.5 MAF ceiling.",
  "demand.upper_basin":
    "Drawn from the river itself — the full 7.5 MAF share was never developed.",
};
const CONSUMPTION_COMPARE: Record<string, string> = {
  "demand.lower_basin": "87% of the Lower Basin's 7.5 MAF ceiling",
  "demand.upper_basin": "51% of the Upper Basin's 7.5 MAF apportionment",
  "demand.mexico": "97% of the 1.5 MAF treaty delivery",
};
const CONSUMPTION_ITEMS: RankedBarItem[] = DEMAND_RECLAMATION.map((d) => ({
  short: CONSUMPTION_SHORT[d.id] ?? d.label,
  name: d.label,
  af: d.acreFeet,
  flag: d.note?.startsWith("DISPUTED")
    ? "disputed · 3.8 vs 4.3 MAF"
    : undefined,
  sheet: {
    kicker: "Consumption component",
    title: d.label,
    fact: `About ${acreFeet(d.acreFeet)} a year — ${Math.round((d.acreFeet / DEMAND_RECLAMATION_TOTAL) * 100)}% of the accounted total.`,
    detail: [
      CONSUMPTION_MECHANISM[d.id],
      d.note,
      d.id === "demand.lower_basin" || d.id === "demand.mexico"
        ? "The chart shows the full decree-accounting record since 2003."
        : SERIES_STATUS,
    ]
      .filter(Boolean)
      .join(" "),
    series:
      d.id === "demand.lower_basin"
        ? lbSeries("lbTotal")
        : d.id === "demand.mexico"
          ? lbSeries("mexico")
          : undefined,
    chips: ["acre_foot", "consumptive_use"],
    compare: CONSUMPTION_COMPARE[d.id] ? [CONSUMPTION_COMPARE[d.id]!] : undefined,
    source: `${d.source} · ${d.period}`,
    clock: "annual",
    clockLabel: "2020–24 AVERAGE",
  },
}));

export default async function Landing() {
  // Live storage for every reservoir with a RISE item (the mini-map's
  // circles); Powell + Mead drive the headline numbers.
  const withItems = MAP_RESERVOIRS.filter((r) => r.riseStorageItem);
  const series = await Promise.all(
    withItems.map((r) => fetchSeries(r.riseStorageItem!, 45)),
  );
  const liveStorage: Record<string, { af: number; asOf: string } | undefined> =
    {};
  withItems.forEach((r, i) => {
    const latest = series[i]!.latest;
    if (latest) liveStorage[r.id] = { af: latest.value, asOf: latest.date };
  });
  const powellStor = series[withItems.findIndex((r) => r.id === "powell")]!;
  const meadStor = series[withItems.findIndex((r) => r.id === "mead")]!;
  const stored =
    powellStor.latest && meadStor.latest
      ? powellStor.latest.value + meadStor.latest.value
      : null;
  const asOf = powellStor.latest?.date ?? null;
  const pct =
    stored !== null ? (stored / COMBINED_CAPACITY_ACRE_FEET) * 100 : null;

  // Section 4's computed claim: combined storage at the start of the
  // record (January 2000) vs today.
  const histSeries = (hist as { series: Record<string, (number | null)[]> })
    .series;
  const start2000 =
    histSeries.powell?.[0] != null && histSeries.mead?.[0] != null
      ? histSeries.powell[0]! + histSeries.mead[0]!
      : null;
  const dropPct =
    stored !== null && start2000 !== null
      ? ((start2000 - stored) / start2000) * 100
      : null;
  // The hero strip's then-vs-now: same Jan-2000 baseline and live pair as
  // §4, expressed as % of combined capacity.
  const startPct =
    start2000 !== null ? (start2000 / COMBINED_CAPACITY_ACRE_FEET) * 100 : null;

  return (
    <main>
      <div className="landing-kicker">
        A live public picture of the Colorado River
      </div>
      <h1 className="page-title">
        The Colorado River is committed to delivering more water than it
        produces.
      </h1>
      <div className="hero-stats">
        <div className="hs-tile">
          <div className="hs-kicker">Consumes</div>
          <div className="hs-num">{acreFeet(DEMAND_RECLAMATION_TOTAL)}</div>
          <div className="hs-sub">
            a year — roughly{" "}
            <strong>
              {Math.round(
                DEMAND_RECLAMATION_TOTAL /
                  HOUSEHOLD_ACRE_FEET_PER_YEAR /
                  1_000_000,
              )}{" "}
              million households&rsquo;
            </strong>{" "}
            worth of water
          </div>
        </div>
        <div className="hs-tile">
          <div className="hs-kicker">Produces</div>
          <div className="hs-num">{acreFeet(SUPPLY.modernMean.acreFeet)}</div>
          <div className="hs-sub">a year — the modern-era average</div>
        </div>
        <div className="hs-tile">
          <div className="hs-kicker">The gap</div>
          <div className="hs-num">{acreFeet(STRUCTURAL_DEFICIT)}</div>
          <div className="hs-sub">
            a year, paid from the reservoirs —{" "}
            {pct !== null && startPct !== null ? (
              <>
                now <strong>{Math.round(pct)}% full</strong>, down from{" "}
                {Math.round(startPct)}% in 2000
              </>
            ) : (
              "drawn down since 2000"
            )}
          </div>
        </div>
      </div>
      <div className="chain-caveat hs-note">
        Where these numbers come from — Consumes: the official tally of water
        use by the seven states and Mexico, kept by{" "}
        <Term id="reclamation">Reclamation</Term>; a 2020&ndash;24 average
        from the federal government&rsquo;s July 2026 environmental review
        (the &ldquo;Post-2026 Final EIS&rdquo;)<Cite id="feis2026" />.
        Produces: the 2000&ndash;2025 average of the river&rsquo;s{" "}
        <Term id="natural_flow">natural flow</Term> — what it would carry
        with no dams or diversions<Cite id="naturalflow" />. Reservoirs:
        Lakes Powell and Mead combined, from Reclamation&rsquo;s daily
        readings<Cite id="rise" />
        {asOf ? <> as of {formatDate(asOf)}</> : null}; the 2000 figure is
        January 2000. A typical household uses about{" "}
        {HOUSEHOLD_GALLONS_PER_YEAR.toLocaleString()} gallons a year — a bit
        over a third of an <Term id="acre_foot">acre-foot</Term>.
      </div>

      <h2 className="section-title">1 · What the basin consumes</h2>
      <p className="body-text">
        Seven states and Mexico take about{" "}
        <strong>
          {(DEMAND_RECLAMATION_TOTAL / 1_000_000).toFixed(2)} million{" "}
          <Term id="acre_foot">acre-feet</Term> (MAF)
        </strong>{" "}
        of water out of the Colorado River every year and don&rsquo;t return
        it — <Term id="consumptive_use">consumptive use</Term>, in the
        river&rsquo;s bookkeeping, counted by{" "}
        <Term id="reclamation">Reclamation</Term>, the federal agency that
        runs the big dams. The bulk of it happens in the{" "}
        <Term id="lower_basin">Lower Basin</Term>, and a slice evaporates off
        the reservoirs before anyone touches it. Most of the water goes to
        farms, not homes.
      </p>
      <div className="c1-grid">
        <div>
          <RankedBars items={CONSUMPTION_ITEMS} />
          <div className="chain-caveat" style={{ marginTop: 8 }}>
            2020&ndash;2024 averages, from the same July 2026 federal review
            as the topline numbers<Cite id="feis2026" />. The Upper Basin
            figure is disputed between two federal sources (3.8 vs 4.3 MAF).
          </div>
          <p className="body-text" style={{ marginTop: 22 }}>
            <strong>How it&rsquo;s changed.</strong>{" "}The Lower Basin — the
            largest component — across 23 years of decree accounting: near the
            full 7.5 MAF apportionment through the mid-2010s, then the
            conservation era&rsquo;s descent.
          </p>
          <ConsumptionLine />
          <div className="chain-caveat" style={{ marginTop: 8 }}>
            Parsed from the annual accounting reports<Cite id="decree2025" />{" "}
            (2003&ndash;2025
            {(lbHist as { excludedYears: number[] }).excludedYears.length > 0
              ? `; the ${(lbHist as { excludedYears: number[] }).excludedYears.join(", ")} reports use formats not yet parsed and render as gaps`
              : ", every report year"}
            ). Fetched {(lbHist as { fetched: string }).fetched}.
          </div>
        </div>
        <div>
          <p className="body-text c1-maplead">
            <strong>Where it happens.</strong>{" "}Consumption concentrates
            where the canals reach — the irrigation districts of the lower
            river and the cities the{" "}
            <Term id="aqueduct">aqueducts</Term> serve:
          </p>
          <ConsumptionMiniMap />
        </div>
      </div>


      <p className="body-text" style={{ marginTop: 22 }}>
        <strong>By type of use.</strong> A separate peer-reviewed
        accounting<Cite id="richter2024" /> breaks consumption down by what
        the water does — and agriculture dominates:
      </p>
      <RankedBars items={SECTOR_ITEMS} />
      <div className="warn-box" style={{ marginTop: 8 }}>
        <strong>
          These do not add to the {acreFeet(DEMAND_RECLAMATION_TOTAL)} above.
        </strong>{" "}
        This study counts all basin consumption including natural riparian
        vegetation ({acreFeet(RICHTER.totalAcreFeet)} total), which
        Compact-style accounting excludes. Both are correct — they answer
        different questions, and they are never summed here. The crop-level
        story: the <Link href={"/report/demand" as Route}>Demand chapter</Link>{" "}
        and <Link href={"/report/agriculture" as Route}>Agriculture chapter</Link>.
      </div>

      <h2 className="section-title">2 · What the river produces</h2>
      <p className="body-text">
        About <strong>{acreFeet(SUPPLY.modernMean.acreFeet)}</strong>{" "}a year
        in the modern era — well below the century&rsquo;s average, and
        falling as warming takes roughly 9% of flow per degree Celsius.
      </p>
      <SupplySeries />
      <div className="chain-caveat" style={{ marginTop: 8 }}>
        Reclamation&rsquo;s <Term id="natural_flow">natural-flow record</Term>
        <Cite id="naturalflow" /> at Lees Ferry, WY1906&ndash;2020
        (vintage stated); a computed, revisable series. The full story: the{" "}
        <Link href={"/report/supply" as Route}>Supply chapter</Link>.
      </div>

      <h2 className="section-title">3 · How the gap gets covered</h2>
      <p className="body-text">
        Consumption has run about{" "}
        <strong>{acreFeet(STRUCTURAL_DEFICIT)}</strong>{" "}a year ahead of what
        the river produces. That difference doesn&rsquo;t come from nowhere —
        it comes out of the two great reservoirs, Lakes Powell and Mead,
        which can keep deliveries flowing no matter what fell as snow that
        year. Storage is what lets use exceed supply. These are the accounts
        — Powell and Mead dwarf everything else:
      </p>
      <BasinStory storage={liveStorage} variant="explore" />
      <div className="chain-caveat" style={{ marginTop: 8 }}>
        Live — circle area is water in storage now (Reclamation RISE,
        provisional). Switch layers, pan, zoom, tap anything for its numbers
        and sources; Powell and Mead dwarf everything else, and the small
        downstream pools stay full on purpose (regulating basins for the
        aqueducts, not savings). Full-page version:{" "}
        <Link href={"/explore/map" as Route}>the basin map</Link>.
      </div>

      <h2 className="section-title">
        4 · The two largest reservoirs are down{" "}
        {dropPct !== null ? `${Math.round(dropPct)}%` : "about three-quarters"}{" "}
        since 2000 — now at{" "}
        {pct !== null ? `${Math.round(pct)}%` : "about a quarter"} of capacity
      </h2>
      <p className="body-text">
        The reservoirs were nearly full in 2000. Today they hold{" "}
        {pct !== null ? <strong>{percent(pct, 0)}</strong> : "about a quarter"}{" "}
        of their capacity
        {stored !== null && (
          <>
            {" "}
            — {acreFeet(stored)}, about one year of what the river now
            produces
          </>
        )}
        .
      </p>
      <StorageHistoryLine
        liveAf={stored}
        capacityAf={COMBINED_CAPACITY_ACRE_FEET}
      />
      <div className="chain-caveat" style={{ marginTop: 8 }}>
        Reclamation RISE<Cite id="rise" />, monthly since 2000, live endpoint, provisional
        {asOf && <> as of {formatDate(asOf)}</>}. Elevations, thresholds, and
        trajectories: the{" "}
        <Link href={"/report/reservoirs" as Route}>Reservoirs chapter</Link>{" "}
        and the <Link href={"/current-state" as Route}>current state</Link>.
      </div>

      <h2 className="section-title">
        5 · The result: downward pressure on what the states and Mexico may
        legally take
      </h2>
      <p className="body-text">
        On paper the basin is entitled to{" "}
        <strong>{acreFeet(TOTAL_APPORTIONED)}</strong> a year — but
        entitlements are ceilings on use, not deliveries, and as the reserves
        fall, the rules keep ratcheting actual use down toward what the river
        provides. The rules in force today ({RULEBOOK.label}) expire{" "}
        {formatDate(RULEBOOK.expires)}; their replacement<Cite id="og2728" /> was signed
        August 21, 2026, and fixes a Shortage Condition for 2027 and 2028. Who may
        take what, versus who actually does:
      </p>
      <UseVsEntitlement />
      <div className="chain-caveat" style={{ marginTop: 8 }}>
        Entitlements: Boulder Canyon Project Act<Cite id="bcpa1928" />, the
        1948 Upper Basin Compact<Cite id="ubcompact1948" />, and the 1944
        Treaty<Cite id="treaty1944" />. What the rules say at today&rsquo;s
        elevations, old and new: the{" "}
        <Link href={"/current-state" as Route}>rules panel</Link>. The full
        legal story: the{" "}
        <Link href={"/report/water-rights" as Route}>Water Rights chapter</Link>.
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
        Every figure above links to the chapter that defends it, and every
        number on this site carries its source. Reservoir storage is live
        from Reclamation RISE, provisional. A reduced-form, independent
        portrait — not affiliated with, nor equivalent to,
        Reclamation&rsquo;s models.
      </div>
    </main>
  );
}
