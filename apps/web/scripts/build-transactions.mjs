/**
 * Bake the Grand Valley water-right transaction ledger (Markets page).
 *
 * Source: Colorado DWR CDSS REST API — waterrights/transaction, the record
 * behind the Transactions tool (dwr.state.co.us/Tools/WaterRights/Transactions).
 * Every row is a court-decreed transaction on a water right; adjudicationType
 * carries HydroBase transaction codes (C = change of water right, TT/TF =
 * transferred to/from, AP = alternate point, AB = abandonment, O/S =
 * original/supplemental adjudication).
 *
 * We keep change/transfer/abandonment rows (the market signal) for Water
 * District 72 — the Grand Valley — and stamp each with its water-court case
 * URL so every claim on the page clicks through to the filed record.
 *
 * NOTE: adjudicationDate on a change row is the PARENT RIGHT's priority date,
 * not the filing date. The filing era comes from the case number (85CW0235 →
 * 1985). Old-format case numbers (CA…, W…) predate the CW series.
 *
 *   node scripts/build-transactions.mjs   (run from apps/web)
 */
import { writeFileSync } from "node:fs";

const BASE = "https://dwr.state.co.us/Rest/GET/api/v2/waterrights/transaction/";
const DISTRICT = 72;
const MARKET_CODES = ["C", "TT", "TF", "AB"];

const rows = [];
for (let page = 1; page <= 20; page++) {
  const url = `${BASE}?format=json&waterDistrict=${DISTRICT}&pageSize=1000&pageIndex=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CDSS ${res.status} on page ${page}`);
  const d = await res.json();
  rows.push(...d.ResultList);
  if (page >= d.PageCount) break;
}
console.log(`fetched ${rows.length} district-${DISTRICT} transaction rows`);

/** Filing year from the case number: 85CW0235 → 1985, 04CW123 → 2004. */
const caseYear = (c) => {
  const m = /^(\d{2})CW/.exec(c ?? "");
  if (!m) return null; // CA/W-series: pre-1970s formats, no year encoded
  const yy = Number(m[1]);
  return yy >= 30 ? 1900 + yy : 2000 + yy;
};

const kept = rows
  .map((r) => ({
    case: r.caseNumber,
    year: caseYear(r.caseNumber),
    types: (r.adjudicationType ?? "").split(",").map((s) => s.trim()),
    wdid: r.wdid,
    name: r.waterRightName,
    source: r.waterSource,
    rate: r.maxDecreedRate,
    url: r.moreInformation,
  }))
  .filter((r) => r.types.some((t) => MARKET_CODES.includes(t)))
  .filter((r) => r.year !== null && r.year >= 2000)
  .sort((a, b) => b.year - a.year || a.case.localeCompare(b.case));

// One ledger line per case: a single change case decrees many rights at once.
const byCase = new Map();
for (const r of kept) {
  const g = byCase.get(r.case) ?? {
    case: r.case,
    year: r.year,
    url: r.url,
    types: new Set(),
    structures: new Set(),
    sources: new Set(),
  };
  r.types.filter((t) => MARKET_CODES.includes(t)).forEach((t) => g.types.add(t));
  g.structures.add(r.name);
  g.sources.add(r.source);
  byCase.set(r.case, g);
}
const cases = [...byCase.values()].map((g) => ({
  case: g.case,
  year: g.year,
  url: g.url,
  types: [...g.types].sort(),
  structures: [...g.structures].slice(0, 6),
  structureCount: g.structures.size,
  sources: [...g.sources].slice(0, 4),
}));

const out = {
  source:
    "Colorado DWR, CDSS REST API — waterrights/transaction, Water District 72 (Grand Valley). Court-decreed transactions only; ownership is not recorded in CDSS.",
  fetched: new Date().toISOString().slice(0, 10),
  district: DISTRICT,
  totalRows: rows.length,
  marketRowsSince2000: kept.length,
  caseCount: cases.length,
  casesSince2017: cases.filter((c) => c.year >= 2017).length,
  cases,
};
writeFileSync("public/geo/transactions_gv.json", JSON.stringify(out, null, 1));
console.log(
  `kept ${kept.length} change/transfer rows → ${cases.length} cases (${out.casesSince2017} since 2017) → public/geo/transactions_gv.json`,
);
