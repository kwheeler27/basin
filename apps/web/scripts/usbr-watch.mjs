/**
 * Reclamation lookout — detects NEW publications on usbr.gov (distinct from
 * the data bakes, which refresh what we already ingest):
 *
 *   1. 24-Month Study: the current edition lives at a stable URL that is
 *      replaced monthly — Last-Modified/Content-Length changes = new study.
 *   2. Post-2026 operations page: normalized-content hash, plus an explicit
 *      tripwire for the phrase "Record of Decision" appearing — the event
 *      that will obsolete the site's operating-rules banner.
 *
 * State lives in watch/usbr-state.json (committed); the workflow opens a PR
 * updating it, whose body says what changed. Exit 0 = no change.
 *
 *   node scripts/usbr-watch.mjs        (run from apps/web; writes ../../watch)
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

// curl transport: node-fetch/undici gets reset by some networks and TLS
// fingerprinting (house precedent: OpenET, data.ca.gov) — curl does not.
const curl = (args) => execFileSync("curl", ["-s", "--max-time", "60", "-A", UA, ...args], { encoding: "utf8" });

const UA = "Mozilla/5.0 (compatible; basin-project; +kwheeler27@gmail.com)";
const STATE = "../../watch/usbr-state.json";
const MS24 = "https://www.usbr.gov/lc/region/g4000/24mo.pdf";
const POST2026 = "https://www.usbr.gov/ColoradoRiverBasin/post2026/";

const prev = (() => { try { return JSON.parse(readFileSync(STATE, "utf8")); } catch { return {}; } })();

// usbr.gov rejects HEAD — a 1-byte ranged GET returns the same metadata
// (Last-Modified + total size via Content-Range).
const headOut = curl(["-r", "0-0", "-D", "-", "-o", "/dev/null", "-L", MS24]);
const hdr = (name) => (headOut.match(new RegExp(`^${name}: (.*)$`, "mi")) ?? [])[1]?.trim() ?? null;
if (!/HTTP\/[\d.]+ 20[06]/.test(headOut)) throw new Error(`24MS metadata fetch failed`);
const ms24 = {
  lastModified: hdr("last-modified"),
  length: (hdr("content-range") ?? "").split("/")[1] ?? hdr("content-length"),
};

const raw = curl(["-L", POST2026]);
if (raw.length < 5000) throw new Error(`post2026 suspiciously small (${raw.length}b)`);
const text = raw.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").toLowerCase();
const post2026 = {
  hash: createHash("sha256").update(text).digest("hex").slice(0, 16),
  rodMentioned: /record of decision/.test(text),
};

const changes = [];
if (prev.ms24 && (prev.ms24.lastModified !== ms24.lastModified || prev.ms24.length !== ms24.length)) {
  changes.push(`NEW 24-Month Study detected (was ${prev.ms24.lastModified}, now ${ms24.lastModified}) — ${MS24}`);
}
if (prev.post2026 && prev.post2026.hash !== post2026.hash) {
  changes.push(`Post-2026 operations page changed — ${POST2026}`);
}
if (post2026.rodMentioned && !(prev.post2026?.rodMentioned)) {
  changes.push(`ROD TRIPWIRE: "Record of Decision" now appears on the post-2026 page — the operating-rules banner and rulebook succession need review.`);
}

writeFileSync(STATE, JSON.stringify({ checked: new Date().toISOString().slice(0, 10), ms24, post2026 }, null, 2) + "\n");
if (changes.length) {
  console.log(changes.join("\n"));
  process.exit(0);
}
console.log("usbr-watch: no new publications");
