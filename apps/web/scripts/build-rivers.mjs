/**
 * Bake river flow profiles for the Overview's tappable rivers.
 *
 * One representative USGS gauge per named river in basin_rivers.geojson,
 * sited where the river feeds its principal storage: daily mean discharge
 * (00060/00003) since WY2001 → monthly-mean series + mean annual volume.
 * Values arrive as strings (documented USGS OGC gotcha); provisional data
 * is included and labeled at the presentation layer.
 *
 *   node scripts/build-rivers.mjs   (run from apps/web)
 */
import { writeFileSync } from "node:fs";

const BASE = "https://api.waterdata.usgs.gov/ogcapi/v0/collections/daily/items";
const START = "2000-10-01"; // WY2001 onward
const AF_PER_CFS_DAY = 1.983471;

const RIVERS = [
  { key: "colorado", name: "Colorado River", gauge: "09180500", gaugeName: "Colorado River near Cisco, UT", feeds: ["powell", "mead", "mohave", "havasu"], downstream: "Joins the Green in Canyonlands, backs into Lake Powell, is re-released at Glen Canyon through the Grand Canyon into Lake Mead, then Mohave and Havasu — where the aqueducts to Arizona and California take over." },
  { key: "green", name: "Green River", gauge: "09315000", gaugeName: "Green River at Green River, UT", feeds: ["fontenelle", "flaming_gorge"], downstream: "Rises in Wyoming's Wind River Range, is regulated at Fontenelle and Flaming Gorge, gathers the Yampa and White, and delivers the largest single share of Lake Powell's inflow at its confluence with the Colorado." },
  { key: "sanjuan", name: "San Juan River", gauge: "09379500", gaugeName: "San Juan River near Bluff, UT", feeds: ["navajo"], downstream: "Regulated at Navajo Reservoir near the Colorado–New Mexico line, crosses the Navajo Nation, and enters Lake Powell's San Juan arm." },
  { key: "gila", name: "Gila River", gauge: "09520500", gaugeName: "Gila River near Dome, AZ", feeds: [], downstream: "Drains most of southern Arizona and western New Mexico; by this gauge, near the Colorado confluence at Yuma, the river's flow is typically near zero — its water is appropriated upstream." },
];

async function fetchDaily(gauge) {
  const rows = [];
  let url = `${BASE}?monitoring_location_id=USGS-${gauge}&parameter_code=00060&statistic_id=00003&datetime=${START}/..&f=json&limit=10000`;
  while (url) {
    const res = await fetch(url, { headers: { "User-Agent": "basin-project (kwheeler27@gmail.com)" } });
    if (!res.ok) throw new Error(`USGS ${res.status} for ${gauge}`);
    const d = await res.json();
    for (const f of d.features ?? []) {
      const p = f.properties;
      const v = p.value === null || p.value === "" ? null : Number(p.value);
      rows.push([p.time, Number.isFinite(v) ? v : null]);
    }
    url = (d.links ?? []).find((l) => l.rel === "next")?.href ?? null;
  }
  rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  if (rows.length < 8000) throw new Error(`${gauge}: only ${rows.length} daily rows — check gauge id`);
  return rows;
}

const monthsAxis = [];
for (let y = 2000, m = 10; ; ) {
  monthsAxis.push(`${y}-${String(m).padStart(2, "0")}`);
  m++; if (m > 12) { m = 1; y++; }
  if (y > new Date().getFullYear() || (y === new Date().getFullYear() && m > new Date().getMonth() + 1)) break;
}

const out = { source: "USGS Water Data OGC API — daily mean discharge (00060/00003), provisional values included.", fetched: new Date().toISOString().slice(0, 10), months: monthsAxis, rivers: {} };

for (const r of RIVERS) {
  const daily = await fetchDaily(r.gauge);
  const byMonth = new Map();
  const byWy = new Map();
  for (const [t, v] of daily) {
    if (v === null) continue;
    const mo = t.slice(0, 7);
    (byMonth.get(mo) ?? byMonth.set(mo, []).get(mo)).push(v);
    const y = Number(t.slice(0, 4)), m = Number(t.slice(5, 7));
    const wy = m >= 10 ? y + 1 : y;
    byWy.set(wy, (byWy.get(wy) ?? 0) + v * AF_PER_CFS_DAY);
  }
  const series = monthsAxis.map((mo) => {
    const vs = byMonth.get(mo);
    return vs?.length ? Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) : null;
  });
  const nowWy = new Date().getMonth() + 1 >= 10 ? new Date().getFullYear() + 1 : new Date().getFullYear();
  const complete = [...byWy.entries()].filter(([wy]) => wy < nowWy).map(([, af]) => af);
  const last = daily.filter(([, v]) => v !== null).at(-1);
  out.rivers[r.key] = {
    name: r.name, gauge: r.gauge, gaugeName: r.gaugeName, feeds: r.feeds, downstream: r.downstream,
    series,
    meanAnnualAf: Math.round(complete.reduce((a, b) => a + b, 0) / complete.length),
    latest: { date: last[0], cfs: Math.round(last[1]) },
  };
  console.log(`${r.key}: ${daily.length} days, mean ${(out.rivers[r.key].meanAnnualAf / 1e6).toFixed(2)} MAF/yr, latest ${last[1]} cfs (${last[0]})`);
}

writeFileSync("public/geo/river_profiles.json", JSON.stringify(out));
console.log(`→ public/geo/river_profiles.json (${JSON.stringify(out).length / 1024 | 0}KB)`);
