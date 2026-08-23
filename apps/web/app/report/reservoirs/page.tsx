import Link from "next/link";
import type { Route } from "next";
import { DrawdownChart } from "@/components/DrawdownChart";
import { ChapterKicker, ChapterPager } from "@/components/Chapter";
import { COMBINED_CAPACITY_ACRE_FEET, MEAD, POWELL } from "@/lib/reservoirs";
import { fetchSeries, REVALIDATE_SECONDS } from "@/lib/rise";
import {
  acreFeet,
  formatDate,
  formatTimestamp,
  percent,
  signed,
  volumeAnchors,
} from "@/lib/format";
import { SUPPLY } from "@/lib/system";

export const revalidate = 3600;
// Pin static despite the no-store RISE fetches (see lib/rise.ts) — data
// updates via page-level ISR, never per-request.
export const dynamic = "force-static";
export const metadata = { title: "Reservoirs — Basin" };

export default async function Reservoirs() {
  const [powellStor, meadStor] = await Promise.all([
    fetchSeries(POWELL.riseStorageItem),
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

  return (
    <main>
      <ChapterKicker slug="reservoirs" />
      <h1 className="page-title">Reservoirs</h1>
      <p className="page-lede">
        Lakes Powell and Mead are the buffer that has absorbed the gap between
        commitments and supply for two decades. This is what&rsquo;s left —
        and what the operating rules do as it falls. Today&rsquo;s elevations,
        tier status, and thresholds live on{" "}
        <Link href={"/now" as Route}>Now</Link>.
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
            <div className="anchors">
              <span className="anchor" style={{ borderColor: "var(--water)" }}>
                what&rsquo;s actually stored
              </span>
              {volumeAnchors(now).map((a) => (
                <span className="anchor" key={a.label}>
                  <b>{a.value}</b> {a.label}
                  {a.approximate && " (approx.)"}
                </span>
              ))}
            </div>
            <p className="subline" style={{ marginTop: 14 }}>
              Roughly{" "}
              <strong>
                {(now / SUPPLY.modernMean.acreFeet).toFixed(2)}×
              </strong>{" "}
              the river&rsquo;s modern annual flow — the two largest reservoirs
              in the United States together hold about one year of what the
              river now produces.
            </p>
          </>
        ) : (
          <p className="err">
            Live storage unavailable. Showing no value rather than a stale one.
          </p>
        )}
      </section>

      <h2 className="section-title">The drawdown, as a line</h2>
      <p className="body-text">
        Twenty-six years in one picture: both reservoirs nearly full at the
        millennium, the 2002 collapse, partial recoveries in 2005, 2011 and
        2023 — and the long structural slide underneath all of it.
      </p>
      <DrawdownChart
        liveNow={{
          powell: powellStor.latest?.value,
          mead: meadStor.latest?.value,
        }}
      />

      <h2 className="section-title">What happens next?</h2>
      <p className="body-text">
        The first question a line can&rsquo;t answer alone. The{" "}
        <Link href={"/explore/scenarios" as Route}>scenario lab</Link> runs
        the verified operating rules forward over every recent-history inflow
        sequence — move the conservation slider yourself and watch when the
        rules&rsquo; own thresholds get crossed. The output is always a band,
        not a line: the same rules over the wettest and driest recent inflow
        sequences produce very different trajectories, and that spread is the
        honest answer.
      </p>
      <div className="note">
        <p>
          <strong>Try it:</strong>{" "}
          <Link href={"/explore/scenarios" as Route}>
            open the scenario lab →
          </Link>{" "}
          Every projection is a band, never a line; the model, rulebook, and
          input-data versions are stamped on the output.
        </p>
      </div>

      <div className="chain-caveat" style={{ marginTop: 22 }}>
        Source: U.S. Bureau of Reclamation{" "}
        <a href="https://data.usbr.gov/">RISE</a> — Powell record 2362, Mead
        record 4370. All values provisional and revised without announcement.
        {asOf && <> Data as of {formatDate(asOf)}.</>} Page revalidates every{" "}
        {REVALIDATE_SECONDS / 60} minutes; rendered{" "}
        {formatTimestamp(new Date().toISOString())}.
      </div>

      <ChapterPager slug="reservoirs" />
    </main>
  );
}
