/**
 * Representative-field consumption, 2025 — OpenET ensemble, monthly point ET.
 *
 * Design constraints (Tier 1): 100 requests/month, so this bakes a static
 * artifact (~12-24 calls, re-run monthly at most). Site visitors never touch
 * the quota. Every value is MODELED (satellite ensemble) — surfaced with its
 * own badge, per Kevin's ruling.
 *
 * A point that misses the fields reads like desert (~12 in/yr vs 60+ on
 * irrigated ground), so each district has a fallback coordinate and a
 * minimum plausible annual ET; anything still below threshold ships flagged
 * `uncertain` rather than silently wrong.
 */
import { readFileSync, writeFileSync } from "node:fs";

const KEY = readFileSync(".env.local", "utf8").match(/OPENET_API_KEY=(.+)/)[1].trim();

const DISTRICTS = [
  { id: "imperial", name: "Imperial Valley", st: "CA", min: 40, crops: "winter vegetables, alfalfa, sudangrass",
    pts: [[-115.566, 32.968], [-115.48, 33.05]] },
  { id: "yuma", name: "Yuma Valley", st: "AZ", min: 40, crops: "winter leafy greens (~90% of US supply), wheat, alfalfa",
    pts: [[-114.52, 32.70], [-114.38, 32.72]] },
  { id: "palo_verde", name: "Palo Verde Valley", st: "CA", min: 40, crops: "alfalfa and forage",
    pts: [[-114.62, 33.62], [-114.66, 33.55]] },
  { id: "crit", name: "Colorado River Indian Tribes", st: "AZ", min: 40, crops: "alfalfa, cotton, wheat",
    pts: [[-114.42, 34.02], [-114.38, 33.93]] },
  { id: "coachella", name: "Coachella Valley", st: "CA", min: 35, crops: "dates, table grapes, citrus, peppers",
    pts: [[-116.05, 33.53], [-116.12, 33.62]] },
  { id: "wellton", name: "Wellton-Mohawk", st: "AZ", min: 40, crops: "alfalfa, wheat, vegetables",
    pts: [[-114.15, 32.68], [-114.05, 32.70]] },
  { id: "fort_mojave", name: "Fort Mojave", st: "AZ", min: 40, crops: "alfalfa, cotton",
    pts: [[-114.60, 34.95], [-114.63, 34.88]] },
  { id: "grand_valley", name: "Grand Valley", st: "CO", min: 25, crops: "peaches, wine grapes, alfalfa, corn",
    pts: [[-108.72, 39.17], [-108.50, 39.10]] },
  { id: "uncompahgre", name: "Uncompahgre Valley", st: "CO", min: 22, crops: "corn, alfalfa, onions",
    pts: [[-107.97, 38.62], [-108.08, 38.75]] },
  { id: "yampa", name: "Yampa Valley hay", st: "CO", min: 16, crops: "mountain grass hay",
    pts: [[-106.92, 40.42], [-107.05, 40.48]] },
  { id: "uinta", name: "Uinta Basin", st: "UT", min: 16, crops: "alfalfa and grass hay",
    pts: [[-110.05, 40.25], [-109.85, 40.20]] },
  { id: "upper_green", name: "Upper Green River hay", st: "WY", min: 14, crops: "flood-irrigated meadow hay",
    pts: [[-109.95, 42.45], [-110.05, 42.55]] },
];

let calls = 0;
async function et(lon, lat) {
  calls++;
  // OpenET's GEE backend cold-starts slower than undici's 10s connect
  // timeout; transient connect failures get retried with backoff.
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await etOnce(lon, lat);
    } catch (e) {
      lastErr = e;
      console.log(`  retry ${attempt} [${lon},${lat}]: ${String(e.cause?.code ?? e.message).slice(0, 60)}`);
      await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
  throw lastErr;
}

async function etOnce(lon, lat) {
  // curl transport: OpenET's endpoint connects fine via curl but trips
  // undici's connect timeout from node — proven empirically, not elegant.
  const { execFile } = await import("node:child_process");
  const body = JSON.stringify({
    date_range: ["2025-01-01", "2025-12-31"], interval: "monthly",
    geometry: [lon, lat], model: "Ensemble", variable: "ET",
    reference_et: "gridMET", units: "in", file_format: "JSON",
  });
  const stdout = await new Promise((resolve, reject) => {
    execFile("curl", [
      "-s", "--max-time", "150", "-X", "POST",
      "https://openet-api.org/raster/timeseries/point",
      "-H", `Authorization: ${KEY}`,
      "-H", "Content-Type: application/json",
      "-d", body,
    ], { maxBuffer: 1024 * 1024 }, (err, out) => (err ? reject(err) : resolve(out)));
  });
  const rows = JSON.parse(stdout);
  if (!Array.isArray(rows)) throw new Error(`OpenET: ${stdout.slice(0, 120)}`);
  return rows.map((r) => r.et);
}

const out = [];
for (const d of DISTRICTS) {
  let best = null;
  for (const [lon, lat] of d.pts) {
    const monthly = await et(lon, lat);
    const annual = monthly.reduce((s, v) => s + v, 0);
    const cand = { monthly: monthly.map((v) => Math.round(v * 100) / 100), annual: Math.round(annual * 10) / 10, lon, lat };
    if (!best || cand.annual > best.annual) best = cand;
    if (annual >= d.min) break; // first point landed on fields
    console.log(`  ${d.id}: ${annual.toFixed(1)} in at [${lon},${lat}] < ${d.min} — trying fallback`);
  }
  const quality = best.annual >= d.min ? "field" : "uncertain";
  out.push({ id: d.id, name: d.name, st: d.st, crops: d.crops, quality, ...best });
  console.log(`${d.id}: ${best.annual} in/yr (${quality})`);
}

writeFileSync("public/geo/openet_fields_2025.json", JSON.stringify({
  source:
    "OpenET (NASA/USGS/DRI partnership), ensemble model, monthly actual evapotranspiration at one representative 30m field pixel per district, calendar 2025, inches.",
  epistemic: "modeled",
  fetched: new Date().toISOString().slice(0, 10),
  apiCalls: calls,
  fields: out,
}));
console.log(`\nwrote ${out.length} districts using ${calls} API calls`);
