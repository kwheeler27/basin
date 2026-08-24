import Link from "next/link";
import type { Route } from "next";
import { CHAPTERS } from "@/lib/report";

export const metadata = { title: "The Report — Basin" };

export default function ReportIndex() {
  return (
    <main>
      <h1 className="page-title">The report</h1>
      <p className="page-lede">
        Why the Colorado River system is where it is — eight chapters, in
        reading order, each answering one question. Every figure carries its
        source, and every chart links into the{" "}
        <Link href={"/explore" as Route}>instruments</Link> where you can
        check it yourself.
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

      <div className="note" style={{ marginTop: 26 }}>
        <p>
          <strong>How to read it.</strong> The chapters build on each other —
          chapter 1 is the whole system in five scenes; the rest take one
          piece at a time. But each stands alone, so start where your
          question is. For the live numbers as of today, see{" "}
          <Link href={"/current-state" as Route}>Current state</Link>; for definitions, units,
          and provenance of every dataset, see{" "}
          <Link href="/data">Data</Link>.
        </p>
      </div>
    </main>
  );
}
