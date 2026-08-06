/**
 * Bake California's Standard Change Petition Notices (Markets ledger, CA).
 *
 * Source: SWRCB Division of Water Rights — the public notice table for
 * petitions to change a water right (place/purpose of use, point of
 * diversion/rediversion, time extension). Plain HTML table, unauthenticated,
 * maintained current (verified through Aug 2026); sits outside the
 * eWRIMS→CalWATRS migration entirely (see docs/AGENCY_ATLAS.md).
 *
 *   node scripts/build-ca-petitions.mjs   (run from apps/web)
 */
import { writeFileSync } from "node:fs";

const URL =
  "https://www.waterboards.ca.gov/waterrights/water_issues/programs/petitions/standard_change_petition.html";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

const res = await fetch(URL, { headers: { "User-Agent": UA } });
if (!res.ok) throw new Error(`SWRCB ${res.status}`);
const raw = await res.text();

const table = /<table.*?<\/table>/s.exec(raw)?.[0];
if (!table) throw new Error("no <table> found — page structure changed");
const strip = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const rows = [...table.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)].map((m) =>
  [...m[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gs)].map((c) => strip(c[1])),
);
const header = rows[0] ?? [];
if (!/water right holder/i.test(header.join("|")))
  throw new Error(`unexpected header: ${header.join(" | ")}`);

const petitions = rows
  .slice(1)
  .filter((r) => r.length >= 5 && r[1])
  .map((r) => ({
    applications: r[0],
    holder: r[1],
    changeTypes: r[2],
    noticed: (/(\d{4}\/\d{2}\/\d{2})/.exec(r[3]) ?? [null, null])[1],
    protestDeadline: (/(\d{4}\/\d{2}\/\d{2})/.exec(r[4]) ?? [null, null])[1],
    order: r[5] || null,
  }));
if (petitions.length < 5)
  throw new Error(`only ${petitions.length} petitions parsed — check page`);

const out = {
  source:
    "California State Water Resources Control Board, Division of Water Rights — Standard Change Petition Notices (public notice table).",
  url: URL,
  fetched: new Date().toISOString().slice(0, 10),
  count: petitions.length,
  petitions,
};
writeFileSync("public/geo/petitions_ca.json", JSON.stringify(out, null, 1));
console.log(`${petitions.length} CA change petitions → public/geo/petitions_ca.json`);
