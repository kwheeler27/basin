import { Figure } from "@/components/Figure";
import {
  COLORADO_TRANSBASIN,
  COLORADO_TRANSBASIN_TOTAL,
  MEGADROUGHT,
  SUPPLY,
  TEMPERATURE_SENSITIVITY,
  TRANSBASIN_NOTE,
} from "@/lib/system";
import { acreFeet } from "@/lib/format";

export const metadata = { title: "Supply — Basin" };

const SERIES = [
  SUPPLY.compactAssumption,
  SUPPLY.observedMean,
  SUPPLY.reconstructedMean,
  SUPPLY.modernMean,
];

export default function Supply() {
  const max = Math.max(...SERIES.map((s) => s.acreFeet));

  return (
    <main>
      <h1 className="page-title">Supply</h1>
      <p className="page-lede">
        Everything begins as snow. What reaches the river depends not only on
        how much falls, but on how warm the year is — and that relationship has
        been changing.
      </p>

      <h2 className="section-title">Four numbers for &ldquo;how big is the river&rdquo;</h2>
      <p className="body-text">
        These measure different things over different periods, which is why
        published figures appear to disagree. Drawn to the same scale:
      </p>

      <div className="compare">
        {SERIES.map((s) => (
          <div key={s.id} className="compare-row">
            <div className="compare-label">{s.label}</div>
            <div className="compare-track">
              <div
                className={`compare-fill epi-${s.epistemic}`}
                style={{ width: `${(s.acreFeet / max) * 100}%` }}
              />
              <span className="compare-num">{acreFeet(s.acreFeet)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="figure-grid">
        {SERIES.map((s) => (
          <Figure key={s.id} fact={s} />
        ))}
      </div>

      <h2 className="section-title">Why it&rsquo;s shrinking</h2>
      <div className="split">
        <div className="note">
          <p>
            <strong>
              About {TEMPERATURE_SENSITIVITY.percentPerDegreeC}% of flow is lost
              per °C of warming.
            </strong>{" "}
            {TEMPERATURE_SENSITIVITY.mechanism}
          </p>
          <p className="cite">{TEMPERATURE_SENSITIVITY.source}</p>
        </div>
        <div className="note">
          <p>
            <strong>{MEGADROUGHT.label}.</strong> {MEGADROUGHT.note}
          </p>
          <p className="cite">{MEGADROUGHT.source}</p>
        </div>
      </div>
      <p className="body-text">
        The practical consequence is that snowpack no longer predicts runoff the
        way it once did. A normal snow year can still produce a below-normal
        river, because warmer soil and air take their share first. Quantifying
        that relationship is the hardest part of the model still to be built.
      </p>

      <h2 className="section-title">Water that leaves the basin entirely</h2>
      <p className="body-text">{TRANSBASIN_NOTE}</p>
      <div className="figure-grid">
        {COLORADO_TRANSBASIN.map((t) => (
          <Figure key={t.id} fact={t} size="sm" />
        ))}
      </div>
      <p className="body-text">
        Together roughly <strong>{acreFeet(COLORADO_TRANSBASIN_TOTAL)}</strong> a
        year crosses the Continental Divide to the Front Range — where most of
        Colorado&rsquo;s population lives. Denver&rsquo;s tap water is, in
        substantial part, Colorado River water that never reaches the Colorado
        River&rsquo;s lower reaches.
      </p>

      <div className="chain-caveat">
        Transbasin figures are aggregated from project-level reporting; no
        single canonical source publishes the combined total. Denver Water
        publishes daily diversion readings, but only as PDFs — one of several
        places where the pipeline still needs building.
      </div>
    </main>
  );
}
