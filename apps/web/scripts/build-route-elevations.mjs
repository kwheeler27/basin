/**
 * Ground-elevation profiles along the two flagship aqueduct corridors —
 * USGS EPQS point samples (1m DEM) at 48 stations along each SCHEMATIC
 * centerline (declared as such; the corridor's terrain, not the canal's
 * exact grade). Pairs with operator lift data in ElevationProfile v2:
 * the land the machine crosses vs the water the machine carries.
 *
 *   node scripts/build-route-elevations.mjs   (run from apps/web)
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const N = 48;
const ROUTES = {
  cra: { miles: 242, path: [[-114.14, 34.3], [-115.4, 33.9], [-116.5, 33.85], [-117.2, 33.95]] },
  cap: { miles: 336, path: [[-114.14, 34.3], [-113.2, 33.85], [-112.07, 33.45], [-110.97, 32.25]] },
};

function along(path, t) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    segs.push(d); total += d;
  }
  let target = t * total;
  for (let i = 1; i < path.length; i++) {
    if (target <= segs[i - 1]) {
      const f = segs[i - 1] ? target / segs[i - 1] : 0;
      return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * f, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * f];
    }
    target -= segs[i - 1];
  }
  return path[path.length - 1];
}

const out = { source: "USGS 3DEP via EPQS point service, sampled along schematic corridor centerlines", fetched: new Date().toISOString().slice(0, 10), routes: {} };
for (const [id, r] of Object.entries(ROUTES)) {
  const samples = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const [lon, lat] = along(r.path, t);
    // curl transport (house precedent: local proxy resets undici)
    let d = {};
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        d = JSON.parse(execFileSync("curl", ["-s", "--max-time", "30", "-A", "basin-project (kwheeler27@gmail.com)", `https://epqs.nationalmap.gov/v1/json?x=${lon.toFixed(5)}&y=${lat.toFixed(5)}&units=Feet&wkid=4326&includeDate=false`], { encoding: "utf8" }));
        break;
      } catch { await new Promise((ok) => setTimeout(ok, 500)); }
    }
    const v = Number(d.value);
    samples.push({ mile: Math.round(t * r.miles), elevFt: Number.isFinite(v) ? Math.round(v) : null });
    await new Promise((ok) => setTimeout(ok, 120));
  }
  const good = samples.filter((s) => s.elevFt !== null).length;
  if (good < N * 0.9) throw new Error(`${id}: only ${good}/${N} elevation samples`);
  out.routes[id] = { miles: r.miles, samples };
  console.log(`${id}: ${good}/${N} samples, ${Math.min(...samples.map((s) => s.elevFt ?? 1e9))}–${Math.max(...samples.map((s) => s.elevFt ?? 0))} ft`);
}
writeFileSync("public/geo/route_elevations.json", JSON.stringify(out));
console.log("→ public/geo/route_elevations.json");
