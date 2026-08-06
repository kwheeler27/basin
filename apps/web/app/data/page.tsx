import { MEASURES, RULEBOOK } from "@basin/contracts";

export const metadata = { title: "Data — Basin" };

/**
 * Rendered directly from the generated measure registry, so it cannot drift
 * from the pipeline. Adding a measure YAML file adds a row here.
 */
export default function Data() {
  const measures = Object.values(MEASURES);

  return (
    <main>
      <h1 className="page-title">Data</h1>
      <p className="page-lede">
        Every measure this system ingests, with its unit, accounting concept,
        epistemic class, cadence, and source. This page is generated from the
        registry — it cannot fall out of sync with the pipeline.
      </p>

      <h2 className="section-title">
        Measures ({measures.length} live-ingested series)
      </h2>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Measure</th>
              <th>Unit</th>
              <th>Accounting concept</th>
              <th>Class</th>
              <th>Cadence</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {measures.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>{m.label}</strong>
                  <span className="mono">{m.id}</span>
                </td>
                <td>{m.canonicalUnit.replace(/_/g, " ")}</td>
                <td>
                  <span className="chip chip-concept">
                    {m.accountingConcept.replace(/_/g, " ")}
                  </span>
                </td>
                <td>
                  <span className={`chip chip-${m.measurementClass}`}>
                    {m.measurementClass}
                  </span>
                </td>
                <td className="mono">{m.freshness.expectedCadence}</td>
                <td>
                  {m.provenance.agency} {m.provenance.system}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">Known incompatibilities</h2>
      <p className="body-text">
        Pairs the registry forbids combining, with the reason. These are
        enforced in code, not left to editorial care.
      </p>
      <div className="incompat">
        {measures.flatMap((m) =>
          m.notComparableWith.map((edge) => (
            <div key={`${m.id}-${edge.measure}`} className="incompat-row">
              <div className="incompat-pair">
                <span className="mono">{m.id}</span>
                <span className="incompat-x">✕</span>
                <span className="mono">{edge.measure}</span>
              </div>
              <div className="incompat-reason">{edge.reason}</div>
            </div>
          )),
        )}
      </div>

      <h2 className="section-title">Operating rulebook</h2>
      <div className="note">
        <p>
          <strong>{RULEBOOK.label}</strong> (<code>{RULEBOOK.version}</code>) —
          effective {RULEBOOK.effectiveFrom} through {RULEBOOK.effectiveTo}.
        </p>
        <p>
          <strong>Trigger:</strong> {RULEBOOK.trigger}
        </p>
        <p className="cite">{RULEBOOK.authority}</p>
        <ul className="rule-notes">
          {RULEBOOK.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>

      <h2 className="section-title">Not yet ingested</h2>
      <div className="note">
        <p>
          Supply, demand, and sector figures elsewhere on this site come from
          periodic federal reports and peer-reviewed studies rather than live
          feeds. They are cited individually but are <strong>not</strong> yet in
          the registry or the pipeline.
        </p>
        <p>
          Known gaps: the 24-Month Study is PDF-only (archive runs 2010–present,
          ~190 studies, parseable with era-specific handling); CBRFC seasonal
          forecasts have no API; basin-level snowpack percentages must be
          computed from station data because NRCS publishes only a map product;
          and Reclamation&rsquo;s naturalized-flow dataset is stale at a
          September 2024 vintage.
        </p>
      </div>
    </main>
  );
}
