import { CanalChart, type CanalData } from "@/components/CanalChart";
import canal from "@/public/geo/canal_gvc_2025.json";
import { acreFeet } from "@/lib/format";
import { HOUSEHOLD_ACRE_FEET_PER_YEAR } from "@/lib/format";

export const metadata = { title: "Distribution — Basin" };

export default function Distribution() {
  const households = Math.round(canal.totalAf / HOUSEHOLD_ACRE_FEET_PER_YEAR / 1000);

  return (
    <main>
      <h1 className="page-title">Distribution</h1>
      <p className="page-lede">
        Between the reservoirs and the fields sits a century-old network of
        headgates, canals, and laterals — each one a public record. This is the
        first: one canal, one season, measured daily.
      </p>

      <section className="fieldnote">
        <div className="fieldnote-kicker">Field note № 1 · Grand Valley, Colorado</div>
        <h2 className="fieldnote-hed">
          One canal&rsquo;s year, measured at the headgate.
        </h2>
        <p className="body-text">
          The <strong>{canal.name}</strong> has drawn Colorado River water onto
          the orchards, vineyards, and hayfields around Grand Junction under
          rights dating to <strong>1882</strong> — forty years before the
          Compact. Colorado&rsquo;s water commissioners record its diversion
          every day, and those records are public. Here is its {canal.season}:
        </p>

        <div className="stat-row">
          <div className="stat">
            <div className="stat-num">{acreFeet(canal.totalAf)}</div>
            <div className="stat-label">diverted over the season — roughly {households},000 households&rsquo; annual water</div>
          </div>
          <div className="stat">
            <div className="stat-num">{Math.round(canal.peakCfs)} cfs</div>
            <div className="stat-label">peak flow, on the Fourth of July — when crops drink hardest</div>
          </div>
          <div className="stat">
            <div className="stat-num">212 days</div>
            <div className="stat-label">headgate open, April 2 to October 30</div>
          </div>
        </div>

        <CanalChart data={canal as unknown as CanalData} />

        <div className="note" style={{ marginTop: 18 }}>
          <p>
            <strong>What this is — and isn&rsquo;t.</strong> This is a{" "}
            <em>diversion</em>: water leaving the river at one headgate. Much of
            it returns downstream as seepage and tailwater, so it is larger than
            what the valley&rsquo;s crops actually consumed. And the canal is a
            mutual-company structure serving many farms — below the headgate,
            attribution isn&rsquo;t knowable from public records, which is also
            where we choose to stop: structures, not individuals.
          </p>
          <p>
            One headgate can also carry more than one legal &ldquo;water
            class&rdquo; — this series is the irrigation class only. Summing
            every class at a headgate double-counts, a trap encoded in the{" "}
            <a href="/data">measure registry</a> so it can only be made once.
          </p>
        </div>

        <div className="prov" style={{ borderTop: "none", marginTop: 14 }}>
          <span className="clock-badge clock-live" style={{ marginRight: 8 }}>
            DAILY RECORD · provisional
          </span>
          Colorado Division of Water Resources, CDSS — daily diversion records,
          WDID {canal.wdid}, irrigation water class. Snapshot {canal.fetched};
          every record carries the commissioners&rsquo; approval status.
        </div>
      </section>

      <div className="note" style={{ marginTop: 26 }}>
        <p>
          <strong>Why this page exists.</strong> Colorado is the only basin
          state whose water records have a real public API, which makes
          structure-level stories like this one possible today. More field
          notes will follow — other canals, the transbasin tunnels, treatment
          and reuse — each built the same way: primary records, daily grain,
          honest about what the record can and cannot say.
        </p>
      </div>
    </main>
  );
}
