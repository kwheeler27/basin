import { ReservoirCard } from "@/components/ReservoirCard";
import {
  COMBINED_CAPACITY_ACRE_FEET,
  MEAD,
  MODERN_ANNUAL_FLOW_ACRE_FEET,
  MODERN_FLOW_BASIS,
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
  volumeAnchors,
} from "@/lib/format";

export const revalidate = 3600;

export default async function Today() {
  // Four independent series, fetched concurrently.
  const [powellElev, powellStor, meadElev, meadStor] = await Promise.all([
    fetchSeries(POWELL.riseElevationItem),
    fetchSeries(POWELL.riseStorageItem),
    fetchSeries(MEAD.riseElevationItem),
    fetchSeries(MEAD.riseStorageItem),
  ]);

  const combinedNow =
    powellStor.latest && meadStor.latest
      ? powellStor.latest.value + meadStor.latest.value
      : null;
  const combinedYearAgo =
    powellStor.yearAgo && meadStor.yearAgo
      ? powellStor.yearAgo.value + meadStor.yearAgo.value
      : null;
  const combinedPct =
    combinedNow !== null
      ? (combinedNow / COMBINED_CAPACITY_ACRE_FEET) * 100
      : null;
  const deltaPct =
    combinedNow !== null && combinedYearAgo !== null
      ? ((combinedNow - combinedYearAgo) / COMBINED_CAPACITY_ACRE_FEET) * 100
      : null;

  const emptyAf =
    combinedNow !== null ? COMBINED_CAPACITY_ACRE_FEET - combinedNow : null;

  const asOf = powellStor.latest?.date ?? meadStor.latest?.date ?? null;

  return (
    <main className="shell">
      <header className="masthead">
        <span className="wordmark">Basin</span>
        <span className="basin-name">Colorado River</span>
        <span className="tagline">
          A reduced-form digital twin. Independent of, and not equivalent to,
          Reclamation&rsquo;s CRSS models.
        </span>
      </header>

      <div className="rulebook">
        <span>⚠</span>
        <div>
          <strong>Operating rules in force:</strong> {RULEBOOK.label} — expires{" "}
          {formatDate(RULEBOOK.expires)}.{" "}
          <span className="muted">
            {RULEBOOK.successorStatus} Current status: {RULEBOOK.currentTier}.{" "}
            {RULEBOOK.tierBasis}
          </span>
        </div>
      </div>

      <section className="hero">
        <div className="hero-top">
          <div>
            <p className="question">How much water is in the system today?</p>
            {combinedNow !== null && combinedPct !== null ? (
              <>
                <div className="bignum">
                  {percent(combinedPct, 1)}
                  <small>of combined capacity</small>
                </div>
                <div className="subline">
                  {acreFeet(combinedNow)} of{" "}
                  {acreFeet(COMBINED_CAPACITY_ACRE_FEET)} in Lakes Powell and Mead
                  {deltaPct !== null && (
                    <>
                      {" · "}
                      <span className={deltaPct < 0 ? "down" : "up"}>
                        {signed(deltaPct, (n) => `${n.toFixed(1)} pts`)} in one year
                      </span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <p className="err">
                Live storage unavailable. Showing no value rather than a stale one.
              </p>
            )}
          </div>
        </div>

        {combinedPct !== null && combinedNow !== null && (
          <>
            <div className="capbar">
              <div
                className="capbar-fill"
                style={{ width: `${Math.max(0, Math.min(100, combinedPct))}%` }}
              />
              <div className="capbar-label">
                {emptyAf !== null && `${acreFeet(emptyAf)} of unused capacity`}
              </div>
            </div>
            <div className="anchors">
              <span className="anchor" style={{ borderColor: "var(--water)" }}>
                what&rsquo;s actually stored
              </span>
              {volumeAnchors(combinedNow).map((a) => (
                <span className="anchor" key={a.label}>
                  <b>{a.value}</b> {a.label}
                  {a.approximate && " (approx.)"}
                </span>
              ))}
            </div>
            <p
              className="subline"
              style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}
            >
              That is roughly{" "}
              <strong>
                {(combinedNow / MODERN_ANNUAL_FLOW_ACRE_FEET).toFixed(2)}×
              </strong>{" "}
              the river&rsquo;s modern annual flow — the two largest reservoirs in
              the United States together hold about{" "}
              {combinedNow / MODERN_ANNUAL_FLOW_ACRE_FEET < 1.15 &&
              combinedNow / MODERN_ANNUAL_FLOW_ACRE_FEET > 0.85
                ? "one year"
                : `${(combinedNow / MODERN_ANNUAL_FLOW_ACRE_FEET).toFixed(1)} years`}{" "}
              of what the river now produces.{" "}
              <span style={{ color: "var(--faint)" }}>
                Flow reference {MODERN_FLOW_BASIS}; approximate, and not yet
                verified against Reclamation&rsquo;s naturalized-flow dataset.
              </span>
            </p>
          </>
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

      <h2 className="section-title">What this is, and what it isn&rsquo;t</h2>
      <div className="note">
        <p>
          Every number above is <strong>observed</strong> — measured pool
          elevation from Reclamation&rsquo;s RISE system, with storage derived
          from elevation via each reservoir&rsquo;s area-capacity table. Nothing
          here is modeled or forecast yet.
        </p>
        <p>
          <strong>All of it is provisional.</strong> Reclamation revises recent
          values without announcement — on 2026-08-01 the entire prior week of
          daily readings carried fresh revision stamps. Operating figures move
          too: Lake Powell&rsquo;s water-year 2026 release was set at 7.48 MAF in
          August 2025 and revised down to 6.00 MAF in April 2026.
        </p>
        <p>
          Still to come: the water-balance flow from snowpack through releases,
          a mass-balance model with the operating rules encoded, one what-if
          slider, and a public backtest of that model against Reclamation&rsquo;s
          published 24-Month Study projections.
        </p>
      </div>

      <footer>
        <div>
          Source: U.S. Bureau of Reclamation,{" "}
          <a href="https://data.usbr.gov/">
            Reclamation Information Sharing Environment (RISE)
          </a>{" "}
          — Lake Powell catalog record 2362, Lake Mead record 4370. Public-domain
          U.S. government data.
        </div>
        <div>
          {asOf && <>Data as of {formatDate(asOf)}. </>}
          Page rendered {formatTimestamp(new Date().toISOString())}; revalidates
          every {REVALIDATE_SECONDS / 60} minutes.
        </div>
        <div>
          Definitions, units, provenance and caveats come from the measure
          registry (<code>packages/registry</code>). Source at{" "}
          <a href="https://github.com/kwheeler27/basin">github.com/kwheeler27/basin</a>.
        </div>
      </footer>
    </main>
  );
}
