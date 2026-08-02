import { RULEBOOK, determineMead, determinePowell } from "@basin/contracts";
import { acreFeet, feet } from "@/lib/format";

/**
 * What the operating rules say at today's observed elevations.
 *
 * IMPORTANT framing: the rules are legally triggered by the PROJECTED
 * January 1 elevation from the August 24-Month Study, not by a current
 * reading. This panel shows what the rulebook would say at today's
 * elevations — an illustration of the rules, not an official determination.
 * That distinction is stated on the page, not buried here.
 */
export function RulesToday({
  powellElevation,
  meadElevation,
}: {
  powellElevation: number;
  meadElevation: number;
}) {
  const powell = determinePowell(powellElevation, meadElevation);
  const mead = determineMead(meadElevation);

  const parties: { label: string; af: number; note?: string }[] = [
    { label: "Arizona", af: mead.arizona },
    { label: "Nevada", af: mead.nevada },
    { label: "California", af: mead.california },
    {
      label: "Mexico — delivery reduction",
      af: mead.mexicoReduction,
      note: "Minute 323 §III.A · unrecoverable",
    },
    {
      label: "Mexico — water savings",
      af: mead.mexicoSavings,
      note: "Minute 323 §IV · recoverable when Mead is projected ≥ 1,110 ft",
    },
  ];

  return (
    <section className="card" style={{ marginTop: 18 }}>
      <div className="card-head">
        <h2 className="card-title">What the rules say</h2>
        <span className="card-sub">{RULEBOOK.version}</span>
      </div>
      <p className="card-sub" style={{ marginBottom: 14 }}>
        Applied to today&rsquo;s <em>observed</em> elevations. Official
        determinations use the <strong>projected January 1</strong> elevation
        from the August 24-Month Study — so this illustrates the rulebook, it
        is not a shortage declaration.
      </p>

      <div className="rules-split">
        <div>
          <div className="readout-label">Lake Powell release tier</div>
          <div className="readout-value" style={{ fontSize: 17, marginTop: 4 }}>
            {powell.tier}
          </div>
          <div className="subline" style={{ marginTop: 6, fontSize: 13 }}>
            {powell.releaseAf !== null ? (
              <>Annual release {acreFeet(powell.releaseAf)}</>
            ) : (
              <>
                Balance contents within {acreFeet(powell.balancingRange![0])}–
                {acreFeet(powell.balancingRange![1])}
              </>
            )}
            {powell.releaseAf === null && (
              <span style={{ color: "var(--faint)" }}>
                {" "}
                · midpoint {acreFeet(powell.releaseOrMidpoint)} used for
                modeling (our assumption, not a legal figure)
              </span>
            )}
          </div>
          {powell.meadOverrideApplied && (
            <div className="rules-flag">
              Mead-coupled override active — Powell&rsquo;s release changed
              because of Lake Mead&rsquo;s elevation. The two reservoirs are one
              system.
            </div>
          )}
          <div className="prov" style={{ borderTop: "none", paddingTop: 8 }}>
            at {feet(powellElevation)}
          </div>
        </div>

        <div>
          <div className="readout-label">Lake Mead condition</div>
          <div className="readout-value" style={{ fontSize: 17, marginTop: 4 }}>
            {mead.tierLabel}
          </div>
          <table className="rules-table">
            <tbody>
              {parties.map((p) => (
                <tr key={p.label} className={p.af === 0 ? "zero" : undefined}>
                  <td>
                    {p.label}
                    {p.note && <span className="rules-note">{p.note}</span>}
                  </td>
                  <td className="num">
                    {p.af === 0 ? "—" : acreFeet(p.af)}
                  </td>
                </tr>
              ))}
              <tr className="total">
                <td>U.S. Lower Basin total</td>
                <td className="num">{acreFeet(mead.usLowerBasin)}</td>
              </tr>
            </tbody>
          </table>
          <div className="prov" style={{ borderTop: "none", paddingTop: 8 }}>
            at {feet(meadElevation)}
          </div>
        </div>
      </div>

      <div className="prov">
        <div>
          {RULEBOOK.label} — expires {RULEBOOK.effectiveTo}.
        </div>
        <div style={{ marginTop: 4 }}>
          Verified against primary documents: {RULEBOOK.authority}
        </div>
        <div style={{ marginTop: 4 }}>
          Mexico&rsquo;s two mechanisms are shown separately because they are
          legally distinct — §IV savings are recoverable, §III.A reductions are
          not. Summing them is the error that made secondary sources
          irreconcilable.
        </div>
      </div>
    </section>
  );
}
