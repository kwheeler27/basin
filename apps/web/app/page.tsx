import Link from "next/link";
import type { Route } from "next";
import { BasinStory } from "@/components/BasinStory";
import {
  COMBINED_CAPACITY_ACRE_FEET,
  MEAD,
  POWELL,
  RULEBOOK,
} from "@/lib/reservoirs";
import { MAP_RESERVOIRS } from "@/lib/mapdata";
import { fetchSeries } from "@/lib/rise";
import { acreFeet, formatDate, percent } from "@/lib/format";
import { CHAPTERS, INSTRUMENTS } from "@/lib/report";

export const revalidate = 3600;
// Pin static despite the no-store RISE fetches (see lib/rise.ts) — data
// updates via page-level ISR, never per-request.
export const dynamic = "force-static";

const JOURNEY = [
  {
    href: "/now" as Route,
    label: "Now",
    q: "What's happening?",
    body: "The live state of the system — reservoir storage, the operating tier in force, and how fresh every source is.",
  },
  {
    href: "/report" as Route,
    label: "Report",
    q: "Why is it happening?",
    body: "Eight chapters in reading order, from the whole system down to single canals — every figure sourced.",
  },
  {
    href: "/explore" as Route,
    label: "Explore",
    q: "Can I see for myself?",
    body: "The instruments: the live map, 333,459 recorded rights, the pumping plants, and a model you can push on.",
  },
  {
    href: "/data" as Route,
    label: "Data",
    q: "Where do the numbers come from?",
    body: "Every dataset's definition, source, accounting concept, and known incompatibilities — the audit surface.",
  },
];

export default async function Landing() {
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

      <section className="landing-hero">
        <div className="landing-kicker">
          A live public picture of the Colorado River
        </div>
        <h1 className="page-title">
          The Colorado River is committed to delivering more water than it
          produces.
        </h1>
        <p className="page-lede">
          Roughly 40 million people and 5 million irrigated acres depend on
          it. Basin shows what state the river is in right now, why it got
          that way, and the government records behind every number. No
          account, no paywall. The map below is live.
        </p>
        <div className="cta-row">
          <Link className="cta primary" href={"/report/the-system" as Route}>
            Start the report →
          </Link>
          <Link className="cta" href={"/now" as Route}>
            See the state of the system
          </Link>
        </div>
      </section>

      <BasinStory storage={liveStorage} variant="explore" />
      <p className="chain-caveat">
        Live reservoir storage from Reclamation RISE, provisional
        {asOf && <> — as of {formatDate(asOf)}</>}. Switch layers, pan, zoom,
        tap anything for its numbers and sources — or open the{" "}
        <Link href={"/explore/map" as Route}>full basin map</Link>.
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
              {" — "}the two largest reservoirs in the country
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
              tier status, thresholds &amp; source freshness on Now
            </div>
          </div>
        </div>
      </Link>

      <h2 className="section-title">How Basin works</h2>
      <p className="body-text">
        Four surfaces, in the order the questions come up. Everything draws on
        the same underlying records, so a number on one surface is the same
        number everywhere — with its source attached.
      </p>
      <div className="journey">
        {JOURNEY.map((j, i) => (
          <Link key={j.label} className="watch-card doorway-card" href={j.href}>
            <div className="watch-place">
              {i + 1} · {j.q}
            </div>
            <div className="watch-name">{j.label} →</div>
            <p className="watch-body">{j.body}</p>
          </Link>
        ))}
      </div>

      <div className="doorways">
        <section className="doorway">
          <h2 className="section-title">The report, chapter by chapter</h2>
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
          <h2 className="section-title">The instruments</h2>
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
        </section>
      </div>

      <h2 className="section-title">What makes it trustworthy</h2>
      <div className="journey">
        <div className="watch-card">
          <div className="watch-name">Primary sources only</div>
          <p className="watch-body">
            Data comes from the agency of record — Reclamation, USGS, USDA,
            the state engineers — never through aggregators. Every figure
            names its source and its date.
          </p>
        </div>
        <div className="watch-card">
          <div className="watch-name">Honest about uncertainty</div>
          <p className="watch-body">
            Observed, estimated, modeled, and administrative numbers are
            visually distinct and never merged. Provisional data says so.
            Missing data renders as a gap, never as zero.
          </p>
        </div>
        <div className="watch-card">
          <div className="watch-name">Independent and open</div>
          <p className="watch-body">
            A reduced-form portrait, independent of and not equivalent to
            Reclamation&rsquo;s CRSS models. The entire pipeline is open
            source —{" "}
            <a href="https://github.com/kwheeler27/basin">
              github.com/kwheeler27/basin
            </a>
            .
          </p>
        </div>
        <div className="watch-card">
          <div className="watch-name">The facts carry the argument</div>
          <p className="watch-body">
            No villains, no imputed motives. Positions are attributed, methods
            are disclosed, and disagreements between agencies are shown rather
            than smoothed over.
          </p>
        </div>
      </div>
    </main>
  );
}
