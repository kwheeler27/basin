# Build Prompt — Basin (Phase 1 MVP)

> **This document is self-contained.** Agents reading it have no access to the planning conversation. All paths are absolute. Where a fact is marked *unverified*, verify it — do not assume.

---

## Mission

Build **Basin**, a public **digital twin** of a river system. The Colorado River is the first basin, not the product boundary — measure IDs carry a basin prefix (`colorado.reservoir.mead.storage`), rulebooks are basin-scoped config, app routes live under `/colorado/...` with the root as a basin selector, and the model package keeps its mass-balance and rules machinery basin-generic with the Colorado's rule content and node topology as config. Phase 1 is a deliberately narrow but **complete vertical slice** — snowpack → Lake Powell → Lake Mead → Lower Basin deliveries — proving all three twin characteristics end to end.

"Usable" means: a member of the public can load the site, see today's system state with full provenance, understand how snow becomes reservoir storage becomes deliveries, move one slider to see how a Lower Basin cut changes Lake Mead's trajectory, and check how well the model has actually performed against Reclamation's published projections.

**This is not a dashboard.** If the model is not real, tested, and validated, the project has failed regardless of how the charts look.

---

## Reference material (read before designing)

All under `/Users/kevinwheeler/projects/basin/`:

- **`PLAN.md`** — decisions with rationale, phases, risks, costs. **Read first.**
- **`docs/DATA_SOURCES.md`** — full source matrix: endpoints, coverage, cadence, auth, caveats, and a reference-values table with confidence ratings.
- **`docs/DATA_MODEL.md`** — measure registry schema, the three load-bearing enumerations, `observation` table DDL, codegen targets.
- **`docs/OPERATING_RULES.md`** — the rulebook. **Powell tiers are verified HIGH confidence. Mead DCP tiers are MEDIUM and blocked pending verification.**
- **`docs/DESIGN_PRINCIPLES.md`** — uncertainty and scale communication; the visual language for epistemic class.
- **`docs/IA.md`** — page and interaction map.
- **`/Users/kevinwheeler/projects/CLAUDE.md`** — standing environment constraints.

### External sources — exact identifiers

| Purpose | Identifier |
|---|---|
| Reservoirs | RISE `https://data.usbr.gov/rise/api` — Powell record **2362** (items 508 elev, 509 storage, 511/512 inflow, 4315/4354 release, **510 evaporation**); Mead record **4370** (items **6123** elev, 6124 storage, 6122/6125 release). Keyless, JSON, CORS-enabled, daily. |
| Streamflow | `https://api.waterdata.usgs.gov/ogcapi/v0/` — collections `daily`, `latest-daily`, `monitoring-locations`. Gauges: **09380000** Lees Ferry, **09180500** Cisco, **09315000** Green River, **09379500** Bluff, **09421500** below Hoover. |
| Snowpack | NRCS AWDB REST `https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1/` — element `WTEQ`, station triplets like `302:CO:SNTL`. |
| Drought | `https://usdmdataservices.unl.edu/api/` — HUC aggregation supported. |
| Backtest target | 24-Month Study PDFs: `https://www.usbr.gov/lc/region/g4000/24mo.pdf`, `24mo_MIN.pdf`, `24mo_MAX.pdf`; archive at `https://www.usbr.gov/lc/region/g4000/24mo/index.html`. |

**⚠️ Never use `waterservices.usgs.gov`** — it is being decommissioned (degradation from ~August 2026, decommission targeted Q1 2027).
**⚠️ USGS site 09379910 (below Glen Canyon Dam) is discontinued since 2004-08-02.** It looks like the gauge you want and is silently stale. Use Lees Ferry (09380000) plus RISE release data.

---

## STEP-0 validation gates — BLOCKING

**These four produce written verdicts before the code that depends on them is written.** Each failure reshapes scope rather than being discovered mid-build. Only G1 has narrow scope (see its row); G2–G4 are cheap and should simply be done first.

| Gate | Task | Failure response |
|---|---|---|
| **G1** | Verify the Mead DCP shortage-tier volumes line-by-line against the **primary** DCP Record of Decision or Federal Register notice. The table in `docs/OPERATING_RULES.md` §2 is assembled from secondary sources that do not arithmetically reconcile. **Scope: G1 blocks only the Mead shortage branch of the rules engine and any projection depending on it.** Ingestion, mass balance, Powell tier logic, the hydrology regression, and the backtest harness do NOT wait on G1 — run them in parallel. | If unverifiable, ship shortage simulation with **2007 IG base tiers only** (HIGH confidence) and mark DCP overlays as unavailable. Do not ship guessed numbers. |
| **G2** | Confirm the 24-Month Study archive depth and PDF text-extractability. Two independent research passes failed to extract text from Reclamation PDFs with standard tooling. | If parsing is infeasible, narrow the backtest to whatever can be extracted and **state the sample size prominently**. Do not silently drop the backtest. |
| **G3** | Verify current Mead/Powell storage and elevation directly against RISE. Reported figures (Powell ~22%, Mead ~27%, combined ~33% as of 2026-07-19) are secondhand. | Correct the reference values in `docs/DATA_SOURCES.md`. |
| **G4** | Verify the Reclamation Natural Flow dataset is current at `https://www.usbr.gov/lc/region/g4000/NaturalFlow/provisional.html`. Newest confirmed file was September 2024. Also confirm the AWDB REST API responds as documented — its Swagger UI could not be loaded during research. | If Natural Flow is stale, note the vintage in the UI. If AWDB differs from documentation, correct the ingest design before building. |

---

## Stack (fixed — do not substitute)

- **TypeScript** for everything user-facing. **Python 3.12+ only** in `packages/ingest/` and `packages/model/`. This is a documented exception to the standing "no Python" rule and **must not spread** beyond those two packages.
- **Next.js** (App Router) + React on Vercel. **Drizzle ORM.** **Zod** at every boundary.
- **Neon Postgres + PostGIS.** Not TimescaleDB — Neon offers only the Apache-2 edition, without the compression and continuous aggregates that would justify it.
- **Cloudflare R2** for immutable raw source snapshots.
- **Dagster** in library mode (no hosted daemon); instance storage in Neon; scheduled by **GitHub Actions**. **dbt** for `observation` → marts, wired via **`dagster-dbt`**.
- **Modal** for ensemble and parameter-sweep compute.
- **Observable Plot** for standard charts, **D3** only for the bespoke Sankey/flow visual, **MapLibre GL** + Protomaps/OpenFreeMap if a map is needed. **Not Mapbox** (commercially licensed). **No additional chart library** — downsample server-side instead.
- **Model implementation: hand-rolled Python.** Do not adopt `pywr` in Phase 1 — two reservoirs and four tiers is ~300 lines, transparency is the product, and GPLv3 would constrain later open-sourcing.
- Environment: **8GB RAM.** No watch-mode runners, no long-lived dev servers unless asked. Tests run single-run (`pytest`, `vitest run`).

---

## Data model (minimum)

Full specification in `docs/DATA_MODEL.md`. Non-negotiable elements:

**Measure registry** — `packages/registry/measures/**/*.yaml`, JSON Schema validated, **the single source of truth**. Codegen emits Pydantic models, TS + Zod contracts, the Postgres `measure` dimension, dbt `schema.yml` with `accepted_values` tests, and the AI retrieval schema. Adding a measure must be **one YAML file** that propagates everywhere.

**Three enumerations that carry correctness weight:**
- `accounting_concept`: `diversion | withdrawal | consumptive_use | depletion | return_flow | delivery | storage | evaporation | loss | allocation` — measures differing here can never be summed.
- `measurement_class`: `observed | estimated | modeled | forecast | reconstructed | administrative`.
- `temporal_semantics`: `instantaneous | interval_total | interval_mean | end_of_period | period_max`.

**`observation` table** — measure-keyed system of record. **Three distinct time columns**: `valid_time`, `publication_time`, `ingested_at`. Revisions are **new rows** linked via `revision_of`, never in-place updates — the backtest depends on answering "what did we believe on date X?"

**Model outputs are observations** with `measurement_class: modeled` plus `model_version`, `rulebook_version`, `scenario_id`, `trace_id`, `input_data_version`.

**Water year is a dimension**, Oct 1 – Sep 30, named for the ending year. Never derived ad hoc in a query.

**Units:** every value stored in the measure's `canonical_unit`. Conversion happens at the presentation boundary from the registry table. No magic numbers in components.

**Excluded from Phase 1:** crop, water_user, tribe, allocation, and virtual-water entities. Design the schema so they attach without migration of existing tables.

---

## Core flows & acceptance criteria

### 1. Ingestion
Dagster assets, one module per source, partitioned by date and water year. Each fetch writes an immutable raw snapshot to R2 **before** parsing, then normalizes to `observation` rows in canonical units with full provenance.

*Accepts when:* `dagster asset materialize` populates `observation` for RISE (Mead + Powell), USGS (5 gauges), and AWDB SNOTEL. Re-running is idempotent. A changed upstream value creates a **new row with `revision_of` set**, not an update. Asset checks fail loudly on stale data (past `sla_hours`) and on out-of-range values. Every row's `snapshot_uri` resolves to a real R2 object.

### 2. Basin SWE percent-of-median
**No API exists for this** — it is a computed NRCS map product. Compute from station-level AWDB data plus HUC membership, replicating NRCS methodology (1991–2020 reference period, minimum record-length filtering, station weighting).

*Accepts when:* computed Upper Colorado basin SWE % of median reconciles with the NRCS published map product within a **stated, documented tolerance**, and every methodological deviation is written down in the module docstring and surfaced in the Data Explorer.

### 3. Transformation
dbt project: `observation` → staging → intermediate → `mart_reservoir_daily`, `mart_swe_basin_daily`, `mart_water_balance`, `mart_projection`. `schema.yml` is **generated from the registry**, not hand-written.

*Accepts when:* `dbt build` passes with generated tests; `dagster-dbt` surfaces every dbt model as a Dagster asset in one lineage graph; `dbt docs generate` produces a hostable site.

### 4. The model
`packages/model/`: mass balance + rules engine + hydrology front-end, as **pure functions** over explicit inputs. No database access inside model logic — I/O at the edges only.

- **Rules engine:** Powell four-tier release logic per `docs/OPERATING_RULES.md` §1 (HIGH confidence, encode directly). Mead shortage tiers per §2 — **2007 IG base tiers only unless G1 clears**. Rulebook is versioned config, never hardcoded.
- **Mass balance:** monthly step. `storage_next = storage + inflow − release − evaporation − losses`, Powell and Mead as coupled state variables.
- **Hydrology front-end:** **parsimonious regularized regression**, not a GBM. Only ~45 water years of SNOTEL data exist; a GBM will fit noise and produce confident, wrong uncertainty bands. Physically motivated features (peak SWE, April 1 SWE, accumulated precipitation, antecedent moisture proxy, spring temperature) plus an explicit declining-runoff-efficiency term. Leave-one-year-out cross-validation. **Prediction intervals from the residual distribution, not the point estimate.**
- **Ensembles:** resampled historical hydrology traces → P10/P50/P90 bands.

*Accepts when:* given January 2024 initial conditions and observed 2024 inflows, the model reproduces observed end-of-month Powell and Mead storage within a documented tolerance. Every operating-rule threshold has a unit test at, just above, and just below the boundary. Tier transitions are tested in both directions.

### 5. Backtest
Parse published 24-Month Studies; compare our projection from the same vintage against what actually happened.

*Accepts when:* the backtest page shows the error distribution across all extractable studies, states the sample size, and does not hide cases where the model performed poorly. If G2 failed, the page states the limitation prominently.

### 6. Scenario
One what-if: Lower Basin cut of N MAF → Mead trajectory with uncertainty band and time-to-threshold. Server-side canonical model; a precomputed parameter sweep gives sliders instant response, with off-grid scenarios falling back to a Modal run.

*Accepts when:* slider movement is instant; the surface interpolation matches a direct server run within a documented tolerance; **every output is stamped with `model_version`, `rulebook_version`, and `input_data_version`.**

### 7. Presentation
Per `docs/IA.md` §1, §2, §9-lite, §10 and the visual language in `docs/DESIGN_PRINCIPLES.md`.

*Accepts when:* every displayed number has source, timestamp, unit, and definition on hover; `measurement_class` is visually distinct without reading a legend; the "now" boundary is a hard visual break; the global unit switcher rewrites every number including scale anchors; the Data Explorer renders **from the registry** rather than a hand-maintained list; missing data renders as a gap, never interpolated silently.

---

## Quality bar

- **Pure logic in packages with unit tests against real fixtures.** Capture real RISE, USGS, and AWDB payloads as committed fixtures — no mocks for parsing logic. Name the tricky cases: revision rows, provisional flags, missing days, unit edge cases, water-year boundaries.
- **Reconciliation with tolerances, stated:** model vs. observed 2024 storage; computed basin SWE vs. the NRCS map product; response-surface interpolation vs. direct model runs; unit conversions round-trip exactly.
- **Boundary validation with Zod / Pydantic on every external response.** Federal APIs return provisional, missing, and occasionally malformed data. Reject loudly at the boundary; never let a null become a zero.
- **Registry codegen is verified in CI** — a changed YAML file that does not regenerate cleanly fails the build.
- **Seed script** so UI work needs no live API access.
- **The adversarial review pass** (see below) is mandatory before merge.

---

## Deliverables & environment notes

Repo at `/Users/kevinwheeler/projects/basin` — **public** (`kwheeler27/basin`), Apache-2.0 licensed. Secrets discipline is absolute: nothing lands without `.gitignore` and `.env.example` in place, and credentials never appear in code, fixtures, or committed snapshots.

`.env.example` for: `DATABASE_URL` (Neon), `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`, `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET`, `USGS_API_KEY` (optional), `NASS_API_KEY` (Phase 2), `NCEI_CDO_TOKEN` (Phase 2).

README covering setup, run, test, and **explicit limitations** — reduced-form model, provisional data, unverified figures, rulebook in flux.

**Branch protection is on `main`.** Work on `feat/...` branches; open PRs with `gh pr create`; Kevin merges. Never commit directly to `main`.

**Do NOT build in Phase 1:** agriculture/crop views, state allocation pages, tribal rights views, the historical/paleo timeline, the full Scenario Lab, the AI narrative layer, user accounts, or a basin map. Keep the seams: the registry accommodates new measures without schema change; the model's rules engine is already versioned config; the AI layer's retrieval contract is generated in Phase 1 even though nothing consumes it yet.

---

## Suggested agent decomposition

1. **STEP-0 verification (blocking, no code).** Resolve G1–G4. Produce written verdicts. Update `docs/OPERATING_RULES.md` and `docs/DATA_SOURCES.md` with findings.

2. **Contracts first (blocking).** Registry JSON Schema, first ~12 measures, codegen pipeline, `observation` DDL, Drizzle schema, shared TS types. **Everything downstream codes against these and must not modify them.** Owner: `data-engineer`.

Then in parallel:

3. **Ingestion** — Dagster assets for RISE, USGS OGC, AWDB; R2 snapshotting; asset checks; the basin-SWE computation. Owner: `data-engineer`.
4. **Model** — mass balance, rules engine, hydrology regression, ensembles, backtest harness. Pure functions, heavy unit tests. Owner: `data-engineer` or `fullstack-engineer` with hydrology care.
5. **Transform** — dbt project with registry-generated `schema.yml`; `dagster-dbt` wiring. Owner: `data-engineer`.
6. **API + app shell** — Next.js routes over the marts, Zod contracts, unit switcher, provenance hover, Data Explorer from the registry. Owner: `fullstack-engineer`.
7. **Visualization** — Today tiles, the Water Balance Sankey (D3), backtest chart, scenario view. Owner: `ui-engineer`, with `product-designer` on the Sankey and the epistemic visual language first.

Then:

8. **Integration pass** — wire, install once, run everything end to end, fix.
9. **Adversarial review (mandatory).** Hunt these specific bug classes:
   - **Unit errors** — acre-feet vs. thousand acre-feet vs. MAF; cfs vs. AF/day; elevation vs. storage confusion.
   - **Accounting conflation** — any code path that sums or compares across `accounting_concept` without a declared bridge.
   - **Epistemic conflation** — observed and modeled values merged in a query or a chart series.
   - **Water-year boundary errors** — off-by-one on Oct 1; WY labeled by start year instead of end year.
   - **Revision handling** — an update where a new row was required; a query returning stale rows because it ignored `source_version`.
   - **Silent nulls** — a missing value rendering as zero anywhere.
   - **Rule-boundary errors** — tier transitions at exactly 3,575 / 3,525 / 1,075 / 1,050 / 1,025 ft.
   - **Overclaiming** — any UI copy implying CRSS-equivalence or hiding the reduced-form nature.
10. **Final E2E** against the real fixtures, with the reconciliation checks reported in the PR description.
