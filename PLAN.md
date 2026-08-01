# Basin — Plan

**Date:** 2026-07-31 (naming/scope updated 2026-08-01)
**Goal:** A public digital twin of a river system — continuously ingesting authoritative data, modeling how the system actually works, and letting a non-expert simulate what happens if conditions change. It answers *why* and *what next*, not just *what is*. **The Colorado River is the first basin**, not the product boundary.

> **Naming & scope.** The product is **Basin** (`kwheeler27/basin`, public). Kevin may expand beyond the Colorado River, so the architecture is basin-agnostic by construction: measure IDs carry a basin prefix (`colorado.reservoir.mead.storage`), rulebooks are basin-scoped config, routes live under `/colorado/...` with the root as a basin selector, and the model package keeps mass-balance/rules machinery generic with basin content as config. None of this is extra work done now; all of it is a painful migration later.

---

## 0. Why this, why now

Two facts from due diligence set the context:

1. **The rulebook is being rewritten this quarter.** Reclamation published the Final EIS for Post-2026 Colorado River Operations on **2026-07-31** — the day this plan was written. The 2007 Interim Guidelines and 2019 DCP expire **2026-09-30**; the US–Mexico Minute 323/330 arrangements expire **2026-12-31**. No Record of Decision has issued, no seven-state consensus was reached, Arizona has publicly called the framework's shortage sideboards "unacceptable," and multiple outlets report litigation posturing.
2. **The system is at a modern low.** Reporting as of 2026-07-19 puts Lake Powell around 22% full and Lake Mead around 27%, both the lowest in 30 years, with a May 2026 Powell inflow forecast near 13% of average. *(Secondhand — verify against RISE before publishing; see Risk R-9.)*

A tool that explains the new rules, launching as the new rules take effect, has a real audience. It also means **the operating-rules module must be versioned and swappable from day one** — betting on any single rulebook being permanent is the fastest way to be wrong by October.

---

## 1. Decisions made (with rationale)

| Decision | Choice | Why |
|---|---|---|
| **Product framing** | **Digital twin**, not dashboard | Three required characteristics: continuous ingestion, an explicit model of the system, and simulation of counterfactuals. The model is a build artifact with unit tests — charts are views onto it. This is what makes the product cohesive rather than a wall of panels. |
| **Model core** | Monthly **mass balance + policy rules engine**, with an **ML/statistical hydrology front-end** for snow→runoff | The policy layer is documented deterministic logic and is what makes "what if" credible. The genuinely uncertain part is narrow: the snow→runoff relationship, which warming has broken. See **Decision note D-1** — the ML front-end must be parsimonious, not a GBM. |
| **Model implementation** | **Hand-rolled Python** for Phase 1; evaluate `pywr` at Phase 4 | Phase 1 is two reservoirs and four release tiers — roughly 300 lines of transparent, fully testable Python. `pywr` (GPLv3) is a network-allocation LP solver that earns its keep when the node network grows to full-basin allocation with priorities. Adopting it now buys complexity we don't need and a GPL entanglement that constrains later open-sourcing. Study **Pywr-DRB** as a design precedent regardless — it is the closest real-world example of exactly this kind of reduced-form basin twin. |
| **Relationship to CRSS** | **Explicitly reduced-form. Never positioned as CRSS-equivalent.** | Reclamation's CRSS (RiverWare, CADSWES/CU Boulder) models 12 reservoirs, 29 inflow points, and ~115 aggregate diversion nodes representing 500+ users. RiverWare is commercially licensed with no self-serve purchase. We are not out-modeling Reclamation; we are building the transparent, fast, explorable thing CRSS isn't. |
| **Validation** | **Backtest against published 24-Month Study projections** | Turns credibility from a claim into a measurement. Reclamation publishes Most Probable monthly, plus Probable Min/Max quarterly (Jan/Apr/Aug/Oct). Reporting the error distribution publicly is the single strongest trust signal available. |
| **Simulation runtime** | **Server-side Python canonical; precomputed response surfaces for sliders** | One model, no duplication, no drift. Sliders interpolate a precomputed parameter sweep for instant feel; off-grid scenarios fall back to a server run on Modal. |
| **Semantic layer** | **YAML + JSON Schema measure registry**, codegen to Python / TypeScript / dbt / AI tool surface | The registry is the source of truth, not an annotation. It generates the pipeline, so semantics cannot drift from it. This is what grounds the AI layer — see §6. |
| **Storage** | **Neon Postgres + PostGIS.** Canonical `observation` table + generated marts. Raw snapshots in Cloudflare R2 | ~10–20M narrow time-series rows is unremarkable for Postgres. **TimescaleDB rejected**: Neon offers only the Apache-2 edition, without compression or continuous aggregates — the only reasons to adopt it. R2 for raw archive: free egress, 10 GB free. |
| **Orchestration** | **Dagster** (asset definitions) + **dbt** (`observation` → marts) wired via `dagster-dbt` | Dagster's asset graph, water-year partitions, freshness policies, and asset checks map directly onto the observability requirement. dbt owns the SQL transformation layer — a deliberate inclusion for learning and demo value, placed where it genuinely fits rather than bolted on. |
| **Dagster deployment** | **Library mode on GitHub Actions**, instance storage in Neon | Keeps assets, partitions, lineage, and checks at $0 with no daemon to host (the dev machine has 8GB RAM). Run history persists in Neon, so `dagster dev` locally gives the full asset graph for demos. Deploy the webserver later if always-on UI is wanted. |
| **Python host** | **GitHub Actions** (scheduled ingest) + **Modal** (ensemble/sweep compute) | Scales to zero, no always-on server. Actions minutes are metered on private repos but a daily ingest is ~150 min/month against a 3,000-minute Pro quota. |
| **Language boundary** | Python **only** in `packages/ingest` and `packages/model`. Everything user-facing is TypeScript | Documented exception to the standing "TypeScript everywhere, no Python" rule in `~/projects/CLAUDE.md`. Justified: mass balance over ensemble traces and a statistical hydrology model are squarely Python's domain, and the model must be independently testable and publishable. The boundary is enforced in the project CLAUDE.md so the exception does not spread. |
| **Frontend** | Next.js + **Observable Plot** (standard charts) + **D3** (bespoke Sankey/flow) + **MapLibre GL** | Plot is built on D3 — same mental model, ~10 lines per chart instead of 150. Hand-written D3 reserved for the signature visuals where it earns the cost. MapLibre + Protomaps/OpenFreeMap is free forever with no usage-based surprise bill; Mapbox GL v2+ is commercially licensed. |
| **Large series rendering** | **Downsample server-side**, don't add a chart library | Send the browser ~2,000 pre-aggregated points, not 100,000. A serving-layer job, correct regardless of chart library. Revisit ECharts only if profiling demands it. |
| **Repo / audience** | **Public repo, public site.** No auth in MVP | Kevin's call 2026-08-01 (deliberate exception to the private-by-default rule): all data is public-domain federal data, and a public repo is the stronger portfolio artifact. Consequences: GitHub Actions becomes free/unlimited; **Apache-2.0 LICENSE** from the first commit (patent grant + NOTICE mechanism; covers our code — the government data itself is public domain); secrets discipline from commit one (`.env.example`, `.gitignore`, pre-commit secret scan). Also retroactively validates deferring GPLv3 `pywr`. |

### Decision note D-1 — the ML hydrology front-end must be parsimonious

The chosen model core includes a trained snow→runoff front-end. **A gradient-boosted model is the wrong instrument here**, and the plan should not pretend otherwise:

- SNOTEL coverage begins in the **late 1970s** — roughly **45 water years** of training data. One observation per year for a seasonal-volume target.
- With ~45 rows, a GBM will fit noise and produce confident, wrong uncertainty bands. That failure is invisible in-sample and catastrophic for a product whose entire value proposition is honesty about uncertainty.

**The defensible version** is a regularized regression with physically motivated features — basin SWE at peak and April 1, accumulated water-year precipitation, antecedent soil moisture or prior-autumn baseflow as a proxy, and spring temperature — plus an explicit term for declining runoff efficiency, cited to the literature (Udall & Overpeck 2017; Milly & Dunne 2020; Bass et al. 2023). Cross-validate leave-one-year-out. Report prediction intervals from the residual distribution, not from the point estimate.

This still captures the "normal snowpack, weak runoff" behavior that trace resampling cannot — which was the reason for choosing the hybrid — but it does so with a model the data can actually support. Revisit richer methods only if a longer or higher-frequency training target is found.

---

## 2. Product requirements

### Audience
Informed general reader, policymaker, journalist, investor, student, technically sophisticated citizen. Wants intuitive explanation *and* access to the underlying data. Not a hydrologist, but will not tolerate being condescended to.

### The questions the product answers
1. How much water is in the system today?
2. Is the river getting healthier or weaker?
3. What is driving current conditions?
4. How do snowpack, runoff, storage, releases, and consumption connect?
5. Which states and sectors use the most water?
6. How large are proposed cuts in practical terms?
7. How much do households, farms, crops, cities, and states consume?
8. How much water is exported — by treaty, transbasin diversion, or embodied in agricultural products?
9. How do current conditions compare with history, drought periods, and paleoclimate?
10. What is likely over the next 1–24 months?

### Non-negotiable product rules
- Every number carries a **source, timestamp, unit, and definition**.
- **Diversion, withdrawal, consumptive use, depletion, return flow, and legal allocation are never interchangeable** and never silently summed.
- **Observed, estimated, modeled, forecast, and reconstructed** values are visually and structurally distinct.
- Uncertainty is shown, not hidden.
- Tribal water rights are a core part of the system, not a footnote — including the parts that are unquantified or contested.
- No partisan framing. No "agriculture is wasteful" or "cities are the problem."
- Our projections always appear alongside the official ones, labeled as independent and reduced-form.

Full treatment: **`docs/DESIGN_PRINCIPLES.md`**.

---

## 3. Architecture

```
Government APIs · PDFs · Excel
      │   Dagster assets — one per source, partitioned by date & water year
      ▼
Raw snapshot archive ── Cloudflare R2, immutable, source-timestamped
      │
      ▼
observation ── Neon Postgres + PostGIS, canonical, measure-keyed
      │
      ├──────────►  MODEL PACKAGE (Python, versioned, pure)
      │               ├─ hydrology front-end   SWE + climate → seasonal runoff
      │               ├─ mass balance          node network, monthly step
      │               └─ rules engine          tiers · treaty · priority (versioned)
      │                      │  Modal
      │                      ├─ nightly ensemble   → projection bands
      │                      ├─ monthly backtest   → vs. 24-Month Study
      │                      └─ parameter sweep    → response surface
      ▼                      ▼
   ══ dbt ══  staging → intermediate → marts  (tests, docs, lineage)
      │
      ▼
mart_reservoir_daily · mart_swe_basin_daily · mart_water_balance · mart_projection
      │
      ▼
Next.js API ── Drizzle + Zod contracts
      │
      ▼
React ── Observable Plot · D3 (Sankey/flow) · MapLibre
```

### Monorepo layout

```
apps/web/                Next.js app + API routes (routes under /colorado/...)
packages/contracts/      Generated TS types + Zod schemas  ← from measure registry
packages/ingest/         [PYTHON] Dagster assets, one module per source
packages/model/          [PYTHON] mass balance · rules engine · hydrology · backtest
                         (machinery is basin-generic; rule content & topology are config)
packages/registry/       measures/colorado/**.yaml + JSON Schema + codegen
transform/               dbt project: observation → marts
db/                      Drizzle schema (generated) + migrations
docs/                    Reference matrices (this plan's companions)
```

### The measure registry

Every dataset is a **versioned, typed asset** with explicit lineage, units, cadence, and provenance. One YAML file per measure; codegen emits Pydantic models, TypeScript + Zod contracts, the Postgres `measure` dimension, dbt `schema.yml` with tests, and the AI layer's retrieval schema.

Three fields carry the weight:

- **`accounting_concept`** — `diversion | withdrawal | consumptive_use | depletion | return_flow | delivery | storage | evaporation | loss`. Two measures sharing a unit but differing here can never be summed without a declared bridge.
- **`measurement_class`** — `observed | estimated | modeled | forecast | reconstructed | administrative`. A 7.5 MAF apportionment is a legal instrument, not a measurement of anything.
- **`temporal_semantics`** — `instantaneous | interval_total | interval_mean | end_of_period`. You cannot average an instantaneous reading or sum an interval mean.

Plus `not_comparable_with` edges that **encode the known traps as data, with reasons** — the reason string is what the UI shows when someone tries anyway.

Full specification: **`docs/DATA_MODEL.md`**.

### Model outputs are measures too

A projection is `colorado.reservoir.mead.storage` with `measurement_class: modeled`, plus `model_version`, `scenario_id`, `rulebook_version`, and `input_data_version`. Two consequences fall out free: observed history and modeled projection can legitimately share an axis because the distinction is typed rather than styled; and the backtest is a query — same measure, same period, `modeled` from a run dated T versus `observed` — not a bespoke pipeline.

---

## 4. Product phases

### Phase 1 — MVP: the vertical slice (target ~6–8 weeks)
Proves all three twin characteristics end to end on a deliberately narrow scope: **snowpack → Powell → Mead → Lower Basin deliveries.**

- **Today** — live Mead/Powell storage & elevation, combined system storage, current inflow and release, Upper Basin SWE % of median, runoff forecast, current operating tier.
- **Water Balance** — one signature visual: the connected flow from snow through runoff, storage, releases, and deliveries, with real numbers and household-scale anchors.
- **One what-if** — "cut Lower Basin use by N MAF" → Mead trajectory with uncertainty bands.
- **Backtest** — our model versus the last N published 24-Month Studies, with the error distribution shown honestly.
- **Data Explorer** — the measure registry rendered: sources, units, definitions, cadence, freshness, lineage. Links to the dbt docs site.

Distribution: public URL, no auth.

### Phase 2 — Who uses the water
State and sector consumption, the diversion/CU/return-flow distinction made visual, tribal water rights with quantified/unquantified/pending status, agriculture and the alfalfa story (Richter et al. 2024), transbasin diversions, virtual water exports, scale-anchor engine throughout.

### Phase 3 — Historical narrative and policy timeline
Paleoclimate reconstructions back to 762 CE, the 1922 Compact's wet-period baseline versus reconstructed means, the megadrought, the policy timeline (compact → dams → shortage rules → post-2026), reservoir milestones.

### Phase 4 — Scenario Lab
Full parameter surface: snowpack, temperature, runoff efficiency, state cuts, agricultural reductions, municipal demand, releases, Mexico deliveries, evaporation, conservation adoption. Time-to-threshold outputs. Rulebook selection (2007 IG/DCP vs. post-2026) as a first-class scenario input. Evaluate `pywr` here if the node network grows to full-basin allocation.

### Phase 5 — AI narrative and Q&A
Grounded in the measure registry (§6). Daily/weekly "what changed and why," anomaly flagging, natural-language Q&A, data-grounded briefings.

---

## 5. Two-week prototype plan

Deliberately front-loads the two things most likely to fail.

| Days | Work | Done when |
|---|---|---|
| **1–2** | **STEP-0 validation gates** (blocking, see §8). Verify Mead DCP tier numbers against primary Federal Register / DCP ROD text. Confirm 24-Month Study archive depth and PDF parseability. Verify current Mead/Powell storage against RISE directly. Confirm Reclamation Natural Flow file currency. | Each gate produces a written verdict. Any failure reshapes scope *before* code is written. |
| **3–4** | Measure registry schema + first ~12 measures. Codegen to Pydantic + TS/Zod. Neon provisioned, `observation` table, PostGIS enabled. | `pnpm gen` produces types; one measure round-trips YAML → DB → typed API response. |
| **5–7** | Dagster assets: RISE (Mead + Powell), USGS OGC API (Lees Ferry + 3 gauges), AWDB SNOTEL. R2 snapshotting. Asset checks for freshness and unit-range sanity. | `dagster asset materialize` populates `observation`; checks fail loudly on stale or out-of-range data. |
| **8–9** | Basin SWE % of median computed from stations (no API exists — replicate NRCS methodology, document deviations). dbt project: `observation` → `mart_reservoir_daily`, `mart_swe_basin_daily`. | Basin SWE reconciles against the NRCS map product within a stated tolerance. |
| **10–12** | Model package: mass balance + Powell/Mead rules engine (rulebook v2007-IG). Ensemble over resampled historical traces. Unit tests against known historical months. | Given Jan 2024 initial conditions, the model reproduces observed 2024 end-of-month Powell/Mead storage within tolerance. |
| **13–14** | Next.js "Today" page + first backtest chart. Deploy to Vercel. | Public URL shows live data and one honest error-distribution chart. |

The Water Balance visual, the what-if slider, and the Data Explorer land in the remainder of Phase 1 after the prototype proves the spine.

---

## 6. AI narrative layer (Phase 5, architected in Phase 1)

The requirement is "every claim grounded, no invented hydrologic facts." The registry makes that structural:

- The narrative layer has **no free-text retrieval path**. Its only tool is `get_measure(id, time_range, geography)`, returning value, unit, `measurement_class`, provenance, and caveats.
- Citations are attached to measures, not generated by the model — so a claim without a measure id is unciteable by construction.
- A request to sum across incompatible `accounting_concept` values returns a **typed rejection**, not a plausible number. The conflation failure becomes a schema violation the retrieval layer catches rather than a hallucination the prompt has to prevent.
- Semantic definitions for consumptive use, allocation, diversion, return flow, runoff, storage, and evaporation live in the registry and are injected as grounding, not restated in prompts.

---

## 7. Costs & prerequisites

| Item | Cost | Notes |
|---|---|---|
| Vercel | **$0** Hobby → **$20/mo** Pro | Hobby's ToS is non-commercial. Any monetization, donations, or ads require Pro. Hobby cron is once-daily max; Pro allows per-minute. |
| Neon Postgres | **~$5–19/mo** (Launch) | Free tier is 0.5 GB. Phase 1 estimate is ~3–9M rows ≈ 0.4–1.5 GB depending on SNOTEL station scope — **plan for Launch, not Free.** PostGIS supported. |
| Cloudflare R2 | **$0** | 10 GB free, zero egress. Raw source snapshots. |
| Modal | **$0** at this scale | Free tier covers monthly ensembles and sweeps. |
| GitHub Actions | **$0** | ~150 min/month against a 3,000-min Pro quota for private repos. |
| MapLibre + Protomaps/OpenFreeMap | **$0** | No key, no usage billing. |
| Data sources | **$0**, no approval gates | RISE, USGS, AWDB, USDM, OpenET all keyless or instant self-serve. NASS Quick Stats and NCEI CDO need free instant tokens. **No Plaid-style review delays anywhere in this project.** |
| **Total** | **~$5–40/month** | |

---

## 8. Risks

**STEP-0 blocking gates** — resolve before writing model code:

| # | Risk | Mitigation |
|---|---|---|
| **R-1** | **Mead DCP shortage-tier volumes are inconsistent across secondary sources.** Reconciling AMWUA/CAP, Colorado River Commission of Nevada, and ADWR figures produced tables that don't arithmetically agree. These numbers are central to any shortage simulation — and tier errors self-amplify: tier volumes drive Mead's elevation, which selects the next tier, so a ~100 kaf/yr error compounds to ~2 ft of elevation over 24 months, enough to flip a tier boundary and put the model in the wrong regime. | **Blocks only the Mead shortage branch of the rules engine and any projection depending on it** — not ingestion, mass balance, Powell tier logic (independently verified), hydrology regression, or the backtest harness, all of which proceed in parallel. Verify line-by-line against the primary DCP Record of Decision / Federal Register notice before encoding. Fallback: ship 2007 IG base tiers only (HIGH confidence) with the DCP overlay marked unavailable. Never guessed numbers. |
| **R-2** | **24-Month Study is PDF-only** — no machine-readable projections exist. This is the backtest data source the MVP depends on. Archive depth unverified; two research agents failed to text-extract Reclamation PDFs with standard tooling. | **Blocking.** Confirm archive depth and parseability in days 1–2. If parsing proves infeasible, the backtest narrows to however many studies can be extracted — scope it honestly rather than dropping it. |
| **R-3** | **Basin SWE "% of median" is not an API** — it's a computed NRCS map product. Sits directly on the MVP critical path. | Replicate NRCS station-weighting methodology from station-level AWDB data; document every deviation; reconcile against their published map and state the tolerance. |

**Ongoing risks:**

| # | Risk | Mitigation |
|---|---|---|
| **R-4** | **Post-2026 rules unsettled.** Final EIS published 2026-07-31, no ROD, no seven-state consensus, Arizona objects publicly, litigation posturing reported. | Rulebook as versioned swappable config, never hardcoded. Every scenario declares which rulebook it ran under. Treat as a content-versioning problem separate from the data pipeline. |
| **R-5** | **USGS legacy WaterServices API decommissioning now** — degradation from ~August 2026, decommission targeted Q1 2027. | Build against `api.waterdata.usgs.gov/ogcapi/v0/` from the first line. Never touch `waterservices.usgs.gov`, not even as a shortcut. |
| **R-6** | **ML hydrology overfitting** — ~45 water years of SNOTEL data. | Parsimonious regularized regression with physically motivated features. Leave-one-year-out CV. Intervals from residuals. See Decision note D-1. |
| **R-7** | **Evaporation is method-dependent and politically contested.** Estimates for Mead range 600–875 kaf/yr by method; California formally rejects charging system losses to Lower Basin contractors. | Never present a single evaporation number as ground truth. Expose the method as a scenario parameter. |
| **R-8** | **Definitional conflation** between agencies — Reclamation's own Upper Basin consumptive use appears as both 3.8 and 4.3 MAF depending on evaporation bucketing. | The semantic layer is the mitigation. Where agencies disagree, show both with methodology notes rather than silently picking one. |
| **R-9** | **Twin overclaiming.** Calling something a digital twin invites authority it may not have earned. | Visible validation, not disclaimers: always show our projection next to the official one, publish the backtest error distribution, label reduced-form everywhere. |
| **R-10** | **Provisional data and mid-year revisions.** Powell's WY2026 release was revised 7.48 → 6.00 MAF in April 2026 under Section 6.E. | Every value carries source and as-of date. Detect revisions via RISE `updateDate`. Never cache indefinitely. |
| **R-11** | **CBRFC forecasts and Mexico delivery data are page/PDF-only.** No API confirmed for either. | Scope as higher-effort scraping line items. The NIB gauge (09522000) real-time status is unconfirmed — verify before promising a Mexico-delivery feature. |
| **R-12** | **Reclamation Natural Flow dataset currency unconfirmed** beyond a September 2024 snapshot. Excel-only, updated ~3×/year. | Verify live during STEP-0. This is the standard series for "what the river actually produces" and is load-bearing for the historical narrative. |

---

## 9. Open research questions — answered

| Question | Answer |
|---|---|
| Which federal datasets have stable APIs vs. files only? | **Real APIs:** Reclamation RISE (keyless JSON, CORS-enabled), USGS OGC API, NRCS AWDB REST, US Drought Monitor, NCEI CDO (token), NASS Quick Stats (key), Colorado CDSS, OpenET. **Files/PDF only:** 24-Month Study, AOP, CBRFC forecasts, Consumptive Uses & Losses, Decree Accounting, Reclamation Natural Flow (Excel), NOAA paleo (flat files). |
| Which datasets are revised after publication? | Nearly all. RISE is explicitly provisional with `updateDate` for detection. USGS flags `approval_status`. Reclamation Natural Flow is "subject to change over the entire record." Lower Basin CU&L methodology changed in 2024–25 and historical values are being recalculated. |
| Best canonical source for reservoir storage and operations? | **RISE** (`data.usbr.gov/rise/api`). Mead elevation back to 1935-02-02. Note Powell (record 2362, ~15 series incl. evaporation and unregulated inflow) and Mead (record 4370, 4 series — no inflow, no evaporation) are asymmetric. |
| Best source for basin-wide consumptive use by state and sector? | **Reclamation Consumptive Uses & Losses** for the basin-wide backbone; **Decree Accounting** for authoritative AZ/CA/NV per-user detail. Both PDF/Excel. USGS water-use is the only cross-basin-comparable source but reports *withdrawals*, not consumptive use. |
| How should water years be modeled? | First-class. Water year = Oct 1 – Sep 30, named for the ending calendar year. `calendar` is a required registry field; Dagster partitions on water year. Never derive it ad hoc in a query. |
| What updates hourly / daily / monthly / annually? | Daily: RISE, USGS, SNOTEL. Weekly: Drought Monitor (Thursdays). Monthly: 24-Month Study (~15th), CBRFC official forecast (1st, Jan–Jun). Quarterly: 24MS Min/Max probable. ~3×/year: Natural Flow. Annual: Decree Accounting, AOP. 5-year: USGS water use, Census of Agriculture, CU&L. |
| What is observed vs. estimated? | Reservoir elevation and gauge discharge are observed. Storage is *derived* from elevation via a re-surveyed area-capacity table. Consumptive use is estimated. Natural flow is *reconstructed*. Allocations are administrative. The registry types all of this. |
| Where do agencies disagree? | Upper Basin consumptive use (3.8 vs 4.3 MAF, evaporation bucketing). Lees Ferry long-term natural flow (14.6 vs 14.0 MAF by method and period). Reservoir evaporation (method-dependent). Tribal quantified-rights counts (18 vs 22 tribes across sources). |
| What needs expert review? | Compact apportionment mechanics and the Law of the River; tribal rights framing (quantified vs. reserved vs. pending); the Mead DCP tier table (R-1); evaporation accounting attribution; any characterization of post-2026 alternatives while litigation is live. |

---

## 10. Companion documents

| Document | Contents |
|---|---|
| `docs/DATA_SOURCES.md` | Full data-source matrix — agency, dataset, endpoint, geography, variables, range, cadence, format, auth, reliability, caveats |
| `docs/DATA_MODEL.md` | Canonical data model, measure registry schema, `observation` table design, codegen targets |
| `docs/OPERATING_RULES.md` | The rulebook — Powell tiers, Mead shortage tiers, critical elevations, post-2026 preferred alternative, each with a confidence rating |
| `docs/DESIGN_PRINCIPLES.md` | Communicating uncertainty and scale; the scale-anchor engine; visual encoding of epistemic class |
| `docs/IA.md` | Page and interaction map for all ten sections |
| `ORCHESTRATION_PROMPT.md` | Self-contained multi-agent build spec for Phase 1 |
