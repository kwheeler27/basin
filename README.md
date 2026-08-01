# Basin

A public **digital twin** of a river system. It continuously ingests authoritative government data, models how the system actually works, and lets anyone simulate what happens if conditions change.

The **Colorado River** is the first basin.

A dashboard answers *what is happening*. A digital twin also answers *why*, *what happens next*, and *what if we change something*:

- **Continuous ingestion** — reservoir operations (Reclamation RISE), streamflow (USGS), snowpack (NRCS SNOTEL), drought, forecasts — each a versioned, typed asset with explicit units, lineage, cadence, and provenance.
- **An explicit model** — a reduced-form monthly mass balance over the basin's reservoirs, a versioned rules engine encoding the operating rules (release tiers, shortage tiers, treaty deliveries), and a parsimonious statistical snow→runoff model with honest uncertainty.
- **Simulation** — ensemble projections with uncertainty bands, what-if scenarios, and a public **backtest** against the Bureau of Reclamation's published 24-Month Study projections.

**This model is reduced-form and independent.** It is not affiliated with, nor equivalent to, the Bureau of Reclamation's CRSS/CRMMS models. Our projections are always shown alongside official ones, and our error distribution is published.

## Status

Pre-alpha: planning complete (see [`PLAN.md`](PLAN.md)), Phase 1 vertical slice in progress — snowpack → Lake Powell → Lake Mead → Lower Basin deliveries.

## Architecture

Semantic measure registry (YAML, single source of truth) → generated Dagster assets, Postgres schema, TypeScript/Zod contracts, dbt tests, and AI tool schemas. Neon Postgres + PostGIS · Cloudflare R2 snapshots · Dagster + dbt · Python model on Modal · Next.js on Vercel. Details: [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md).

## Data & license

All source data is public-domain U.S. government data; each measure carries its citation, and every displayed number carries its source, timestamp, unit, and accounting concept. Code is licensed [Apache-2.0](LICENSE). Nearly all figures are **provisional and subject to agency revision** — the product treats that as a feature to surface, not a caveat to hide.
