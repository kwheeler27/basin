import {
  RULEBOOK,
  SUCCESSOR,
  determineMead,
  determinePowell,
  determinePowellRange,
} from "@basin/contracts";
import { acreFeet, feet, formatDate } from "@/lib/format";
import { OFFICIAL_24MS } from "@/lib/projections";

const MAF = 1_000_000;
const maf = (af: number) => `${(af / MAF).toFixed(2)} MAF`;

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

      <div className="note" style={{ marginTop: 14 }}>
        <p>
          <strong>The official projection.</strong> Reclamation&rsquo;s{" "}
          <a href={OFFICIAL_24MS.url}>{OFFICIAL_24MS.edition}</a> (revised{" "}
          {formatDate(OFFICIAL_24MS.revised)}) projects January 1, 2027
          elevations of <strong>{feet(OFFICIAL_24MS.powellJan1Ft)}</strong> at
          Powell and <strong>{feet(OFFICIAL_24MS.meadJan1Ft)}</strong> at Mead
          — at those elevations this rulebook reads{" "}
          <em>{determinePowell(OFFICIAL_24MS.powellJan1Ft, OFFICIAL_24MS.meadJan1Ft).tier}</em>{" "}
          and <em>{determineMead(OFFICIAL_24MS.meadJan1Ft).tierLabel}</em>.
          These tier readings illustrate the expiring rulebook only — what
          replaces it is below.
        </p>
        <p>{OFFICIAL_24MS.notes}</p>
      </div>

      {(() => {
        const og = determinePowellRange(OFFICIAL_24MS.powellOct1Ft);
        return (
          <div className="og-panel">
            <div className="card-head" style={{ marginTop: 18 }}>
              <h2 className="card-title" style={{ fontSize: 16 }}>
                The new rules: Operating Years 2027–2028
              </h2>
              <span className="card-sub">{SUCCESSOR.version}</span>
            </div>
            <p className="card-sub" style={{ marginBottom: 12 }}>
              Issued with the Post-2026 Record of Decision on August 21,
              2026. A different machine from the old tiers: Powell is set by
              range and a release ladder tested against a protection
              elevation; Mead is a fixed determination, not an
              elevation table.
            </p>
            <div className="rules-split">
              <div>
                <div className="readout-label">
                  Lake Powell — WY2027 operational range
                </div>
                <div className="readout-value" style={{ fontSize: 17, marginTop: 4 }}>
                  {og.rangeName}
                </div>
                <div className="subline" style={{ marginTop: 6, fontSize: 13 }}>
                  At the study&rsquo;s projected October 1, 2026 elevation of{" "}
                  {feet(OFFICIAL_24MS.powellOct1Ft)}. Initial release
                  evaluated from{" "}
                  {og.releaseLadderAf.map((af) => maf(af)).join(" → ")},
                  adjustable down to {maf(og.releaseFloorAf)} to hold{" "}
                  {og.protectionTargetFt.toLocaleString()} ft; consultation
                  if projected below {og.criticalFt.toLocaleString()} ft.
                </div>
                <div className="prov" style={{ borderTop: "none", paddingTop: 8 }}>
                  {og.note}
                </div>
              </div>
              <div>
                <div className="readout-label">
                  Lake Mead — CY2027 &amp; CY2028
                </div>
                <div className="readout-value" style={{ fontSize: 17, marginTop: 4 }}>
                  {SUCCESSOR.meadCondition}
                </div>
                <table className="rules-table">
                  <tbody>
                    {SUCCESSOR.meadApportionments.map((a) => (
                      <tr key={a.party}>
                        <td>
                          {a.party.charAt(0).toUpperCase() + a.party.slice(1)}
                          <span className="rules-note">
                            −{acreFeet(a.reductionAf)} from Normal
                          </span>
                        </td>
                        <td className="num">{acreFeet(a.apportionmentAf)}</td>
                      </tr>
                    ))}
                    <tr className="total">
                      <td>Lower Division total — fixed, each year</td>
                      <td className="num">
                        {acreFeet(SUCCESSOR.meadTotalApportionmentAf)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="subline" style={{ marginTop: 6, fontSize: 13 }}>
                  Plus {acreFeet(SUCCESSOR.additionalSystemConservationTotalAf)}{" "}
                  of additional System Conservation in total across
                  2026&ndash;2028. Mexico&rsquo;s reductions are determined
                  separately by the IBWC under treaty Minutes; Minute 323
                  expires December 31, 2026.
                </div>
              </div>
            </div>
            <div className="prov">
              <div>
                {SUCCESSOR.label} — covers Operating Years 2027&ndash;2028
                (Powell WY2027 begins {SUCCESSOR.effectiveFrom}; Mead CY2028
                ends {SUCCESSOR.effectiveTo}). Effectiveness is conditional
                (§3): it requires execution by the Secretary and of the
                implementing and parallel agreements — absent those, the
                Secretary proceeds under the guidelines&rsquo; own default
                paths.
              </div>
              <div style={{ marginTop: 4 }}>{SUCCESSOR.authority}</div>
              <div style={{ marginTop: 4 }}>
                The state split assumes the Lower Basin implementing
                agreements execute; absent them, the Secretary apportions the
                same 6.25 MAF total under applicable law (§5.3.A.3). These
                guidelines are not a precedent for future operations and can
                be superseded by consensus guidelines.
              </div>
            </div>
          </div>
        );
      })()}

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
