import Link from "next/link";
import { BasinStory } from "@/components/BasinStory";
import { SystemChain } from "@/components/SystemChain";
import { MEAD, POWELL, RULEBOOK } from "@/lib/reservoirs";
import { MAP_RESERVOIRS } from "@/lib/mapdata";
import { fetchSeries } from "@/lib/rise";
import { acreFeet, formatDate, percent } from "@/lib/format";
import {
  CROPS,
  RICHTER,
  SUPPLY,
  TOTAL_APPORTIONED,
  TEMPERATURE_SENSITIVITY,
} from "@/lib/system";

export const revalidate = 3600;

export default async function Overview() {
  // Live storage for every reservoir with a RISE item (11 of 13; Roosevelt
  // and Dillon have non-federal operators and no live feed).
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
  const capacity = POWELL.capacityAcreFeet + MEAD.capacityAcreFeet;
  const asOf = powellStor.latest?.date ?? null;

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

      <h1 className="page-title">
        The Colorado River is committed to delivering more water than it produces.
      </h1>
      <p className="page-lede">
        Roughly 40 million people and 5 million irrigated acres depend on it.
        The map is live — switch layers, pan, zoom, tap anything. Or scroll
        for the guided story.
      </p>

      <BasinStory storage={liveStorage} variant="explore" />

      <div className="scroll-cue" aria-hidden="true">
        The guided tour ↓ · five chapters, two minutes
      </div>

      <BasinStory storage={liveStorage} />
      <p className="chain-caveat">
        Rivers and the watershed are real geometry (Natural Earth, USGS);
        delivery paths are schematic between real endpoints. Reservoir storage
        is live from Reclamation RISE, provisional.
      </p>

      <SystemChain storedNow={stored} />

      <h2 className="section-title">The three numbers that explain it</h2>
      <div className="triad">
        <div className="triad-item">
          <div className="triad-num">
            {acreFeet(TOTAL_APPORTIONED)}
            <span className="chip chip-administrative">legal</span>
          </div>
          <div className="triad-label">Promised on paper</div>
          <p>
            7.5 MAF to the Upper Basin, 7.5 to the Lower Basin, 1.5 to Mexico by
            treaty. These are entitlements, not measurements — and they were
            written when the river was assumed to carry{" "}
            {acreFeet(SUPPLY.compactAssumption.acreFeet)} a year.
          </p>
        </div>
        <div className="triad-item">
          <div className="triad-num">
            {acreFeet(SUPPLY.modernMean.acreFeet)}
            <span className="chip chip-estimated">estimated</span>
          </div>
          <div className="triad-label">What actually arrives</div>
          <p>
            The modern average. Tree rings put the long-term mean near{" "}
            {acreFeet(SUPPLY.reconstructedMean.acreFeet)} — meaning the Compact&rsquo;s
            founding number was never normal. Warming has since cut flow by
            about {TEMPERATURE_SENSITIVITY.percentPerDegreeC}% per °C.
          </p>
        </div>
        <div className="triad-item">
          <div className="triad-num">
            {stored !== null ? acreFeet(stored) : "—"}
            <span className="chip chip-observed">observed</span>
          </div>
          <div className="triad-label">What&rsquo;s left in storage</div>
          <p>
            Lakes Powell and Mead combined
            {stored !== null && (
              <>
                {" "}
                — {percent((stored / capacity) * 100, 0)} of capacity, roughly
                one year of the river&rsquo;s modern flow
              </>
            )}
            . The buffer that has absorbed the difference for two decades.
          </p>
        </div>
      </div>

      <h2 className="section-title">Where the water actually goes</h2>
      <div className="split">
        <div>
          <div className="sector-bars">
            {RICHTER.sectors.map((s) => (
              <div key={s.id} className="sector-row">
                <div className="sector-label">
                  {s.label}
                  <span className="sector-pct">{s.percent}%</span>
                </div>
                <div className="sector-track">
                  <div
                    className={`sector-fill ${s.id.split(".")[1]}`}
                    style={{ width: `${s.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="prov" style={{ borderTop: "none" }}>
            {RICHTER.source} · {RICHTER.period} · total{" "}
            {acreFeet(RICHTER.totalAcreFeet)}. This is a{" "}
            <strong>different accounting universe</strong> from the balance
            above: it includes natural riparian vegetation, which Compact
            accounting excludes. The two totals are not comparable.
          </p>
        </div>
        <div className="note">
          <p>
            <strong>Agriculture is {RICHTER.sectors[0]!.percent}% of it</strong>{" "}
            — and cattle-feed crops are {CROPS.cattleFeedShareOfAgriculture}% of
            that. Alfalfa alone consumes about{" "}
            {acreFeet(CROPS.alfalfaAcreFeet)} a year, roughly{" "}
            {CROPS.alfalfaShareOfBasin}% of all water consumed in the basin. In
            the Upper Basin, {CROPS.upperBasinAgToCattleFeed}% of irrigation
            water grows feed for livestock.
          </p>
          <p>
            That is not an indictment. Alfalfa persists because it is
            high-yielding, nutrient-dense, perennial, nitrogen-fixing,
            marketable, and well suited to livestock systems. But it means the
            water question is largely an agriculture question, and{" "}
            <Link href="/demand">every city in the basin combined</Link> is
            under a fifth of consumption.
          </p>
        </div>
      </div>

      <div className="chain-caveat" style={{ marginTop: 26 }}>
        {asOf && <>Reservoir storage as of {formatDate(asOf)}, provisional. </>}
        Supply, demand, and sector figures come from periodic federal reports
        and peer-reviewed studies, each dated and cited on the{" "}
        <Link href="/supply">Supply</Link> and{" "}
        <Link href="/demand">Demand</Link> pages.
      </div>
    </main>
  );
}
