# The Water Rights Picture — System Design

Status: PROPOSED (awaiting Kevin's review) · 2026-08-06
Scope decisions already made: seven basin states first · layer order = seniority → use types → ownership concentration → transactions/cases · baked aggregates + drill-in, with full-point tiles as an explicit later phase.

## 1. What this system is

A data product that renders the western United States' water-rights system — who may take water, from where, since when, for what — as interactive, data-driven maps at the granularity the public record supports, from county recorder up to federal contract. It extends the Basin digital twin: same registry discipline, same provenance rules, same map language as the Overview.

**The product answers, in order:** (1) How old are the rights here — who gets cut last? (2) What is the water decreed for? (3) Who holds it, at entity level? (4) Where is it changing hands? Each is one map layer, one dataset, one bake.

**Why "western":** east of roughly the 100th meridian, riparian doctrine ties water to landownership and produces no statewide permit/POD record to map. Prior appropriation — the West — produces exactly the records this product visualizes. The page states this; the coverage boundary is itself part of the picture. The architecture is state-additive: any state whose records we verify can be added without redesign.

## 2. Design principles

1. **Primary sources only, provenance per record.** Every datum traces to an agency-of-record endpoint or document; artifacts carry source URL + fetch date. No aggregators, no data brokers.
2. **The facts carry the argument** (neutral register — DESIGN_PRINCIPLES.md §7). Layer names, legends, and copy are statutory/record vocabulary, attributed characterizations only.
3. **Entities, not individuals.** Named natural persons never appear in artifacts or on the map. Ownership renders at entity level (companies, districts, agencies, tribes as governments) and in aggregates; individuals fold into "individual/family holders" classes. Enforced by an automated check in the pipeline, not by editorial care.
4. **Coverage gaps are content, never blank space.** Nevada's postback-only search and Wyoming's paper filings are displayed as explicit coverage states with the reason, per the agency atlas. Missing ≠ zero, absence ≠ scarcity.
5. **Semantic non-conflation.** Rights concepts stay distinct end-to-end: POD vs place of use; decreed vs permitted vs claimed; rate (cfs) vs volume (AF/yr) — never summed across kinds; paper right vs wet water. The schema encodes these as enums the way the measure registry encodes `accounting_concept`; the UI never merges them silently.
6. **Static at runtime.** Production serves baked artifacts and static tiles only. No production request ever depends on a state server being up. Freshness is a build-time property with a visible as-of stamp.
7. **Desktop and mobile ship and are verified together** (existing qa:map doctrine extends to the new stage).

## 3. Operating principles

1. **Reproducible bakes.** Every artifact is regenerable by a script from a raw snapshot; scripts carry shape assertions that fail loudly on source drift. A red build is the designed alarm for "an agency changed something."
2. **Refresh is automated, publication is human-gated.** GitHub Actions on per-source cadences → artifact diff → PR. The PR diff is the change record; a human (Kevin, or agent for mechanical refreshes per CLAUDE.md merge policy) merges. Deploy follows main.
3. **Raw snapshots are retained and versioned** (object storage, date-keyed) so history survives agency deletions/migrations (CalWATRS taught this) and every past artifact remains reproducible.
4. **Compliance posture:**
   - Identified client: UA string names the project and a contact email on every request.
   - Courteous access: documented page sizes, sequential paging, backoff on 5xx, off-peak schedules. Never circumvent an access control — where a front door is gated (azwater.gov), we use the agency's own published open data service (their ArcGIS org), not evasion.
   - Licensing: federal data public domain; state open-data terms recorded per source in the atlas; attribution rendered on-page per source.
   - Corrections: a documented contact path and a stated correction policy on the page; record-level "report an issue" link later.
   - Privacy: principle 3 above, plus no joins that re-identify individuals across sources.
5. **Validation before publication.** Each bake reconciles against an agency-published control total where one exists (record counts, per-county counts) with a tolerance gate; mismatches fail the build.
6. **Every artifact carries its schema version.** Consumers reject artifacts with unknown versions rather than misrender them.

## 4. Architecture

```
STATE/FED SOURCES        INGEST (packages/ingest, Python)        BUILD-TIME ANALYTICS         ARTIFACTS (runtime)
─────────────────        ────────────────────────────────        ────────────────────         ───────────────────
CO CDSS REST      ──►    adapters/rights/cdss.py          ─┐
AZ ArcGIS FS      ──►    adapters/rights/adwr.py           ├─►  rights_normalized.parquet ─►  DuckDB SQL ─►  county/basin aggregate JSONs (<150KB/layer)
NM bulk CSV       ──►    adapters/rights/nmose.py          │        (canonical schema)              │          public/geo/rights_*.json  → D3 stage
CA ArcGIS FS      ──►    adapters/rights/swrcb.py          │                                        └─►  (Phase 3) tippecanoe → PMTiles → object storage → MapLibre GL
UT HTML trackers  ──►    adapters/rights/utdwri.py        ─┘
NV/WY             ──►    coverage-state records only (documented gaps)
      │
      └── raw snapshots → object storage (R2/Blob), date-keyed, immutable
```

- **Ingest home:** `packages/ingest` (Python) — per the repo's language boundary this is where nontrivial ETL belongs; it already has the adapter + real-fixture-test pattern. The existing `apps/web/scripts/*.mjs` bakes remain for light page artifacts (ledgers) and gain no new heavy logic.
- **Canonical schema `rights_normalized`** (one row per right×POD): `right_uid` (state+source id), `state`, `lon/lat` + `loc_quality`, `priority_date` + `priority_basis {decreed|permitted|claimed|registered}`, `use_classes[]` (controlled vocabulary mapped per state), `quantity {value, unit, kind: rate|volume|storage}`, `owner {name_raw, entity_class: entity|public|tribal_govt|individual}`, `status`, `source {system, url, fetched}`, `schema_version`. Defined once as JSON Schema in `packages/registry` style; codegen emits Pydantic + TS/Zod so both sides share it (same doctrine as measures).
- **Build-time analytics: DuckDB inside the pipeline.** Aggregations (county bins: right counts, median priority year, % pre-Compact (pre-1922), use mix, entity concentration) are SQL over the Parquet — a real database engine with zero servers, fine on the 8GB machine and in Actions. Runtime stays files.
- **Presentation:** Phase 1–2 render aggregates on a new `RightsMap` D3/SVG stage (Overview's projection, pills, DetailSheet, camera-pan mobile pattern). Phase 3 adds a MapLibre GL view for full-point drill-in from PMTiles, styled to the house register; D3 remains the "still at rest" default view.
- **Page IA:** `/water-rights` = the picture (map hero + layer narrative), with **Transactions** as an anchored subsection (existing case files + ledgers + a map layer), promotable to a top-level tab without rework.

## 5. Key decisions, options, trade-offs

| # | Decision | Options considered | Choice & why |
|---|---|---|---|
| D1 | Rendering engine | (a) D3/SVG only (b) MapLibre GL now (c) phased hybrid | **(c)** — aggregates need ≤ ~3k SVG nodes and inherit the proven stage + aesthetic; GL is only *required* by full points. Hybrid defers the hardest design work (making GL feel like our register) until the data that needs it exists. Cost: two map systems eventually; contained by shared projection/palette/DetailSheet. |
| D2 | Point-scale delivery | (a) per-state GeoJSON (b) tile server (c) PMTiles static | **(c)** — single static file, HTTP range reads, no server, fits static-first. (a) is 100+MB payloads; (b) is infrastructure + cost + uptime we don't want. Trade-off: object storage becomes a (cheap) dependency; mitigated by artifact reproducibility. |
| D3 | Pipeline language & home | (a) extend Node page-bakes (b) Python in packages/ingest | **(b)** — the language-boundary rule exists for this: tested adapters, shared schema codegen, DuckDB/Parquet ecosystem. Node bakes stay for small page artifacts. Trade-off: two runtimes in CI — already true today. |
| D4 | Query/aggregation engine | (a) hand-rolled JS (b) Neon/PostGIS now (c) DuckDB at build time | **(c)** — SQL expressiveness with zero runtime infrastructure ("database at build time, files at run time"). PostGIS (per the original Basin architecture) becomes right when we need *interactive cross-state queries* (search-by-owner, arbitrary filters) — an explicit later trigger, not a default. |
| D5 | Raw snapshot retention | (a) refetch when needed (b) git/LFS (c) object storage, date-keyed | **(c)** — agencies migrate and delete (CalWATRS); refetch is not reproducibility. Git bloats the public repo. R2/Blob is pennies. |
| D6 | Ownership & privacy | (a) full transparency incl. individuals (b) no ownership layer (c) entity-tiered | **(c)** — entity-level ownership is the story (funds, municipalities, districts); individual names at coordinates is a dox pattern we refuse. Automated pipeline check, not policy-by-attention. Trade-off: undercounts "family LLC" ambiguity — classification rules documented, conservative default = individual. |
| D7 | Refresh cadence | uniform weekly vs per-source | **Per-source**: UT tracker weekly (rolling window), CO weekly, CA petitions weekly, AZ/NM monthly (bulk, slow-moving), snapshots retained each run. Backstop: any red run alerts. |
| D8 | Schema governance | ad-hoc TS types vs registry-style codegen | **Registry-style** JSON Schema → Pydantic + Zod. One source of truth, drift gate in CI — the repo's existing doctrine extended to entity data. |
| D9 | NV/WY/UT gaps | omit vs fake-complete vs explicit coverage states | **Explicit coverage states** rendered on-map with reasons (atlas-sourced). The gap is information. |
| D10 | Where the map lives | new tab vs Overview layer vs /water-rights hero | **/water-rights hero** — Overview stays the system story; rights are their own narrative with their own layers. |

## 6. External interfaces consumed (per agency atlas, all verified)

| Source | Interface | Volume | Cadence |
|---|---|---|---|
| CO DWR CDSS | REST `waterrights/netamount` + `transaction` (county/division params, lat/lon) | ~180k rights | weekly |
| AZ ADWR | ArcGIS FeatureServer `Filing_POD` (+ Well Registry later), paged 2k, UTM→WGS84 | 99,775 (+wells) | monthly |
| NM OSE | Bulk POD CSV via ArcGIS Hub (153MB, owner cols, county) | ~300k rows | monthly |
| CA SWRCB | ArcGIS `Points_of_Diversion` FS + change-petition HTML table | ~50k | weekly (petitions) / monthly (POD) |
| UT DWRi | Change/Exchange/ROC HTML trackers now; POD geometry pending unlock (500s on REST — needs referer investigation or an agency ask) | trackers ~1k/rolling | weekly |
| NV / WY | none scriptable — coverage-state records only | — | atlas re-check quarterly |
| Federal | Reclamation contract context (case files), Compact/legal frame (static reference layers) | — | as needed |

## 7. Execution plan (phases = PRs to main, same-day merges, gates before advance)

- **Phase 0 — Foundations** (~1 session): rights JSON Schema + codegen (Pydantic/Zod) with CI drift gate; object-storage bucket + credentials in Actions secrets (never in repo); DuckDB dev-dependency in `packages/ingest`; snapshot conventions. *Gate: schema round-trips both languages; empty pipeline runs green in CI.*
- **Phase 1 — Seniority + use, four states (CO, AZ, NM, CA)** (~2–3 sessions): four adapters with real-fixture tests; `rights_normalized.parquet`; county aggregates (counts, median priority year, % pre-1922, use mix); `RightsMap` stage with pills (Seniority | Uses | Coverage) + doctrine framing copy; page restructure with Transactions subsection (case files/ledgers/AZ basins fold in as the Transactions layer). *Gates: per-state control-total reconciliation ±1%; artifacts ≤150KB/layer; qa:map extended to the new stage, both viewports.*
- **Phase 2 — Ownership concentration** (~1–2 sessions): entity classification rules (documented in-repo); top-N entity share per county/basin, entities only; automated no-individual-names check in CI. *Gate: the check + manual audit of top-50 entities.*
- **Phase 3 — Full-point drill-in** (~3–5 sessions): tippecanoe → PMTiles → object storage; MapLibre GL view styled to house register; zoom-tiered attributes honoring D6. *Gates: mobile TTI < 2s on the page; tile budget ≤ ~200MB; D6 check at tile build.*
- **Phase 4 — Coverage growth**: UT geometry unlock (or an explicit request to DWRi — their login-gated bulk tool suggests a data-sharing path); quarterly NV/WY atlas re-checks; state-additive expansion beyond the seven when verified; revisit Transactions as top-level tab; PostGIS trigger review (D4).

## 8. Risks & mitigations

- **Agency drift/migrations** — shape assertions fail builds; snapshots make history safe; atlas re-verification is scheduled work, not memory.
- **AZ's Cloudflare gate spreading to its ArcGIS org** — monthly snapshots mean we lose freshness, not data; documented fallback is the snapshot + a coverage-state downgrade.
- **Aesthetic split (D3 vs GL)** — shared tokens/projection; GL view ships only when it matches the register in side-by-side review.
- **Scope creep eastward/national** — riparian states enter only via a *verified-records* bar, same as any state; the doctrine framing already explains the boundary.
- **Individual-privacy regression** — CI check is the backstop; classification rules err conservative.

## 9. Success criteria

A reader can answer, from the page alone: how senior the rights are anywhere in the seven states; what the water there is for; which entities hold the most of it; where rights are moving — each answer carrying its source, its date, and its uncertainty, at NYT-graphics quality, on a phone.
