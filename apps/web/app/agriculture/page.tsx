import { CropMix } from "@/components/CropMix";
import { CROPS_META } from "@/lib/agriculture";

export const metadata = { title: "Agriculture — Basin" };

export default function Agriculture() {
  const m = CROPS_META;
  return (
    <main>
      <h1 className="page-title">Agriculture</h1>
      <p className="page-lede">
        Most of the river&rsquo;s water grows things. This page shows what,
        where — starting with the crop composition of the West&rsquo;s
        sixteen largest irrigation counties, mapped field by field from the
        USDA&rsquo;s satellite crop classification.
      </p>

      <blockquote className="ag-quote">
        <p>
          &ldquo;We find irrigation of cattle-feed crops to be the greatest
          consumer of river water in the western United States, implicating
          beef and dairy consumption as the leading driver of water shortages
          and fish imperilment in the region.&rdquo;
        </p>
        <footer>
          — Richter et al. (2020), <cite>Water scarcity and fish imperilment
          driven by beef production</cite>, Nature Sustainability.{" "}
          <a href="https://doi.org/10.1038/s41893-020-0483-z" target="_blank" rel="noopener noreferrer">
            doi:10.1038/s41893-020-0483-z
          </a>
        </footer>
      </blockquote>

      <h2 className="section-title">What the biggest irrigation counties grow</h2>
      <p className="body-text">
        The sixteen counties below withdraw more water for irrigation than
        any others in the mapped West (USGS county water-use accounting).
        Each bar is that county&rsquo;s cropland by satellite-classified crop
        category, CDL {m.year}. The pattern is stark: in the counties the
        Colorado&rsquo;s canals reach — Imperial, Yuma, Maricopa, Mesa —
        alfalfa and hay lead the mix; the Central Valley counties on this
        list, irrigated from California&rsquo;s own rivers and groundwater,
        grow orchards and vines instead.
      </p>
      <CropMix />
      <div className="chain-caveat" style={{ marginTop: 10 }}>
        Crop acreage: {m.source}, fetched {m.fetched}. Sampling: {m.sampling} —
        acreages are satellite-classification estimates, not survey counts.
        &ldquo;Alfalfa &amp; hay&rdquo; counts CDL classes 36 and 37 only;
        grain fed to livestock is not included in that figure. Category
        groupings are display groupings of CDL classes — the underlying
        classes appear on hover and in the table. Irrigation withdrawals:
        USGS county water-use accounting, shown alongside but never combined
        with acreage.
      </div>

      <div className="note" style={{ marginTop: 26 }}>
        <p>
          <strong>What this page will grow into.</strong> Next: per-crop
          water-requirement context (attributed to its modelers, never
          silently joined to acreage), county-level crop trade flows (USDA
          NASS QuickStats and Census of Agriculture — needs API keys), and
          the livestock link itself — feed grown here, fed where. Each
          addition the way everything on this site is added: from the agency
          of record, with the method disclosed on the figure.
        </p>
      </div>
    </main>
  );
}
