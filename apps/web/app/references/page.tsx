import { MEASURES } from "@basin/contracts";
import { KIND_LABELS, REFERENCES, type RefKind } from "@/lib/references";

export const metadata = { title: "References — Basin" };

const KIND_ORDER: RefKind[] = ["law", "federal", "state", "research", "geo"];

export default function References() {
  const measures = Object.values(MEASURES);
  // One row per distinct provenance (agency + system), with its measures.
  const bySystem = new Map<string, { agency: string; system: string; ids: string[] }>();
  for (const m of measures) {
    const key = `${m.provenance.agency}|${m.provenance.system}`;
    const e = bySystem.get(key) ?? {
      agency: m.provenance.agency,
      system: m.provenance.system,
      ids: [],
    };
    e.ids.push(m.id);
    bySystem.set(key, e);
  }

  return (
    <main>
      <h1 className="page-title">References</h1>
      <p className="page-lede">
        Everything Basin rests on. Links point to the primary host — the
        agency itself or the paper&rsquo;s DOI — and were verified reachable
        when added. Entries without a link are documents whose agency page
        has no stable address; that gap is stated rather than papered over
        with a secondary source.
      </p>

      {KIND_ORDER.map((kind) => (
        <section key={kind}>
          <h2 className="section-title">{KIND_LABELS[kind]}</h2>
          <ul className="ref-list">
            {REFERENCES.filter((r) => r.kind === kind).map((r) => (
              <li key={r.id} id={r.id} className="ref-item">
                <div className="ref-cite">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      {r.cite}
                    </a>
                  ) : (
                    r.cite
                  )}
                </div>
                <div className="ref-used">
                  {r.used}
                  {r.note && <span className="ref-note"> {r.note}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <h2 className="section-title">Live-ingested series (from the measure registry)</h2>
      <p className="body-text">
        Every live series carries its full provenance — endpoint, cadence,
        unit, accounting concept — in the{" "}
        <a href="/data">measure registry</a>, which this table summarizes.
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Agency · system</th>
              <th>Measures</th>
            </tr>
          </thead>
          <tbody>
            {[...bySystem.values()].map((s) => (
              <tr key={`${s.agency}-${s.system}`}>
                <td>
                  {s.agency} {s.system}
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {s.ids.join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="chain-caveat" style={{ marginTop: 22 }}>
        Federal data is public domain; peer-reviewed figures are cited to
        their DOI (some are paywalled — the DOI still identifies the work).
        Superscript marks like this
        <sup className="cite-sup">[ref]</sup> throughout the site jump to
        entries on this page.
      </div>
    </main>
  );
}
