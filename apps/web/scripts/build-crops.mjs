/**
 * Bake crop composition for the basin's top irrigation counties (Phase A of
 * the Agriculture tab). Source: USDA NASS Cropland Data Layer via the
 * CroplandCROS ImageServer computeHistograms endpoint (no auth; 30m pixels;
 * 0.2224 ac/pixel). Counties chosen by USGS 2015 irrigation withdrawals —
 * the water frame picks the crop frame. Crop AREA only; pairing with water
 * volumes happens at the presentation layer with the concepts kept distinct
 * (DESIGN_PRINCIPLES §5).
 *
 *   node scripts/build-crops.mjs   (run from apps/web)
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const BASE = "https://pdi.scinet.usda.gov/image/rest/services/CDLS_WM_GP/ImageServer";
const YEAR = 2023;
const AC_PER_M2 = 0.000247105;
const TOP_N = 16;
const UA = "Mozilla/5.0 (compatible; basin-project; +kwheeler27@gmail.com)";

const curl = (url, dataArgs = []) =>
  JSON.parse(execFileSync("curl", ["-s", "--max-time", "90", "-A", UA, url, ...dataArgs], { encoding: "utf8", maxBuffer: 1 << 24 }));

// legend: class code -> crop name
// Value -> Class_Names from the service's raster attribute table.
const rat = curl(`${BASE}/rasterAttributeTable?f=json`);
const names = {};
for (const f of rat.features ?? []) {
  const a = f.attributes;
  if (a.Class_Names && a.Class_Names !== "Background") names[a.Value] = a.Class_Names;
}
if (Object.keys(names).length < 50) throw new Error(`RAT parse got ${Object.keys(names).length} classes`);

const wu = JSON.parse(readFileSync("public/geo/county_wateruse.json", "utf8")).counties;
const geo = JSON.parse(readFileSync("public/geo/counties_west.json", "utf8"));
const geomByFips = new Map(geo.features.map((f) => [f.properties.fips, f.geometry]));

const top = [...wu].filter((c) => c.ir !== null && geomByFips.has(c.fips))
  .sort((a, b) => b.ir - a.ir).slice(0, TOP_N);

const FEED_CODES = new Set([36, 37]); // Alfalfa, Other Hay/Non Alfalfa
const out = { source: `USDA NASS Cropland Data Layer ${YEAR} (CroplandCROS ImageServer histogram; 30m pixels, simplified county boundaries)`, year: YEAR, fetched: new Date().toISOString().slice(0, 10), sampling: "adaptive 60-480 m (service caps county-size AOIs; CDL native is 30 m)", counties: [] };

for (const c of top) {
  const g = geomByFips.get(c.fips);
  const rings = g.type === "Polygon" ? g.coordinates : g.coordinates.flat(1);
  const esri = JSON.stringify({ rings, spatialReference: { wkid: 4326 } });
  // County AOIs exceed the service's image cap at native 30m — step the
  // sampling down until it fits; acreage uses the actual pixel size.
  let counts = null, px = 0;
  for (const sz of [60, 120, 240, 480]) {
    const d = curl(`${BASE}/computeHistograms`, [
      "--data-urlencode", `geometry=${esri}`,
      "--data-urlencode", "geometryType=esriGeometryPolygon",
      "--data-urlencode", `mosaicRule={"where":"Year=${YEAR}"}`,
      "--data-urlencode", "inSR=4326",
      "--data-urlencode", `pixelSize={"x":${sz},"y":${sz},"spatialReference":{"wkid":3857}}`,
      "--data-urlencode", "f=json",
    ]);
    if (d.histograms?.[0]?.counts) { counts = d.histograms[0].counts; px = sz; break; }
  }
  if (!counts) throw new Error(`${c.name}: no histogram at any pixel size`);
  const AC_PER_PX = px * px * AC_PER_M2;
  const rows = counts.map((n, code) => ({ code, n })).filter((r) => r.n > 0 && r.code > 0 && names[r.code])
    .filter((r) => !/Developed|Water$|Wetlands|Forest|Shrubland|Barren|Grassland|Aquaculture|Ice|Clouds/i.test(names[r.code]))
    .map((r) => ({ code: r.code, name: names[r.code], acres: Math.round(r.n * AC_PER_PX) }))
    .sort((a, b) => b.acres - a.acres);
  const totalAc = rows.reduce((a, b) => a + b.acres, 0);
  const feedAc = rows.filter((r) => FEED_CODES.has(r.code)).reduce((a, b) => a + b.acres, 0);
  out.counties.push({
    fips: c.fips, county: c.name, st: c.st, irrigationMgd: c.ir, pixelSizeM: px,
    croplandAcres: totalAc, feedForageAcres: feedAc,
    crops: rows.slice(0, 8),
  });
  console.log(`${c.name}, ${c.st}: ${totalAc.toLocaleString()} crop ac, feed ${Math.round((feedAc / totalAc) * 100)}%, top: ${rows[0]?.name}`);
}
writeFileSync("public/geo/crops_counties.json", JSON.stringify(out));
console.log(`→ public/geo/crops_counties.json (${JSON.stringify(out).length / 1024 | 0}KB)`);
