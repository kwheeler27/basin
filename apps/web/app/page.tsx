import Link from "next/link";
import type { Route } from "next";
import {
  COMBINED_CAPACITY_ACRE_FEET,
  MEAD,
  POWELL,
  RULEBOOK,
} from "@/lib/reservoirs";
import { fetchSeries } from "@/lib/rise";
import { acreFeet, formatDate, percent } from "@/lib/format";
import { CHAPTERS, INSTRUMENTS } from "@/lib/report";

export const revalidate = 3600;
// Pin static despite the no-store RISE fetches (see lib/rise.ts) — data
// updates via page-level ISR, never per-request.
export const dynamic = "force-static";

export default async function FrontDoor() {
  const [powellStor, meadStor] = await Promise.all([
    fetchSeries(POWELL.riseStorageItem),
    fetchSeries(MEAD.riseStorageItem),
  ]);
  const stored =
    powellStor.latest && meadStor.latest
      ? powellStor.latest.value + meadStor.latest.value
      : null;
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
        Basin is a public instrument for understanding that system: what state
        it&rsquo;s in, why, and the records behind every number.
      </p>

      <Link href={"/now" as Route} className="state-strip">
        <div className="stat-row">
          <div className="stat">
            <div className="stat-num">
              {stored !== null
                ? percent((stored / COMBINED_CAPACITY_ACRE_FEET) * 100, 0)
                : "—"}
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
              full system state, tier status &amp; source freshness on Now
            </div>
          </div>
        </div>
      </Link>

      <div className="doorways">
        <section className="doorway">
          <h2 className="section-title">Why: read the report</h2>
          <p className="body-text">
            Eight chapters, in reading order — the whole system, then one
            piece at a time.
          </p>
          <ol className="toc">
            {CHAPTERS.map((c, i) => (
              <li key={c.slug}>
                <Link className="toc-item" href={`/report/${c.slug}` as Route}>
                  <span className="toc-num">{i + 1}</span>
                  <span className="toc-title">{c.title}</span>
                  <span className="toc-q">{c.question}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="doorway">
          <h2 className="section-title">Yourself: explore the data</h2>
          <p className="body-text">
            The instruments — live, zoomable, every view a shareable URL.
          </p>
          <div className="doorway-list">
            {INSTRUMENTS.map((ins) => (
              <Link
                key={ins.slug}
                className="watch-card doorway-card"
                href={`/explore/${ins.slug}` as Route}
              >
                <div className="watch-name">{ins.title} →</div>
                <p className="watch-body">{ins.blurb}</p>
              </Link>
            ))}
          </div>
          <p className="body-text" style={{ marginTop: 12 }}>
            And underneath all of it: <Link href="/data">the Data page</Link>
            {" — "}every dataset&rsquo;s definition, source, accounting concept, and
            freshness, rendered from the measure registry.
          </p>
        </section>
      </div>

      <div className="chain-caveat" style={{ marginTop: 26 }}>
        Sources are named on every figure; federal data is public domain.
        Reservoir storage is live from Reclamation RISE, provisional. A
        reduced-form, independent portrait — not equivalent to
        Reclamation&rsquo;s CRSS models.
      </div>
    </main>
  );
}
