import Link from "next/link";
import type { Route } from "next";
import { CHAPTERS } from "@/lib/report";

/** "Report · Chapter N of 8" kicker above a chapter's title. */
export function ChapterKicker({ slug }: { slug: string }) {
  const i = CHAPTERS.findIndex((c) => c.slug === slug);
  if (i < 0) return null;
  return (
    <div className="ch-kicker">
      <Link href={"/report" as Route}>The report</Link>
      <span> · chapter {i + 1} of {CHAPTERS.length}</span>
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
