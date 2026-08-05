/**
 * Model inputs for the what-if simulator — all primary (Reclamation RISE):
 *   - monthly pool elevations (Powell 508, Mead 6123) aligned to the same
 *     month grid as storage_history.json -> self-calibrated storage<->elevation
 *     curves from paired observations
 *   - water-year totals of Powell unregulated inflow (4301) and total
 *     release (4354) -> the hydrology traces and a mass-balance check year
 * Output: ../../packages/model/data/model_inputs.json (committed).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchDaily(id) {
  const out = [];
  for (let page = 1; page <= 60; page++) {
    const url = `https://data.usbr.gov/rise/api/result?itemId=${id}&itemsPerPage=250&dateTime%5Bafter%5D=1999-10-01&page=${page}`;
    const res = await fetch(url, { headers: { Accept: "application/vnd.api+json", "User-Agent": "basin/0.1" } });
    if (!res.ok) throw new Error(`RISE ${res.status} item ${id} p${page}`);
    const batch = (await res.json()).data ?? [];
    for (const r of batch) {
      const a = r.attributes ?? {};
      if (a.dateTime && a.result !== null && a.result !== undefined)
        out.push([a.dateTime.slice(0, 10), Number(a.result)]);
    }
    if (batch.length < 250) break;
    await sleep(120);
  }
  return out;
}

const hist = JSON.parse(readFileSync("public/geo/storage_history.json", "utf8"));
const months = hist.months;

const [pElev, mElev, inflow, release] = await Promise.all([
  fetchDaily(508), fetchDaily(6123), fetchDaily(4301), fetchDaily(4354),
]);
console.log("rows:", pElev.length, mElev.length, inflow.length, release.length);

function monthlyLast(rows) {
  const m = new Map();
  for (const [d, v] of rows) m.set(d.slice(0, 7), v); // rows arrive date-ordered per page; last write wins
  let last = null;
  return months.map((mo) => {
    if (m.has(mo)) last = m.get(mo);
    return last;
  });
}
const wyOf = (d) => Number(d.slice(0, 4)) + (Number(d.slice(5, 7)) >= 10 ? 1 : 0);
function wyTotals(rows) {
  const t = {};
  for (const [d, v] of rows) {
    const wy = wyOf(d);
    t[wy] = (t[wy] ?? 0) + v;
  }
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v)]));
}

mkdirSync("../../packages/model/data", { recursive: true });
const payload = {
  source: "US Bureau of Reclamation RISE — items 508/6123 (pool elevation, monthly-sampled), 4301 (Powell unregulated inflow, daily->WY totals), 4354 (Powell total release, daily->WY totals). Provisional.",
  fetched: new Date().toISOString().slice(0, 10),
  months,
  powellElev: monthlyLast(pElev),
  meadElev: monthlyLast(mElev),
  powellStorage: hist.series.powell,
  meadStorage: hist.series.mead,
  inflowWY: wyTotals(inflow),
  releaseWY: wyTotals(release),
};
writeFileSync("../../packages/model/data/model_inputs.json", JSON.stringify(payload));
const iw = payload.inflowWY;
console.log("WY inflow sample:", Object.entries(iw).slice(-4));
console.log("mean inflow (2001-2025):",
  Math.round(Object.entries(iw).filter(([y]) => y >= 2001 && y <= 2025)
    .reduce((s, [, v]) => s + v, 0) / 25 / 1000), "kaf");
