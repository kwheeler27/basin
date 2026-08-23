import Link from "next/link";
import type { Route } from "next";
import { INSTRUMENTS } from "@/lib/report";

export const metadata = { title: "Explore — Basin" };

export default function ExploreIndex() {
  return (
    <main>
      <h1 className="page-title">Explore</h1>
      <p className="page-lede">
        The instruments — full-page views for poking at the data yourself.
        Every view state is a shareable URL, every number carries its source,
        and each instrument is the evidence behind a{" "}
        <Link href={"/report" as Route}>report chapter</Link>.
      </p>

      <div className="watch-grid">
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

      <div className="note" style={{ marginTop: 26 }}>
        <p>
          <strong>Want the definitions instead?</strong> Every dataset behind
          these instruments — its source, accounting concept, refresh cadence,
          and known incompatibilities — is documented on the{" "}
          <Link href="/data">Data page</Link>, which renders directly from the
          measure registry.
        </p>
      </div>
    </main>
  );
}
