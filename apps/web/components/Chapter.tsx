import Link from "next/link";
import type { Route } from "next";
import { CHAPTERS } from "@/lib/report";

// The reverse edge of IA v3: every chapter names the front-page claim it
// defends and offers the way back (decision record 2026-09-03).
const BEAT_FOR: Record<string, string> = {
  demand: "§1 · what the basin consumes — and §5, the response",
  agriculture: "§1 · most of it grows crops",
  supply: "§2 · what the river produces",
  reservoirs: "§3 · reservoirs cover the deficit",
  infrastructure: "§3 · where the accounts sit",
  "water-rights": "§4 · downward pressure on what may legally be taken",
  distribution: "the argument on the front page",
  "the-system": "the whole argument on the front page",
};

/** Evidence-edge kicker above a chapter's title. */
export function ChapterKicker({ slug }: { slug: string }) {
  const i = CHAPTERS.findIndex((c) => c.slug === slug);
  if (i < 0) return null;
  return (
    <div className="ch-kicker">
      <span className="ch-evidence">
        The evidence behind {BEAT_FOR[slug] ?? "the front page"}
      </span>
      <span> · </span>
      <Link href={"/" as Route}>← back to the argument</Link>
      <span> · </span>
      <Link href={"/report" as Route}>chapter {i + 1} of {CHAPTERS.length}</Link>
    </div>
  );
}

/** Prev/next pager at the foot of every chapter; the last chapter hands off to Explore. */
export function ChapterPager({ slug }: { slug: string }) {
  const i = CHAPTERS.findIndex((c) => c.slug === slug);
  if (i < 0) return null;
  const prev = i > 0 ? CHAPTERS[i - 1]! : null;
  const next = i < CHAPTERS.length - 1 ? CHAPTERS[i + 1]! : null;
  return (
    <nav className="ch-pager" aria-label="Report chapters">
      {prev ? (
        <Link className="ch-pager-link" href={`/report/${prev.slug}` as Route}>
          <span className="ch-pager-dir">← Chapter {i}</span>
          <span className="ch-pager-title">{prev.title}</span>
        </Link>
      ) : (
        <Link className="ch-pager-link" href={"/report" as Route}>
          <span className="ch-pager-dir">← Contents</span>
          <span className="ch-pager-title">The report</span>
        </Link>
      )}
      {next ? (
        <Link className="ch-pager-link next" href={`/report/${next.slug}` as Route}>
          <span className="ch-pager-dir">Chapter {i + 2} →</span>
          <span className="ch-pager-title">{next.title}</span>
        </Link>
      ) : (
        <Link className="ch-pager-link next" href={"/explore" as Route}>
          <span className="ch-pager-dir">End of the report →</span>
          <span className="ch-pager-title">Explore the data yourself</span>
        </Link>
      )}
    </nav>
  );
}
