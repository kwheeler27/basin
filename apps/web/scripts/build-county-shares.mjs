/**
 * Bake: each county's share of irrigation withdrawals INSIDE the watershed
 * (plus the two canal-served valleys) — the numbers that corroborate the
 * landing's "few counties" claim. Mirrors ConsumptionMiniMap's in-basin
 * classification exactly (winding guard + geoContains + CANAL_SERVED);
 * if that logic changes, change both.
 *
 * Run from apps/web:  node scripts/build-county-shares.mjs
 * Output: public/geo/county_irrigation_shares.json (committed).
 */
import fs from "fs";
import { geoArea, geoContains } from "d3-geo";

const wu = JSON.parse(fs.readFileSync("./public/geo/county_wateruse.json"));
const boundary = JSON.parse(
  fs.readFileSync("./public/geo/basin_boundary.geojson"),
);
// Spherical-winding guard: ArcGIS rings wind opposite to d3-geo.
for (const f of boundary.features) {
  if (geoArea(f) > 2 * Math.PI && f.geometry.type === "Polygon") {
    f.geometry.coordinates.forEach((r) => r.reverse());
  }
}
const CANAL_SERVED = new Set(["06025", "06065"]); // Imperial, Coachella (Riverside)

const inBasin = (c) =>
  CANAL_SERVED.has(c.fips) ||
  boundary.features.some((f) => geoContains(f, [c.lon, c.lat]));

const solid = wu.counties.filter((c) => c.ir > 0 && inBasin(c));
const totalMgd = solid.reduce((s, c) => s + c.ir, 0);
const ranked = [...solid]
  .sort((a, b) => b.ir - a.ir)
  .map((c, i) => ({
    fips: c.fips,
    name: c.name,
    st: c.st,
    irMgd: Math.round(c.ir * 10) / 10,
    sharePct: Math.round((c.ir / totalMgd) * 1000) / 10,
    rank: i + 1,
  }));

// Sanity: shares must sum to ~100 and the set must be a strict subset.
const shareSum = ranked.reduce((s, c) => s + c.sharePct, 0);
if (Math.abs(shareSum - 100) > 1) throw new Error(`share sum ${shareSum}`);
if (ranked.length >= wu.counties.length) throw new Error("filter did nothing");

const out = {
  source:
    "USGS county water-use census 2015 (Dieter et al. 2018) — irrigation withdrawals, all sources; in-basin = inside the HUC-14/15 watershed boundary or canal-served (Imperial, Coachella)",
  baked: new Date().toISOString().slice(0, 10),
  countyCount: ranked.length,
  totalMgd: Math.round(totalMgd),
  counties: ranked,
};
fs.writeFileSync(
  "./public/geo/county_irrigation_shares.json",
  JSON.stringify(out, null, 1),
);
console.log(
  `baked ${ranked.length} counties, total ${Math.round(totalMgd)} Mgal/d; top4 = ${ranked
    .slice(0, 4)
    .map((c) => `${c.name} ${c.sharePct}%`)
    .join(", ")}`,
);
