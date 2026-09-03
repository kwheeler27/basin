/**
 * Bake: the Upper Basin's water at its source, year by year — April-1
 * snowpack and water-year mountain precipitation as NRCS basin indexes
 * (% of station median), from the same HUC-14 SNOTEL roster and sum-over-
 * sum convention as lib/snowpack.ts (never an average of percentages).
 * Station coverage grows through the record; each year carries its
 * station count and thin years render as gaps, never guesses.
 *
 * Run from apps/web:  node scripts/build-snow-precip-history.mjs
 * Output: public/geo/snow_precip_history.json (committed).
 */
import fs from "fs";

const roster = JSON.parse(fs.readFileSync("./public/geo/snotel_huc14.json"));
const TRIPLETS = roster.triplets;
const BASE = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1/data";
const MIN_STATIONS = 40; // below this the index is a gap, not a number

async function indexFor(date, element, minMedianSum) {
  const url =
    `${BASE}?stationTriplets=${TRIPLETS.join(",")}` +
    `&elements=${element}&duration=DAILY&beginDate=${date}&endDate=${date}` +
    `&centralTendencyType=MEDIAN`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "basin/0.1" },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`AWDB ${res.status}`);
      const stations = await res.json();
      let num = 0;
      let den = 0;
      let used = 0;
      for (const s of stations) {
        for (const el of s.data ?? []) {
          for (const v of el.values ?? []) {
            if (v.value != null && v.median != null && v.median > 0) {
              num += v.value;
              den += v.median;
              used += 1;
            }
          }
        }
      }
      const ok = used >= MIN_STATIONS && den >= minMedianSum;
      return { pct: ok ? Math.round((1000 * num) / den) / 10 : null, used };
    } catch (e) {
      if (attempt === 2) return { pct: null, used: 0, error: String(e) };
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

const NOW_YEAR = 2026;
const swe = {};
const prec = {};
const sweYears = [];
for (let y = 1985; y <= NOW_YEAR; y++) sweYears.push(y);
const precYears = sweYears.filter((y) => y <= 2025); // last COMPLETED water year

async function pool(items, worker, width = 3) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: width }, async () => {
      while (queue.length) {
        const it = queue.shift();
        await worker(it);
      }
    }),
  );
}

await pool(sweYears, async (y) => {
  swe[y] = await indexFor(`${y}-04-01`, "WTEQ", 200);
  process.stdout.write(`swe ${y}: ${swe[y].pct} (${swe[y].used})\n`);
});
await pool(precYears, async (y) => {
  prec[y] = await indexFor(`${y}-09-30`, "PREC", 500);
  process.stdout.write(`prec WY${y}: ${prec[y].pct} (${prec[y].used})\n`);
});

const out = {
  source:
    "NRCS AWDB — SNOTEL stations in HUC 14 (Upper Colorado), basin index = sum of station values over sum of station medians for the date (NRCS convention). WTEQ on April 1; PREC (water-year accumulated precipitation) on September 30.",
  convention: `index null when fewer than ${MIN_STATIONS} stations report a value and median`,
  stationsInRoster: TRIPLETS.length,
  baked: new Date().toISOString().slice(0, 10),
  aprilSwePctMedian: swe,
  wyPrecipPctMedian: prec,
};
fs.writeFileSync(
  "./public/geo/snow_precip_history.json",
  JSON.stringify(out, null, 1),
);
const sweOk = Object.values(swe).filter((v) => v.pct != null).length;
const precOk = Object.values(prec).filter((v) => v.pct != null).length;
console.log(`DONE swe years with index: ${sweOk}/${sweYears.length}, prec: ${precOk}/${precYears.length}`);
