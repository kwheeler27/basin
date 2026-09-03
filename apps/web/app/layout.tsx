import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Basin — Colorado River",
  description:
    "A data-driven portrait of the Colorado River system: where the water comes from, who uses it, and why commitments exceed supply. Reduced-form and independent.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="masthead">
            <Link href="/" className="wordmark">
              Basin
            </Link>
            <span className="basin-name">Colorado River</span>
            <span className="tagline">
              A reduced-form portrait. Independent of, and not equivalent to,
              Reclamation&rsquo;s CRSS models.
            </span>
          </header>
          <Nav />
          {children}
          <footer>
            <div>
              Sources are named on every figure. Federal data is public domain;
              peer-reviewed figures are cited to their DOI.
            </div>
            <div>
              Every source: <a href="/references">References</a>.{" "}
              Every term, in plain language: <a href="/glossary">Glossary</a>.{" "}
              Definitions, units, and provenance come from the measure registry
              (<code>packages/registry</code>). Source at{" "}
              <a href="https://github.com/kwheeler27/basin">
                github.com/kwheeler27/basin
              </a>
              .
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
