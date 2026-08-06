/**
 * Bake Utah's Change Application Tracker (Markets ledger, UT).
 *
 * Source: Utah Division of Water Rights — the live tracker of change
 * applications (the instrument that moves a Utah water right to a new use,
 * place, or point of diversion). Plain HTML, unauthenticated, current
 * (~700 applications acted on in a rolling 6-month window); the strongest
 * change-of-use signal of any basin state (see docs/AGENCY_ATLAS.md).
 *
 * The table is not row-per-<tr>: applications arrive as repeating cell
 * groups delimited by "N --> N" index markers. We chunk on those markers.
 *
 *   node scripts/build-ut-changes.mjs   (run from apps/web)
 */
import { writeFileSync } from "node:fs";

const URL = "https://waterrights.utah.gov/applicationsrecords/chAppTracker.asp";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

const res = await fetch(URL, { headers: { "User-Agent": UA } });
if (!res.ok) throw new Error(`Utah DWRi ${res.status}`);
const raw = await res.text();

const strip = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;| /g, " ")
    .replace(/[‑–]/g, "-") // non-breaking hyphen in WR numbers
    .replace(/\s+/g, " ")
    .trim();

const cells = [...raw.matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gs)].map((m) =>
  strip(m[1]),
);

// Applications start at "N --> N" markers; each group's shape (verified):
// [marker, change a#####, (wr-number), applicant, filed (+age), advertised,
//  protest-end, protested Y/N, hearing status, hearing date, % complete,
//  comments]
const marks = cells
  .map((c, i) => (/^\d+ --> \d+$/.test(c) ? i : -1))
  .filter((i) => i >= 0);
if (marks.length < 100)
  throw new Error(`only ${marks.length} application markers — check page`);

const date = (s) => (/(\d{4}-\d{2}-\d{2})/.exec(s ?? "") ?? [null, null])[1];
const apps = marks.map((start, k) => {
  const g = cells.slice(start, marks[k + 1] ?? start + 12);
  return {
    change: g[1] ?? null,
    waterRight: (g[2] ?? "").replace(/[()]/g, ""),
    applicant: (g[3] ?? "").replace(/,\s*$/, ""),
    filed: date(g[4]),
    advertised: date(g[5]),
    protestEnd: date(g[6]),
    protested: g[7] === "Y",
    hearing: g[8] ?? null,
    pctComplete: Number.isFinite(Number(g[10])) ? Number(g[10]) : null,
    comments: g[11] || null,
  };
});
const bad = apps.filter((a) => !/^a\d+$/.test(a.change ?? ""));
if (bad.length > apps.length * 0.05)
  throw new Error(`${bad.length}/${apps.length} rows failed shape check`);

const good = apps.filter((a) => /^a\d+$/.test(a.change ?? ""));
const out = {
  source:
    "Utah Division of Water Rights — Change Application Tracker (live public tracker, rolling ~6-month action window).",
  url: URL,
  fetched: new Date().toISOString().slice(0, 10),
  count: good.length,
  applications: good,
};
writeFileSync("public/geo/changes_ut.json", JSON.stringify(out, null, 1));
console.log(`${good.length} UT change applications → public/geo/changes_ut.json`);
