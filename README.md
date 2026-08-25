# Basin

A public **digital twin** of a river system. It continuously ingests authoritative government data, models how the system actually works, and lets anyone simulate what happens if conditions change.

The **Colorado River** is the first basin.

A dashboard answers *what is happening*. A digital twin also answers *why*, *what happens next*, and *what if we change something*:

- **Continuous ingestion** — reservoir storage and elevation read live from Reclamation RISE on every page; state rights registries, decree ledgers, canal diversions, and crop layers re-baked on a schedule and committed as dated, shape-checked artifacts. Each measure is a versioned, typed registry entry with explicit units, lineage, cadence, and provenance.
- **An explicit model** — a reduced-form annual mass balance over Lake Powell and Lake Mead, coupled through a versioned rules engine that encodes the operating rules (release tiers, shortage tiers, treaty deliveries). It reproduces observed WY2024 within 0.2 MAF at Powell and 0.1 MAF at Mead, and matches the release decision exactly.
- **Simulation** — what-if scenarios with uncertainty bands, run over every rolling five-year sequence of observed water-year inflows rather than a single trace.

**This model is reduced-form and independent.** It is not affiliated with, nor equivalent to, the Bureau of Reclamation's CRSS/CRMMS models. Every projection is labeled as ours and set against the official one — the operating-rules panel prints Reclamation's 24-Month Study projection next to ours. A published backtest against those studies, including the cases where this model does worse, is the next piece of work on the model.

## Status

**Live at [basin-iota.vercel.app](https://basin-iota.vercel.app).** The first release is shipped; work continues against [`PLAN.md`](PLAN.md) and [`docs/IA.md`](docs/IA.md).

What is on the site today:

- **Live system state** — combined Powell + Mead storage against capacity with a 13-month daily series, per-reservoir elevation against the operating thresholds, the rulebook in force and its expiry, and a per-source freshness strip. Missing days render as gaps.
- **A guided story map** of the basin, plus a free-roam version with reservoirs, rivers, dams, cities, county water use, and satellite-measured consumption as separate layers.
- **Eight sourced chapters**, in reading order: the system as a whole, supply, demand, reservoirs, agriculture, infrastructure, water rights, and distribution.
- **A what-if model** you can push on: move Lower Basin conservation from 0 to 3.0 MAF and watch the trajectory bands and the water year each operating threshold gets crossed.
- **A water-rights explorer** — county aggregates across the seven basin states, 333,459 individually recorded rights served point by point with priority-year color and drill-in, the largest holders of record, and the live state trackers where rights change hands. Coverage gaps are drawn as coverage gaps.
- **An infrastructure explorer** — the aqueduct systems one at a time, every pumping plant on real terrain, and how far each one lifts the water.
- **Delivery accounting** — the largest delivery systems in Reclamation's CY2025 decree accounting, and one canal's season measured daily at the headgate.
- **Agriculture** — crop composition of the West's sixteen largest irrigation counties, mapped field by field from the USDA Cropland Data Layer.
- **A data page** rendered straight from the measure registry: every measure with its unit, accounting concept, measurement class, cadence, and source.

Not yet built, and named as such on the surfaces where they belong: snowpack, runoff-forecast, drought, and water-year precipitation tiles; the statistical snow→runoff front-end; the published 24-Month Study backtest.

## Architecture

Semantic measure registry (YAML, single source of truth) → generated TypeScript contracts, Python model constants, and the Postgres `measure` seed. CI fails on codegen drift.

Running today: Next.js on Vercel, serving live Reclamation RISE reads alongside versioned artifacts baked by scheduled GitHub Actions and committed to the repo; the Python model (`packages/model`) bakes the what-if response surface. The full pipeline described in [`PLAN.md`](PLAN.md) — Neon Postgres + PostGIS, Cloudflare R2 snapshots, Dagster + dbt, ensemble compute on Modal — is the target architecture, not yet stood up. Details: [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md).

## Data & license

All source data is public-domain U.S. government data; each measure carries its citation, and every displayed number carries its source, timestamp, unit, and accounting concept. Code is licensed [Apache-2.0](LICENSE). Nearly all figures are **provisional and subject to agency revision** — the product treats that as a feature to surface, not a caveat to hide.
