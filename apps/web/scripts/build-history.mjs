/**
 * One-time (re-runnable) history snapshot: monthly reservoir storage from
 * RISE, 2000-01 -> present, for every reservoir with a riseStorageItem.
 * Emits public/geo/storage_history.json (committed — history is stable;
 * refresh occasionally, provisional revisions are tolerable at month grain).
 * Primary source: Reclamation RISE. ~40 paginated calls/item, polite delay.
 */
import { writeFileSync } from "node:fs";

const ITEMS = {
  powell: 509, mead: 6124, flaming_gorge: 337, navajo: 613, blue_mesa: 76,
  mohave: 6134, havasu: 6129, strawberry: 779, fontenelle: 347,
  granby: 383, mcphee: 569,
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchItem(id) {
  const rows = new Map(); // "yyyy-mm" -> last value seen that month
  for (let page = 1; page <= 60; page++) {
    const url = `https://data.usbr.gov/rise/api/result?itemId=${id}&itemsPerPage=250&dateTime%5Bafter%5D=2000-01-01&page=${page}`;
    const res = await fetch(url, { headers: { Accept: "application/vnd.api+json", "User-Agent": "basin/0.1" } });
    if (!res.ok) throw new Error(`RISE ${res.status} item ${id} p${page}`);
    const body = await res.json();
    const batch = body.data ?? [];
    for (const r of batch) {
      const a = r.attributes ?? {};
      if (!a.dateTime || a.result === null || a.result === undefined) continue;
      rows.set(a.dateTime.slice(0, 7), Math.round(Number(a.result)));
    }
    if (batch.length < 250) break;
    await sleep(120);
  }
  return rows;
}

const months = [];
const now = new Date();
for (let y = 2000; y <= now.getUTCFullYear(); y++)
  for (let m = 1; m <= 12; m++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (key <= now.toISOString().slice(0, 7)) months.push(key);
  }

const series = {};
// Parallel across items (each item pages serially) — 11 concurrent chains
// against a keyless federal API is a modest, short burst.
await Promise.all(Object.entries(ITEMS).map(async ([rid, item]) => {
  const map = await fetchItem(item);
  let last = null; // carry-forward gaps so the replay never flickers to zero
  series[rid] = months.map((mo) => {
    if (map.has(mo)) last = map.get(mo);
    return last;
  });
  console.log(rid, "months with data:", map.size, "first:", [...map.keys()][0]);
}));

writeFileSync("public/geo/storage_history.json", JSON.stringify({
  source: "US Bureau of Reclamation, RISE — monthly-sampled daily reservoir storage (last reading of each month), acre-feet.",
  vintage: now.toISOString().slice(0, 10),
  months, series,
}));
console.log("months:", months.length, "bytes:",
  (await import("node:fs")).statSync("public/geo/storage_history.json").size);
