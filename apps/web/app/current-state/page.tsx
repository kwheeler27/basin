import Link from "next/link";
import type { Route } from "next";
import { ReservoirCard } from "@/components/ReservoirCard";
import { RulesToday } from "@/components/RulesToday";
import {
  COMBINED_CAPACITY_ACRE_FEET,
  MEAD,
  POWELL,
  RULEBOOK,
} from "@/lib/reservoirs";
import { fetchSeries, REVALIDATE_SECONDS } from "@/lib/rise";
import {
  acreFeet,
  formatDate,
  formatTimestamp,
  percent,
  signed,
} from "@/lib/format";
import canal from "@/public/geo/canal_gvc_2025.json";
import crops from "@/public/geo/crops_counties.json";
import ledger from "@/public/geo/transactions_gv.json";
import owners from "@/public/geo/rights_owner_agg.json";
import utChanges from "@/public/geo/changes_ut.json";

export const revalidate = 3600;
// Pin static despite the no-store RISE fetches (see lib/rise.ts) — data
// updates via page-level ISR, never per-request.
export const dynamic = "force-static";
export const metadata = { title: "Current State — Basin" };

export default async function CurrentState() {
  const [powellElev, powellStor, meadElev, meadStor] = await Promise.all([
    fetchSeries(POWELL.riseElevationItem),
    fetchSeries(POWELL.riseStorageItem),
    fetchSeries(MEAD.riseElevationItem),
    fetchSeries(MEAD.riseStorageItem),
  ]);

  const now =
    powellStor.latest && meadStor.latest
      ? powellStor.latest.value + meadStor.latest.value
      : null;
  const yearAgo =
    powellStor.yearAgo && meadStor.yearAgo
      ? powellStor.yearAgo.value + meadStor.yearAgo.value
      : null;
  const pct = now !== null ? (now / COMBINED_CAPACITY_ACRE_FEET) * 100 : null;
  const deltaPct =
    now !== null && yearAgo !== null
      ? ((now - yearAgo) / COMBINED_CAPACITY_ACRE_FEET) * 100
      : null;
  const asOf = powellStor.latest?.date ?? null;

  const freshness: {
    source: string;
    what: string;
    cadence: string;
    asOfLabel: string;
    live?: boolean;
  }[] = [
    {
      source: "Reclamation RISE",
      what: "Reservoir storage & elevation",
      cadence: "daily · provisional",
      asOfLabel: asOf ? formatDate(asOf) : "unavailable",
      live: true,
    },
    {
      source: "Colorado DWR (CDSS)",
      what: "Decree-transaction ledger, Grand Valley",
      cadence: "weekly bake",
      asOfLabel: ledger.fetched,
    },
    {
      source: "Utah DWRi",
      what: "Change applications on notice",
      cadence: "weekly bake",
      asOfLabel: (utChanges as { fetched: string }).fetched,
    },
    {
      source: "State rights registries (CO·AZ·NM·CA)",
      what: "Rights county & holder aggregates",
      cadence: "monthly bake",
      asOfLabel: (owners as unknown as { fetched: string }).fetched,
    },
    {
      source: "USDA Cropland Data Layer",
      what: `Crop mix, 16 counties (CDL ${(crops as { year: number }).year})`,
      cadence: "annual bake",
      asOfLabel: (crops as { fetched: string }).fetched,
    },
    {
      source: "Colorado DWR (CDSS)",
      what: "Canal diversions, 2025 season",
      cadence: "seasonal bake",
      asOfLabel: canal.fetched,
    },
  ];

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

      <h1 className="page-title">Current state</h1>
      <p className="page-lede">
        The state of the system — live where the record is live, dated
        everywhere else. For why these numbers are what they are, read{" "}
        <Link href={"/report" as Route}>the report</Link>.
      </p>

      <section className="hero">
        <p className="question">How much water is in storage today?</p>
        {now !== null && pct !== null ? (
          <>
            <div className="bignum">
              {percent(pct, 1)}
              <small>of combined capacity</small>
            </div>
            <div className="subline">
              {acreFeet(now)} of {acreFeet(COMBINED_CAPACITY_ACRE_FEET)}
              {deltaPct !== null && (
                <>
                  {" · "}
                  <span className={deltaPct < 0 ? "down" : "up"}>
                    {signed(deltaPct, (n) => `${n.toFixed(1)} pts`)} in one year
                  </span>
                </>
              )}
            </div>
            <div className="capbar">
              <div
                className="capbar-fill"
                style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
              />
            </div>
          </>
        ) : (
          <p className="err">
            Live storage unavailable. Showing no value rather than a stale one.
          </p>
        )}
      </section>

      <div className="grid">
        <ReservoirCard
          reservoir={POWELL}
          elevation={powellElev}
          storage={powellStor}
        />
        <ReservoirCard reservoir={MEAD} elevation={meadElev} storage={meadStor} />
      </div>

      {powellElev.latest && meadElev.latest && (
        <RulesToday
          powellElevation={powellElev.latest.value}
          meadElevation={meadElev.latest.value}
        />
      )}

      <h2 className="section-title">Every source, and how fresh it is</h2>
      <p className="body-text">
        The numbers on this site come from these records. A stale source shows
        its age here rather than silently serving old numbers — the date is
        part of the fact.
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Source of record</th>
              <th>What it feeds</th>
              <th>Cadence</th>
              <th>As of</th>
            </tr>
          </thead>
          <tbody>
            {freshness.map((f) => (
              <tr key={`${f.source}-${f.what}`}>
                <td>{f.source}</td>
                <td>{f.what}</td>
                <td>{f.cadence}</td>
                <td>
                  {f.live && (
                    <span className="clock-badge clock-live" style={{ marginRight: 6 }}>
                      LIVE
                    </span>
                  )}
                  {f.asOfLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="chain-caveat" style={{ marginTop: 10 }}>
        Full definitions, accounting concepts, and known incompatibilities for
        every dataset: the <Link href="/data">Data page</Link>, rendered from
        the measure registry.
      </div>

      <div className="note" style={{ marginTop: 26 }}>
        <p>
          <strong>What this page will grow into.</strong> Snowpack against
          median, the CBRFC runoff forecast, drought extent, and water-year
          precipitation — each tile live from its agency of record (NRCS,
          CBRFC, the U.S. Drought Monitor), each with percentile-of-record
          context. Missing tiles stay missing until the feed is real: no
          placeholder numbers, ever.
        </p>
      </div>

      <div className="chain-caveat" style={{ marginTop: 22 }}>
        Reservoir data: Reclamation RISE, provisional and revised without
        announcement. Page revalidates every {REVALIDATE_SECONDS / 60}{" "}
        minutes; rendered {formatTimestamp(new Date().toISOString())}.
      </div>
    </main>
  );
}
