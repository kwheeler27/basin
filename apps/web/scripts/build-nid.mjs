/**
 * NID reservoirs artifact — US Army Corps National Inventory of Dams.
 * Seven basin states, normal storage >= 10,000 AF, PRIMARY structures only:
 * associated structures (saddle dams, dikes) share the NID ID and repeat the
 * full reservoir capacity, so keeping them triple-counts reservoirs like
 * Oroville. Source CSV: https://nid.sec.usace.army.mil/api/nation/csv (~67MB).
 *
 * Usage: curl -s https://nid.sec.usace.army.mil/api/nation/csv -o /tmp/nid.csv
 *        node scripts/build-nid.mjs /tmp/nid.csv
 */
import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2] ?? "/tmp/nid.csv";
const text = readFileSync(src, "utf8");

// minimal RFC-4180 parser (quoted fields contain commas)
function* rows(t) {
  let field = "", row = [], q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") yield row;
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); yield row; }
}

const it = rows(text);
it.next(); // "Data Last Updated:" preamble
const header = it.next().value;
const col = Object.fromEntries(header.map((h, i) => [h, i]));
const need = ["Dam Name", "NID ID", "State", "Latitude", "Longitude",
  "Normal Storage (Acre-Ft)", "Primary Owner Type", "Primary Purpose",
  "River or Stream Name", "Year Completed", "Is Associated Structure?"];
for (const n of need) if (!(n in col)) throw new Error(`missing column: ${n}`);

const CODE = { Arizona: "AZ", California: "CA", Colorado: "CO", Nevada: "NV",
  "New Mexico": "NM", Utah: "UT", Wyoming: "WY" };
const FLOOR = 10_000;
const out = [];
let associatedSkipped = 0;
for (const r of it) {
  const st = CODE[r[col["State"]]];
  if (!st) continue;
  if ((r[col["Is Associated Structure?"]] || "").trim().toLowerCase().startsWith("y")) {
    associatedSkipped++;
    continue;
  }
  const af = Number(r[col["Normal Storage (Acre-Ft)"]]);
  const lat = Number(r[col["Latitude"]]);
  const lon = Number(r[col["Longitude"]]);
  if (!Number.isFinite(af) || af < FLOOR || !lat || !lon) continue;
  const title = (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  out.push({
    n: title(r[col["Dam Name"]]), id: r[col["NID ID"]], st,
    lat: +lat.toFixed(3), lon: +lon.toFixed(3), af: Math.round(af),
    own: r[col["Primary Owner Type"]], use: r[col["Primary Purpose"]],
    riv: title(r[col["River or Stream Name"]] || ""), yr: r[col["Year Completed"]] || null,
  });
}
out.sort((a, b) => b.af - a.af);
const ids = new Set(out.map((d) => d.id));
console.log(`dams: ${out.length} (unique ids ${ids.size}), associated skipped: ${associatedSkipped}`);
writeFileSync("public/geo/nid_reservoirs.json", JSON.stringify({
  source: "US Army Corps of Engineers, National Inventory of Dams (nid.sec.usace.army.mil), normal storage >= 10,000 AF, primary structures only, seven basin states. Snapshot 2026-08-05.",
  floorAf: FLOOR,
  dams: out,
}));
