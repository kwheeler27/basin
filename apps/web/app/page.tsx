import Link from "next/link";
import type { Route } from "next";
import { ConsumptionLine } from "@/components/ConsumptionLine";
import { ConsumptionMiniMap } from "@/components/ConsumptionMiniMap";
import { RankedBars, type RankedBarItem } from "@/components/RankedBars";
import { Term } from "@/components/Term";
import { BasinStory } from "@/components/BasinStory";
import { Cite } from "@/components/Cite";
import { KickerNote } from "@/components/KickerNote";
import { SnowPrecipHistory } from "@/components/SnowPrecipHistory";
import { StorageByReservoir } from "@/components/StorageByReservoir";
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
import { CHAPTERS } from "@/lib/report";
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
import countyShares from "@/public/geo/county_irrigation_shares.json";
import snowHist from "@/public/geo/snow_precip_history.json";
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
 * The landing IS the executive summary and the argument (IA v3, decision
 * record 2026-09-03): consumption → production → reservoirs cover the gap
 * (absorbing the old reserves beat) → what it's doing to the law → the
 * consumption response. Every beat ends with an evidence line into the
 * chapter that defends it; the chapters carry the reverse edge.
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
  years: Record<
    string,
    { lbTotal: number; az?: number; ca?: number; nv?: number; mexico?: number }
  >;
}).years;
const LB_FIRST = Math.min(...Object.keys(LB_YEARS_MAP).map(Number));
const LB_LAST = Math.max(...Object.keys(LB_YEARS_MAP).map(Number));
// The chart's takeaway header and its reconciliation to the bars are
// computed from the same series they describe, so they can never drift.
const LB_LAST_TOTAL = LB_YEARS_MAP[String(LB_LAST)]?.lbTotal ?? null;
const LB_RECORD_LOW =
  LB_LAST_TOTAL !== null &&
  Object.values(LB_YEARS_MAP).every((v) => v.lbTotal >= LB_LAST_TOTAL);
const ALL_LINES_DOWN_DECADE = (
  ["lbTotal", "az", "ca", "nv", "mexico"] as const
).every((k) => {
  const now = LB_YEARS_MAP[String(LB_LAST)]?.[k];
  const then = LB_YEARS_MAP[String(LB_LAST - 10)]?.[k];
  return now != null && then != null && now < then;
});
const FEIS_WINDOW = [2020, 2021, 2022, 2023, 2024];
const LB_FEIS_MEAN =
  FEIS_WINDOW.reduce((s, y) => s + (LB_YEARS_MAP[String(y)]?.lbTotal ?? 0), 0) /
  FEIS_WINDOW.length;
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

// §3's ledger: what each tracked reservoir has given up since January 2000
// (monthly RISE history) — the honest measure of who covered the gap. Two
// small regulating pools have actually gained; they net against the Rest
// bucket rather than being hidden.
const HIST_MONTHS = (hist as { months: string[] }).months;
const HIST_SERIES = (hist as { series: Record<string, (number | null)[]> })
  .series;
function drawdownOf(id: string) {
  const s = HIST_SERIES[id];
  if (!s) return null;
  const firstIdx = s.findIndex((v) => v != null);
  let lastIdx = s.length - 1;
  while (lastIdx > 0 && s[lastIdx] == null) lastIdx--;
  if (firstIdx < 0 || s[lastIdx] == null) return null;
  return { start: s[firstIdx]!, now: s[lastIdx]!, drop: s[firstIdx]! - s[lastIdx]! };
}
const TRACKED_IDS = Object.keys(HIST_SERIES);
const DRAWDOWNS = TRACKED_IDS.flatMap((id) => {
  const d = drawdownOf(id);
  const r = MAP_RESERVOIRS.find((m) => m.id === id);
  return d && r ? [{ id, name: r.name, capacityAf: r.capacityAf, ...d }] : [];
}).sort((a, b) => b.drop - a.drop);
const DRAWDOWN_TOTAL = DRAWDOWNS.reduce((s, d) => s + d.drop, 0);
const DRAWDOWN_TOP = DRAWDOWNS.slice(0, 5);
const DRAWDOWN_REST = DRAWDOWNS.slice(5);
const DRAWDOWN_REST_SUM = DRAWDOWN_REST.reduce((s, d) => s + d.drop, 0);
const PM_SHARE = Math.round(
  ((DRAWDOWNS.filter((d) => d.id === "powell" || d.id === "mead")
    .reduce((s, d) => s + d.drop, 0)) /
    DRAWDOWN_TOTAL) *
    100,
);
const HIST_START_LABEL = HIST_MONTHS[0] ?? "2000-01";
const STORAGE_ITEMS: RankedBarItem[] = [
  ...DRAWDOWN_TOP.map((d, i) => ({
    short: d.name,
    name: d.name,
    af: d.drop,
    sheet: {
      kicker: "Drawdown since 2000",
      title: d.name,
      fact: `Gave up about ${acreFeet(d.drop)} since January 2000 — ${Math.round((d.drop / DRAWDOWN_TOTAL) * 100)}% of everything the tracked system lost.`,
      detail: `Held ${acreFeet(d.start)} in January 2000 and ${acreFeet(d.now)} at the last monthly reading — ${Math.round((d.now / d.capacityAf) * 100)}% of its ${acreFeet(d.capacityAf)} capacity.`,
      chips: ["acre_foot", "storage_capacity", "provisional"],
      compare: [`#${i + 1} of ${DRAWDOWNS.length} tracked reservoirs by drawdown`],
      source: "Reclamation RISE, monthly-sampled daily storage",
      clock: "live" as const,
      clockLabel: "MONTHLY SINCE 2000",
    },
  })),
  {
    short: `Rest of system (${DRAWDOWN_REST.length})`,
    name: `The ${DRAWDOWN_REST.length} smaller tracked reservoirs combined`,
    af: Math.max(DRAWDOWN_REST_SUM, 0),
    sheet: {
      kicker: "Drawdown since 2000",
      title: `Rest of the system — ${DRAWDOWN_REST.length} reservoirs`,
      fact: `Combined, they gave up about ${acreFeet(Math.abs(DRAWDOWN_REST_SUM))} since January 2000 — ${Math.round((DRAWDOWN_REST_SUM / DRAWDOWN_TOTAL) * 100)}% of the total. The gap was not paid from here.`,
      detail: `${DRAWDOWN_REST.map((d) => d.name).join(", ")}. ${DRAWDOWN_REST.filter((d) => d.drop < 0).map((d) => d.name).join(" and ") || "None"} actually hold more than in 2000 — the small downstream pools are regulating basins for the aqueducts and are kept full on purpose.`,
      chips: ["acre_foot", "storage_capacity", "provisional"],
      source: "Reclamation RISE, monthly-sampled daily storage",
      clock: "live" as const,
      clockLabel: "MONTHLY SINCE 2000",
    },
  },
];

// §1 map lead's corroboration: shares of in-watershed irrigation
// withdrawals, baked by scripts/build-county-shares.mjs from the same
// classification the mini-map draws. The heading's quantifier is derived
// from the number, so it can never overclaim what the data shows.
const COUNTY_SHARES = countyShares as {
  countyCount: number;
  counties: { name: string; st: string; sharePct: number; rank: number }[];
};
const COUNTY_TOP4 = COUNTY_SHARES.counties.slice(0, 4);
const COUNTY_TOP4_SHARE = COUNTY_TOP4.reduce((s, c) => s + c.sharePct, 0);
const COUNTY_TOP4_WORD =
  COUNTY_TOP4_SHARE >= 50
    ? "most"
    : COUNTY_TOP4_SHARE >= 33.3
      ? "over a third"
      : COUNTY_TOP4_SHARE >= 25
        ? "over a quarter"
        : `${Math.round(COUNTY_TOP4_SHARE)}%`;

// §2's source-of-the-water lead: computed from the baked NRCS indexes so
// the below-median count can never drift from the chart it sits above.
const SWE_HIST = (snowHist as {
  aprilSwePctMedian: Record<string, { pct: number | null; used: number }>;
}).aprilSwePctMedian;
const SWE_LAST15 = Object.keys(SWE_HIST)
  .map(Number)
  .sort((a, b) => a - b)
  .slice(-15)
  .map((y) => SWE_HIST[String(y)]?.pct)
  .filter((v): v is number => v != null);
const SWE_BELOW_15 = SWE_LAST15.filter((v) => v < 100).length;

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
          <div className="hs-kicker">
            <KickerNote label="Consumes">
              The official tally of water use by the seven states and Mexico,
              kept by Reclamation — a 2020&ndash;24 average from the federal
              government&rsquo;s July 2026 environmental review (the
              &ldquo;Post-2026 Final EIS&rdquo;)<Cite id="feis2026" />. A
              typical household uses about{" "}
              {HOUSEHOLD_GALLONS_PER_YEAR.toLocaleString()} gallons a year —
              a bit over a third of an acre-foot.
            </KickerNote>
          </div>
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
          <div className="hs-kicker">
            <KickerNote label="Produces">
              The {SUPPLY.modernMean.period.replace("≈", "")} average of the
              river&rsquo;s natural flow — what it would carry with no dams
              or diversions, reconstructed by Reclamation from gauge
              records<Cite id="naturalflow" />.
            </KickerNote>
          </div>
          <div className="hs-num">{acreFeet(SUPPLY.modernMean.acreFeet)}</div>
          <div className="hs-sub">
            a year — the {SUPPLY.modernMean.period.replace("≈", "")} average
          </div>
        </div>
        <div className="hs-tile">
          <div className="hs-kicker">
            <KickerNote label="The gap">
              Consumes minus produces. It is paid from storage: the reservoir
              figure is Lakes Powell and Mead combined, from
              Reclamation&rsquo;s daily readings<Cite id="rise" />
              {asOf ? <> as of {formatDate(asOf)}</> : null}, provisional;
              the 2000 baseline is January 2000.
            </KickerNote>
          </div>
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
      <h2 className="section-title">
        1 · What the <Term id="basin">basin</Term> consumes
      </h2>
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
      <p className="body-text" style={{ marginTop: 18 }}>
        <strong>
          The Lower Basin takes{" "}
          {Math.round(
            (DEMAND_RECLAMATION.find((d) => d.id === "demand.lower_basin")!
              .acreFeet /
              DEMAND_RECLAMATION_TOTAL) *
              100,
          )}
          % of it.
        </strong>{" "}
        The accounted total, split four ways:
      </p>
      <RankedBars items={CONSUMPTION_ITEMS} />
      <div className="chain-caveat" style={{ marginTop: 8 }}>
        2020&ndash;2024 averages, from the same July 2026 federal review
        as the topline numbers<Cite id="feis2026" />. The Upper Basin
        figure is disputed between two federal sources (3.8 vs 4.3 MAF).
      </div>

      <p className="body-text" style={{ marginTop: 26 }}>
        <strong>
          Four desert counties take {COUNTY_TOP4_WORD} of the irrigation
          water.
        </strong>{" "}
        Of the {COUNTY_SHARES.countyCount} counties irrigating inside
        the watershed and its canal lands, the top four —{" "}
        {COUNTY_TOP4.map((c) => c.name).join(", ")} — draw{" "}
        <strong>{Math.round(COUNTY_TOP4_SHARE)}%</strong> of everything
        withdrawn for crops (USGS 2015 census); Imperial alone takes{" "}
        {COUNTY_SHARES.counties[0]!.sharePct}%, more than any other
        county. The{" "}
        <Term id="aqueduct">aqueducts</Term> and canals decide where the
        water lands:
      </p>
      <ConsumptionMiniMap />


      <p className="body-text" style={{ marginTop: 22 }}>
        <strong>Most of it grows crops.</strong> A separate peer-reviewed
        accounting<Cite id="richter2024" /> breaks consumption down by what
        the water does — agriculture takes about half of everything the
        basin consumes:
      </p>
      <RankedBars items={SECTOR_ITEMS} />
      <div className="warn-box" style={{ marginTop: 8 }}>
        <strong>
          These do not add to the {acreFeet(DEMAND_RECLAMATION_TOTAL)} above.
        </strong>{" "}
        This study counts all basin consumption including natural riparian
        vegetation ({acreFeet(RICHTER.totalAcreFeet)} total), which
        Compact-style accounting excludes. Both are correct — they answer
        different questions, and they are never summed here.
      </div>
      <p className="evidence-line">
        The full case:{" "}
        <Link href={"/report/demand" as Route}>the Demand chapter →</Link>{" "}
        · <Link href={"/report/agriculture" as Route}>the Agriculture chapter →</Link>
      </p>

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
        (vintage stated); a computed, revisable series.
      </div>

      <p className="body-text" style={{ marginTop: 26 }}>
        <strong>
          {SWE_BELOW_15} of the last {SWE_LAST15.length} years started with
          below-median snow.
        </strong>{" "}
        The river&rsquo;s water begins in the Upper Basin&rsquo;s mountains,
        mostly as snow. Two NRCS station indexes — where the snowpack stood
        each April 1, and how much rain and snow the{" "}
        <Term id="water_year">water year</Term> delivered — against 100%,
        the typical year:
      </p>
      <div className="chart-col">
        <SnowPrecipHistory />
        <div className="chain-caveat" style={{ marginTop: 8 }}>
          NRCS SNOTEL stations in the Upper Colorado watershed
          <Cite id="awdb" /> — the same{" "}
          {(snowHist as { stationsInRoster: number }).stationsInRoster}
          -station roster as the live snowpack tile; the basin index is the
          sum of station readings over the sum of station medians (NRCS
          convention), never an average of percentages. Station coverage
          grows through the record — years with too few reporting stations
          are gaps. Percent-of-median is a different accounting from
          acre-feet of flow and is never summed with the record above.
          Baked {(snowHist as { baked: string }).baked}.
        </div>
      </div>
      <p className="evidence-line">
        The full case:{" "}
        <Link href={"/report/supply" as Route}>the Supply chapter →</Link>
      </p>

      <h2 className="section-title">3 · Reservoirs cover the deficit</h2>
      <p className="body-text">
        Consumption has run about{" "}
        <strong>{acreFeet(STRUCTURAL_DEFICIT)}</strong>{" "}a year ahead of what
        the river produces, and the difference comes out of storage. The{" "}
        {DRAWDOWNS.length} big reservoirs this site tracks have given up
        about <strong>{acreFeet(DRAWDOWN_TOTAL)}</strong> since January 2000
        — and the drawdown is extremely skewed:{" "}
        <strong>{PM_SHARE}%</strong> of it came from just two accounts, Lakes
        Powell and Mead
        {pct !== null && startPct !== null ? (
          <>
            , which have fallen from {Math.round(startPct)}% full to{" "}
            {Math.round(pct)}% over those years
          </>
        ) : null}
        . Storage is what lets use exceed supply.
      </p>
      <div className="c1-grid">
        <div>
          <p className="body-text c1-maplead">
            <strong>Two accounts paid {PM_SHARE}% of it.</strong>{" "}Each
            reservoir&rsquo;s drawdown since January 2000:
          </p>
          <RankedBars items={STORAGE_ITEMS} />
          <div className="chain-caveat" style={{ marginTop: 8 }}>
            Change in water stored, {HIST_START_LABEL} to the last monthly
            reading (Reclamation RISE<Cite id="rise" />, provisional).
            Drawdown exceeds the yearly gap &times; years because dry years,
            reservoir evaporation, and the early-2000s crash all drew
            storage down too.
          </div>
        </div>
        <div>
          <p className="body-text c1-maplead">
            <strong>Powell and Mead dwarf everything else.</strong>{" "}
            Circle area is water in storage now — live:
          </p>
          <BasinStory storage={liveStorage} variant="explore" />
          <div className="chain-caveat" style={{ marginTop: 8 }}>
            Reclamation RISE, provisional. Switch layers, pan, zoom, tap
            anything for its numbers and sources. Full-page version:{" "}
            <Link href={"/explore/map" as Route}>the basin map</Link>.
          </div>
        </div>
      </div>
      <p className="body-text" style={{ marginTop: 22 }}>
        <strong>Only two lines fall.</strong>{" "}Every account drawn
        down, month by month — Mead and Powell carry the fall; the rest of
        the system barely moves:
      </p>
      <StorageByReservoir />
      <div className="chain-caveat" style={{ marginTop: 8 }}>
        Monthly since 2000, Reclamation RISE<Cite id="rise" />, provisional.
        The small downstream pools stay full on purpose — they are
        regulating basins for the aqueducts, not savings.
      </div>
      <p className="body-text" style={{ marginTop: 22 }}>
        <strong>What&rsquo;s left is about one year of river.</strong>{" "}
        The two big accounts together hold{" "}
        {pct !== null ? <strong>{percent(pct, 0)}</strong> : "about a quarter"}{" "}
        of their capacity
        {stored !== null && (
          <>
            {" "}
            — {acreFeet(stored)}, roughly one year of what the river now
            produces
          </>
        )}
        :
      </p>
      <StorageHistoryLine
        liveAf={stored}
        capacityAf={COMBINED_CAPACITY_ACRE_FEET}
      />
      <div className="chain-caveat" style={{ marginTop: 8 }}>
        Reclamation RISE<Cite id="rise" />, monthly since 2000, live endpoint, provisional
        {asOf && <> as of {formatDate(asOf)}</>}. Elevations, thresholds, and
        trajectories: <Link href={"/current-state" as Route}>Now</Link>.
      </div>
      <p className="evidence-line">
        The full case:{" "}
        <Link href={"/report/reservoirs" as Route}>the Reservoirs chapter →</Link>{" "}
        · <Link href={"/report/infrastructure" as Route}>the Infrastructure chapter →</Link>
      </p>

      <h2 className="section-title">
        4 · The result: downward pressure on what the states and Mexico may
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
        <Link href={"/current-state" as Route}>rules panel</Link>.
      </div>
      <p className="evidence-line">
        The full case:{" "}
        <Link href={"/report/water-rights" as Route}>the Water Rights chapter →</Link>
      </p>

      <h2 className="section-title">5 · The response: use is falling</h2>
      <div className="chart-col">
        <p className="body-text" style={{ marginTop: 26 }}>
          The Lower Basin ran close to its full 7.5 MAF{" "}
          <Term id="apportionment">apportionment</Term> until the mid-2010s.
          In {LB_LAST} it used{" "}
          <strong>
            {LB_LAST_TOTAL !== null
              ? `${(LB_LAST_TOTAL / 1_000_000).toFixed(2)} MAF`
              : "less"}
          </strong>
          {LB_RECORD_LOW ? <> — the lowest year in the record</> : null}
          {ALL_LINES_DOWN_DECADE ? (
            <>
              {" "}
              — and every line on this chart is lower than it was a decade
              ago.
            </>
          ) : (
            <>.</>
          )}{" "}
          Some of the decline is voluntary — conservation programs and paid
          fallowing — and some is the shortage rules binding. Either way,
          the response shows up in the accounting:
        </p>
        <ConsumptionLine />
        <div className="chain-caveat" style={{ marginTop: 8 }}>
          Same books as the §1 bars: the Lower Basin bar (
            {acreFeet(DEMAND_RECLAMATION.find((d) => d.id === "demand.lower_basin")!.acreFeet)}
            ) is the 2020&ndash;24 average of the total line here —{" "}
            {(LB_FEIS_MEAN / 1_000_000).toFixed(2)}{" "}MAF; the difference is
            rounding between reports. The Upper Basin and reservoir
            evaporation aren&rsquo;t drawn because no year-by-year series
            exists for them yet — their federal reports come in five-year
            cycles. Parsed from the annual accounting reports
            <Cite id="decree2025" /> ({LB_FIRST}&ndash;{LB_LAST}
            {(lbHist as { excludedYears: number[] }).excludedYears.length > 0
              ? `; the ${(lbHist as { excludedYears: number[] }).excludedYears.join(", ")} reports use formats not yet parsed and render as gaps`
              : ", every report year"}
            ). Fetched {(lbHist as { fetched: string }).fetched}.
        </div>
        <p className="evidence-line">
          The full case:{" "}
          <Link href={"/report/demand" as Route}>the Demand chapter →</Link>
        </p>
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
        Basin shows the whole system — the live state, the argument above
        with the evidence behind it, and instruments for checking every
        number yourself.
      </p>
      <div className="cta-row">
        <Link className="cta primary" href={"/current-state" as Route}>
          See what&rsquo;s happening now →
        </Link>
        <Link className="cta" href={"/explore" as Route}>
          Explore the data
        </Link>
      </div>
      <p className="chain-caveat" style={{ marginTop: 20 }}>
        Every claim above links its chapter. All of them, in order:
      </p>
      <div className="close-toc">
        {CHAPTERS.map((c) => (
          <Link key={c.slug} href={`/report/${c.slug}` as Route}>
            {c.title}
          </Link>
        ))}
        <Link href={"/report/wy2026" as Route}>
          WY2026 — the year the river nearly broke its rules
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
