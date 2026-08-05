/**
 * Grand Valley Canal daily diversions, 2025 season — from Colorado DWR's
 * CDSS REST API (primary; anonymous tier). Class-filtered to the irrigation
 * water class only: the same headgate carries a second small stock/domestic
 * class that would double-count (waterClassNum 101479 = U:1 irrigation).
 */
import { writeFileSync } from "node:fs";

const WDID = "7200645";
const CLASS = 101479;
const url =
  `https://dwr.state.co.us/Rest/GET/api/v2/structures/divrec/divrecday/?format=json` +
  `&wdid=${WDID}&min-dataMeasDate=03%2F01%2F2025&max-dataMeasDate=11%2F15%2F2025&pageSize=400`;

const res = await fetch(url, { headers: { "User-Agent": "basin/0.1" } });
const body = await res.json();
const rows = (body.ResultList ?? [])
  .filter((r) => r.waterClassNum === CLASS && r.dataValue !== null)
  .map((r) => ({ d: r.dataMeasDate.slice(0, 10), cfs: r.dataValue, status: r.approvalStatus }))
  .sort((a, b) => a.d.localeCompare(b.d));

const AF_PER_CFS_DAY = 1.98347;
const totalAf = Math.round(rows.reduce((s, r) => s + r.cfs, 0) * AF_PER_CFS_DAY);
const peak = rows.reduce((a, b) => (b.cfs > a.cfs ? b : a));
const on = rows.find((r) => r.cfs > 50)?.d;
const off = [...rows].reverse().find((r) => r.cfs > 50)?.d;

writeFileSync("public/geo/canal_gvc_2025.json", JSON.stringify({
  wdid: WDID,
  name: "Grand Valley Canal",
  county: "Mesa County, Colorado",
  waterClass: CLASS,
  season: 2025,
  source:
    "Colorado Division of Water Resources, CDSS REST API — daily diversion records (divrecday), irrigation water class only. Values provisional.",
  fetched: new Date().toISOString().slice(0, 10),
  totalAf, peakCfs: peak.cfs, peakDate: peak.d, onDate: on, offDate: off,
  days: rows.map((r) => [r.d, r.cfs]),
}));
console.log(`days=${rows.length} total=${totalAf.toLocaleString()} AF peak=${peak.cfs} cfs ${peak.d} on=${on} off=${off}`);
