# Tech Stack — what Basin uses, and why

Every load-bearing choice, framed against the options considered and the trade-offs accepted. Companion to `WATER_RIGHTS_DESIGN.md` (which covers rights-specific decisions D1–D10) and `PLAN.md` (original architecture). Status marks: **in use** / **planned** / **deferred behind a trigger**.

## Languages & repo shape

| Choice | Instead of | Why |
|---|---|---|
| **TypeScript everywhere user-facing; Python scoped to `packages/ingest` + `packages/model`** (in use) | all-TS, or all-Python | TS is the house standard (typed end-to-end with the app); Python earns its two enclaves where its ecosystem is genuinely better — numeric modeling and ETL. The boundary is a hard rule so the split can't creep. Trade-off: two toolchains in CI — accepted, gated by the same workflow. |
| **pnpm monorepo** (in use) | multi-repo; npm/yarn | One atomic change across registry → contracts → app (the codegen doctrine requires same-PR consistency). pnpm for workspace speed and strictness. |
| **Registry-style codegen: JSON Schema + YAML → generated TS/Python/SQL** (in use: measures, rights) | zod-first types; protobuf/OpenAPI; hand-kept parallel types | Semantics (units, accounting concepts, seniority bases) are *data*, defined once, emitted into both languages with a CI drift gate. zod-first would make TS the master and Python a copy; protobuf is transport-shaped, not semantics-shaped. Trade-off: we maintain a small generator — ~500 lines that prevent whole classes of cross-language drift. |

## Web framework & hosting

| Choice | Instead of | Why |
|---|---|---|
| **Next.js (App Router) on Vercel** (in use) | Remix, SvelteKit, Astro; self-hosted | Server components + static generation fit a read-only, baked-data product; Vercel gives zero-ops hosting, ISR for live RISE reads, and previews once the GitHub connection lands. Trade-off: platform coupling — accepted at this scale; everything below the app layer is portable files. |
| **Static-first delivery: production never queries agencies at request time** (in use) | live proxying/SSR against agency APIs | Agency uptime and WAFs (we've been 403'd and Incapsula-challenged mid-day) can never take the site down; freshness is a *build-time* property with visible as-of stamps. The only runtime fetches are Reclamation RISE reads on ISR'd pages, with explicit unavailable states. |

## Data: storage & backend

There is deliberately **no runtime database today**. The "backend" is a bake pipeline producing versioned files.

| Tier | Choice | Instead of | Why |
|---|---|---|---|
| Runtime data | **Committed JSON artifacts in `public/geo/`** (in use) | Postgres + API routes | Artifacts are small (each ≤ ~150KB by gate), diffable in PRs (a data refresh *is* a reviewable diff), cacheable on the CDN, and reproducible. A DB adds ops, cold paths, and an uptime dependency for data that changes weekly. |
| Build-time analytics | **DuckDB inside the pipeline** (in use, rights) | hand-rolled JS aggregation; Postgres | Real SQL over Parquet/CSV with zero servers — "database at build time, files at run time." Runs on the 8GB dev machine and in Actions. |
| Interchange | **Parquet for normalized datasets** (in use, rights) | CSV/JSONL only | Typed columns, compression, direct DuckDB/tippecanoe consumption. Raw agency payloads are still kept verbatim (JSONL/CSV) beside it. |
| Raw snapshots & big artifacts | **Object storage (Cloudflare R2 or Vercel Blob), date-keyed** (planned, Phase 1+) | git/LFS; refetch-on-demand | Agencies migrate and delete (eWRIMS→CalWATRS); refetch is not reproducibility. Git would bloat a public repo. Pennies per month. |
| Relational DB | **Neon Postgres + PostGIS — deferred behind an explicit trigger** | adopting now | The original architecture's home for observations; it becomes right when interactive cross-state queries (search-by-owner, arbitrary filters) or the observation store outgrow files. Adopting infrastructure before its query pattern exists is ops without payoff. |
| Orchestration | **GitHub Actions cron → PR** (in use) · **Dagster** (deferred) | Dagster/Modal now | Actions gives scheduling, logs, secrets, and a human merge gate with zero extra services. Dagster's asset graph (the original plan, and a stated learning goal) earns adoption when dependencies between assets — not calendars — become the scheduling problem. |

## Visualization & geographic rendering

| Choice | Instead of | Why |
|---|---|---|
| **Hand-built D3 (`d3-geo`) SVG stages** (in use: Overview, all charts, AZ basins map) | Mapbox GL/MapLibre, Leaflet, deck.gl; chart libs (Observable Plot, ECharts, vega) | The product's register is NYT-print: one hue per view, still at rest, typography-first, every mark bespoke to its argument (`docs/MAP_DESIGN.md`). General-purpose map/chart libraries fight that register (basemaps, default interactions, style layers) and add hundreds of KB for capabilities we don't use. SVG + React server/client components keep marks inspectable and testable. Trade-off: we hand-roll interactions (playback, camera-pan, tap sheets) — the qa:map harness exists precisely to keep that honest on both viewports. |
| **Conic conformal projection, fitted frames, camera-pan on mobile** (in use) | Web-Mercator defaults | Mid-latitude accuracy for a basin-scale story; constant portrait frame with translation (never mid-scroll resizes) came directly from mobile field-testing. |
| **topojson-client + TopoJSON/GeoJSON artifacts** (in use) | shapefiles at runtime; PostGIS tiles | Small, static, versioned geometry; spherical-winding guards handle ArcGIS ring order. |
| **MapLibre GL + PMTiles** (planned — rights Phase 3, design D1/D2) | tile server; Mapbox GL (license) | The only layer that *needs* WebGL is ~1M point drill-in. PMTiles = whole tile pyramid in one static file over HTTP range requests — no server, static-first preserved. MapLibre is the open-license GL renderer. Gate: it ships only when styled to match the house register. |
| **Playwright** (in use) | Cypress; manual checking | Scripted both-viewport screenshot + tap-through gates (`pnpm qa:map`); also our workhorse for verifying rendered output before any deploy. |

## Data acquisition

| Choice | Instead of | Why |
|---|---|---|
| **Direct agency endpoints, per-source adapters, identified UA** (in use) | aggregator APIs (waterdata vendors) | Primary-sources rule: agency-of-record or nothing (`docs/AGENCY_ATLAS.md` grades every source). Adapters carry shape assertions that fail builds loudly on drift. |
| **curl-class HTTP + bulk files; no headless-browser scraping** (in use) | Playwright-scraping gated sites | We consume *published* interfaces (REST, bulk CSV, plain HTML tables). When a front door is bot-gated (azwater.gov, today's Incapsula on CA GIS) we use the agency's other published channel (their ArcGIS org, their CKAN portal) — never challenge circumvention. |

## Model & correctness

| Choice | Instead of | Why |
|---|---|---|
| **Python mass-balance model + versioned rulebook-as-data; TS evaluator generated with 70-vector parity tests** (in use) | single-language model; hardcoded rules | Operating rules are law, encoded per-instrument wording as config; the browser never runs Python — it reads baked response surfaces. Parity vectors make the two engines provably identical. |
| **Real-fixture testing, no mocks** (in use) | mocked HTTP tests | Adapters are tested against captured agency payloads — the thing that actually breaks. Validation gates (WY2024 reproduction; per-state control totals for rights) sit between data and publication. |
| **GitHub Actions CI: registry drift, typecheck, rules parity, ingest/model tests** (in use) | none / per-machine checks | Cold-build CI catches what warm local caches hide (typed-routes taught us this the hard way). Checks are part of merge policy. |

## Not used, deliberately

- **Auth (Clerk etc.)** — public read-only product; no accounts, no PII collected.
- **Client state/data libraries (Redux, TanStack Query)** — server components + small `useState` islands cover current interactivity.
- **CSS frameworks (Tailwind, shadcn)** — one hand-written `globals.css` implements the print register; a utility framework would fight it. Revisit only if contributor count grows.
- **Third-party analytics** — none; no tracking on a public-records product.
