import Link from "next/link";
import type { Route } from "next";
import { DeliveryPareto, type ParetoItem } from "@/components/DeliveryPareto";
import { ReservoirMiniMap } from "@/components/ReservoirMiniMap";
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
import { acreFeet, formatDate, percent } from "@/lib/format";
import {
  DEMAND_RECLAMATION,
  DEMAND_RECLAMATION_TOTAL,
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
// Section 1's Pareto rows, derived from the sourced DEMAND_RECLAMATION
// components — no landing-local numbers.
const CONSUMPTION_SHORT: Record<string, string> = {
  "demand.lower_basin": "Lower Basin",
  "demand.upper_basin": "Upper Basin",
  "demand.mexico": "Mexico",
  "demand.evaporation": "Evaporation",
};
const CONSUMPTION_ITEMS: ParetoItem[] = DEMAND_RECLAMATION.map((d) => ({
  short: CONSUMPTION_SHORT[d.id] ?? d.label,
  name: d.label,
  af: d.acreFeet,
  flag: d.note?.startsWith("DISPUTED")
    ? "disputed · 3.8 vs 4.3 MAF"
    : undefined,
}));

export default async function Landing() {
  // Live storage for every reservoir with a RISE item (the mini-map's
  // circles); Powell + Mead drive the headline numbers.
  const withItems = MAP_RESERVOIRS.filter((r) => r.riseStorageItem);
  const series = await Promise.all(
    withItems.map((r) => fetchSeries(r.riseStorageItem!, 45)),
  );
  const liveStorage: Record<string, { af: number } | undefined> = {};
  withItems.forEach((r, i) => {
    const latest = series[i]!.latest;
    if (latest) liveStorage[r.id] = { af: latest.value };
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

  return (
    <main>
      <div className="landing-kicker">
        A live public picture of the Colorado River
      </div>
      <h1 className="page-title">
        The Colorado River is committed to delivering more water than it
        produces.
      </h1>
      <p className="page-lede">The arithmetic, in five steps.</p>

      <h2 className="section-title">1 · What the basin consumes</h2>
      <p className="body-text">
        The states and Mexico consume about{" "}
        <strong>{acreFeet(DEMAND_RECLAMATION_TOTAL)}</strong>{" "}of Colorado
        River water a year, on Reclamation&rsquo;s accounting — most of it in
        the Lower Basin, plus what evaporates off the reservoirs before
        anyone uses it.
      </p>
      <DeliveryPareto
        items={CONSUMPTION_ITEMS}
        axisContext="share of total consumption"
        valueHeader="2020–24 average use"
      />
      <div className="chain-caveat" style={{ marginTop: 8 }}>
        2020&ndash;2024 averages (Post-2026 Final EIS). The Upper Basin
        figure is disputed between two federal sources (3.8 vs 4.3 MAF) —
        both are shown in the table view. Who uses it, by sector and crop:
        the{" "}
        <Link href={"/report/demand" as Route}>Demand chapter</Link>.
      </div>

      <h2 className="section-title">2 · What the river produces</h2>
      <p className="body-text">
        About <strong>{acreFeet(SUPPLY.modernMean.acreFeet)}</strong>{" "}a year
        in the modern era — well below the century&rsquo;s average, and
        falling as warming takes roughly 9% of flow per degree Celsius.
      </p>
      <SupplySeries />
      <div className="chain-caveat" style={{ marginTop: 8 }}>
        Reclamation&rsquo;s natural-flow record at Lees Ferry, WY1906&ndash;2020
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
      <ReservoirMiniMap storage={liveStorage} />
      <div className="chain-caveat" style={{ marginTop: 8 }}>
        The 11 live-gauged major reservoirs (Reclamation RISE). Two others
        (Roosevelt, Dillon) have non-federal operators and no live feed.
        Downstream pools stay full on purpose — regulating basins for the
        aqueducts, not savings.
      </div>

      <h2 className="section-title">4 · What that has done to the reserves</h2>
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
        Reclamation RISE, monthly since 2000, live endpoint, provisional
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
        {formatDate(RULEBOOK.expires)}; their replacement was signed August
        21, 2026, and fixes a Shortage Condition for 2027 and 2028. Who may
        take what, versus who actually does:
      </p>
      <UseVsEntitlement />
      <div className="chain-caveat" style={{ marginTop: 8 }}>
        Entitlements: Boulder Canyon Project Act, the 1948 Upper Basin
        Compact, and the 1944 Treaty. What the rules say at today&rsquo;s
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
