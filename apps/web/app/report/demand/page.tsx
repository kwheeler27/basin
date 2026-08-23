import { Figure } from "@/components/Figure";
import { ChapterKicker, ChapterPager } from "@/components/Chapter";
import {
  APPORTIONMENTS,
  CROPS,
  DEMAND_RECLAMATION,
  DEMAND_RECLAMATION_TOTAL,
  RICHTER,
  SUPPLY,
  STRUCTURAL_DEFICIT,
  UPPER_BASIN_SHARES,
} from "@/lib/system";
import { acreFeet, volumeAnchors } from "@/lib/format";

export const metadata = { title: "Demand — Basin" };

export default function Demand() {
  const anchors = volumeAnchors(CROPS.alfalfaAcreFeet);

  return (
    <main>
      <ChapterKicker slug="demand" />
      <h1 className="page-title">Demand</h1>
      <p className="page-lede">
        Who consumes the water — and the accounting distinctions that make
        published figures appear to contradict each other.
      </p>

      <h2 className="section-title">The accounted balance</h2>
      <p className="body-text">
        On Reclamation&rsquo;s accounting basis, consumption totals{" "}
        <strong>{acreFeet(DEMAND_RECLAMATION_TOTAL)}</strong> a year against a
        modern supply of{" "}
        <strong>{acreFeet(SUPPLY.modernMean.acreFeet)}</strong> — a structural
        deficit of {acreFeet(STRUCTURAL_DEFICIT)}, absorbed by reservoir
        drawdown.
      </p>
      <div className="figure-grid">
        {DEMAND_RECLAMATION.map((d) => (
          <Figure key={d.id} fact={d} />
        ))}
      </div>

      <h2 className="section-title">By sector — a different accounting</h2>
      <div className="warn-box">
        <strong>These do not add to the figures above.</strong> The sector study
        counts all basin consumption including natural riparian vegetation
        ({RICHTER.sectors[1]!.percent}% of its total), which Compact accounting
        excludes entirely. Its total is {acreFeet(RICHTER.totalAcreFeet)};
        Reclamation&rsquo;s is {acreFeet(DEMAND_RECLAMATION_TOTAL)}. Both are
        correct — they answer different questions.
      </div>
      <div className="sector-bars wide">
        {RICHTER.sectors.map((s) => (
          <div key={s.id} className="sector-row">
            <div className="sector-label">
              {s.label}
              <span className="sector-pct">{s.percent}%</span>
            </div>
            <div className="sector-track">
              <div
                className={`sector-fill ${s.id.split(".")[1]}`}
                style={{ width: `${s.percent}%` }}
              />
            </div>
            <div className="sector-note">{s.note}</div>
          </div>
        ))}
      </div>
      <p className="prov" style={{ borderTop: "none" }}>
        {RICHTER.source} · {RICHTER.period}
      </p>

      <h2 className="section-title">Inside agriculture</h2>
      <div className="split">
        <div className="stat-hero">
          <div className="stat-hero-num">{CROPS.alfalfaShareOfBasin}%</div>
          <div className="stat-hero-label">
            of all water consumed in the basin goes to alfalfa alone
          </div>
          <div className="anchors">
            {anchors.map((a) => (
              <span className="anchor" key={a.label}>
                <b>{a.value}</b> {a.label}
                {a.approximate && " (approx.)"}
              </span>
            ))}
          </div>
        </div>
        <div className="note">
          <p>
            Cattle-feed crops — alfalfa and other hay — take{" "}
            <strong>{CROPS.cattleFeedShareOfBasin}%</strong> of all basin water
            and <strong>{CROPS.cattleFeedShareOfAgriculture}%</strong> of
            agricultural water. In the Upper Basin the figure reaches{" "}
            <strong>{CROPS.upperBasinAgToCattleFeed}%</strong>.
          </p>
          <p>{CROPS.note}</p>
          <p className="cite">
            {CROPS.source} · {CROPS.period}
          </p>
        </div>
      </div>

      <h2 className="section-title">Entitlement is not consumption</h2>
      <p className="body-text">
        Apportionments are <em>legal instruments</em>, not measurements. They
        describe what a state may take, not what it does take, and they cannot
        be summed with consumptive-use figures.
      </p>
      <div className="figure-grid">
        {APPORTIONMENTS.map((a) => (
          <Figure key={a.id} fact={a} size="sm" />
        ))}
      </div>
      <div className="note" style={{ marginTop: 16 }}>
        <p>
          <strong>
            The Upper Basin&rsquo;s {acreFeet(UPPER_BASIN_SHARES.totalAcreFeet)}{" "}
            is divided by percentage, not fixed volume.
          </strong>{" "}
          {UPPER_BASIN_SHARES.shares
            .map((s) => `${s.label} ${s.percent}%`)
            .join(" · ")}
        </p>
        <p>{UPPER_BASIN_SHARES.note}</p>
        <p className="cite">{UPPER_BASIN_SHARES.source}</p>
      </div>

      <h2 className="section-title">Why the numbers disagree</h2>
      <div className="note">
        <p>
          <strong>Six words that are not interchangeable:</strong> diversion,
          withdrawal, consumptive use, depletion, return flow, allocation. A
          headline like &ldquo;Arizona uses 2.8 MAF&rdquo; is meaningless
          without saying which of these it means.
        </p>
        <p>
          Reclamation reports <em>consumptive use</em>; USGS reports{" "}
          <em>withdrawals</em>; USDA reports <em>water applied</em>; OpenET
          reports <em>evapotranspiration</em>. Four accounting universes wearing
          the same units. Every figure on this site carries which one it is —
          enforced by the measure registry, not by editorial discipline.
        </p>
      </div>

      <ChapterPager slug="demand" />
    </main>
  );
}
