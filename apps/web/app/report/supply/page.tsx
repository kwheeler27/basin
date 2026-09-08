import { Figure } from "@/components/Figure";
import { ChapterKicker, ChapterPager } from "@/components/Chapter";
import { Cite } from "@/components/Cite";
import { SnowFlowScatter } from "@/components/SnowFlowScatter";
import {
  COLORADO_TRANSBASIN,
  COLORADO_TRANSBASIN_TOTAL,
  MEGADROUGHT,
  SUPPLY,
  TEMPERATURE_SENSITIVITY,
  TRANSBASIN_NOTE,
} from "@/lib/system";
import {
  AWAITING_FLOW,
  ERA_SPLIT,
  FLOW_PROV_META,
  GAP_AT_MEDIAN_AF,
  POST_BELOW_PRE,
  POST_FIT,
  PRE_FIT,
  SAME_SNOW_LESS_RIVER,
} from "@/lib/snowflow";
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
      <ChapterKicker slug="supply" />
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
      <h2 className="section-title">
        {SAME_SNOW_LESS_RIVER
          ? "The same snow now buys less river"
          : "Snow in, river out, year by year"}
      </h2>
      <p className="body-text">
        Each point is one water year: how much snow the mountains held on
        April 1 (as a share of the typical year), against how much river that
        snow became. The trade has worsened.{" "}
        {POST_BELOW_PRE && PRE_FIT && (
          <>
            In <strong>{POST_BELOW_PRE.count}</strong>
            {" "}of the {POST_BELOW_PRE.total} water years since {ERA_SPLIT},
            the river produced less water than the same snowpack yielded
            before {ERA_SPLIT} (the slate dashed line).
          </>
        )}{" "}
        {GAP_AT_MEDIAN_AF !== null && PRE_FIT && POST_FIT && (
          <>
            At a median snowpack, the two straight-line fits are about{" "}
            <strong>
              {(GAP_AT_MEDIAN_AF / 1_000_000).toFixed(1)}
              {" "}million acre-feet
            </strong>
            {" "}apart —{" "}
            {(PRE_FIT.atMedianAf / 1_000_000).toFixed(1)}
            {" "}MAF then, {(POST_FIT.atMedianAf / 1_000_000).toFixed(1)}
            {" "}MAF now. Warmer soil and air take their share before the
            gauge does.
          </>
        )}
      </p>
      <SnowFlowScatter />
      <div className="chain-caveat">
        Two accountings meet here and are only ever paired, never summed:
        the horizontal axis is the NRCS basin snowpack index (% of station
        median, the same 137-station roster as the chart above)
        <Cite id="awdb" />; the vertical axis is Reclamation&rsquo;s
        naturalized flow at Lees Ferry — computed, not gauged, and
        revisable<Cite id="naturalflow" />. Flow for WY2021&ndash;2024 is
        from Reclamation&rsquo;s provisional workbook
        <Cite id="nfprov" /> ({FLOW_PROV_META.vintage ?? "provisional"})
        and draws hollow until the final record catches up.
        {AWAITING_FLOW.length > 0 && (
          <>
            {" "}WY{AWAITING_FLOW.join(" and WY")} have snow readings but no
            published flow yet, so they appear nowhere.
          </>
        )}{" "}
        The dashed lines are least-squares fits drawn as reading aids, not
        a hydrology model; using this relationship predictively inside the
        scenario model remains future work.
      </div>

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

      <ChapterPager slug="supply" />
    </main>
  );
}
