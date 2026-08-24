# CLAUDE.md

**Basin** — a public digital twin of a river system (Colorado River first); Next.js/TS on Vercel + Neon Postgres/PostGIS + Python (Dagster ingest, simulation model) + dbt + Modal. Product context: `PLAN.md`; build spec: `ORCHESTRATION_PROMPT.md`; reference docs in `docs/`.

## Source of truth & change flow

- **GitHub (`kwheeler27/basin`, PUBLIC) is the source of truth.** The repo is public and Apache-2.0 licensed: never commit secrets, credentials, or tokens — not in code, fixtures, snapshots, or history. `.env` is gitignored; `.env.example` documents required vars.
- **Never commit directly to `main`** (branch-protected). For any change: feature branch (`feat/...`, `fix/...`) → push → `gh pr create`.
- **Branch from `main`, merge to `main`, delete the branch.** No long-lived integration branches, no stacked PRs. If a second feature finishes while the first PR is open, the fix is to merge the first — never to stack on it.
- **Small PRs, merged same-day.** Merge cadence beats review ceremony; an aging PR is where stacks and drift come from.
- **Merge authority is split by class** (agreed 2026-08-06): Kevin merges anything with product judgment, factual/public-facing claims, or money/data-integrity implications. The agent has standing authorization to merge *mechanical* PRs only: automated ledger/data re-bakes (shape-checked, data-only), dependency bumps, typo-level docs.
- **Review depth is proportional to risk**: PR descriptions must state what was tested; money-representation, data-integrity, sourcing/factual claims, and security changes get an adversarial review before merge.
- **Deploys are automatic.** The repo is GitHub-connected to Vercel (2026-08-06): merging to `main` deploys production; every PR gets a preview URL — review visual changes there before merging. Never CLI-deploy to production except in a Vercel outage; never deploy from a working branch.
- Keep PRs focused; state what was tested in the description.

## Hard rules (violations are bugs)

- **Language boundary:** Python lives ONLY in `packages/ingest/` and `packages/model/` (documented exception to the standing no-Python rule). Everything user-facing is TypeScript. Do not add Python elsewhere; do not add TS business logic that belongs in the model.
- **The measure registry (`packages/registry/`) is the single source of truth.** Pydantic models, TS/Zod contracts, the Postgres `measure` dimension, dbt `schema.yml`, and the AI tool schema are GENERATED from it. Never hand-edit generated artifacts; never define a measure's semantics anywhere but its YAML.
- **Measure IDs carry a basin prefix** (`colorado.reservoir.mead.storage`). Rulebooks are basin-scoped, versioned config — operating rules are NEVER hardcoded. Every model output is stamped with `model_version`, `rulebook_version`, `scenario_id`, `input_data_version`.
- **Never sum or compare across `accounting_concept` values** (diversion / withdrawal / consumptive_use / depletion / return_flow / delivery / storage / evaporation / loss / allocation) without a declared bridge. Never merge `measurement_class` values (observed / estimated / modeled / forecast / reconstructed / administrative) in a query or chart series without explicit distinction.
- **All stored values are in the measure's canonical unit** (acre-feet for volume). Conversion happens only at the presentation boundary via the registry's conversion table. No magic conversion constants in components.
- **Water year (Oct 1–Sep 30, named for the ending year) is a dimension, never derived ad hoc in a query.**
- **Revisions are new rows** (`revision_of`), never in-place updates. Three time columns stay distinct: `valid_time`, `publication_time`, `ingested_at`.
- **Missing data renders as a gap, never as zero.** Every displayed number carries source, as-of timestamp, unit, and accounting concept.
- **Neutral register in all narrative copy** (docs/DESIGN_PRINCIPLES.md §7): no editorial color, no imputed motive; characterizations must be attributed or self-descriptions; the facts carry the argument. Test: every sentence survives being read aloud by any party it describes.
- **Plain language in all narrative copy** (docs/DESIGN_PRINCIPLES.md §10): simple, direct, unambiguous — Money Stuff register. Say the thing, short declarative sentences, plain words wherever precision survives, define load-bearing terms inline. Test: you'd say the sentence out loud to a smart friend.
- **Primary sources only.** Data comes directly from the agency of record (federal/state/county), never through third-party aggregators or repackagers. Current known exceptions to migrate: Natural Earth river centerlines (→ USGS NHD) and us-atlas boundary TopoJSON (→ Census TIGER direct). Anything new that isn't an agency-of-record source needs Kevin's explicit sign-off.
- **Never use `waterservices.usgs.gov`** (being decommissioned) — only `api.waterdata.usgs.gov/ogcapi/v0/`. USGS site 09379910 is discontinued since 2004; use 09380000 (Lees Ferry) + RISE.
- **Desktop and mobile ship together and are verified together.** Any change to the story map requires `pnpm qa:map` (screenshots every step at BOTH viewports + a tap-through smoke test) before deploying — eyeballing only one viewport is how they drift.
- The dev machine has **8GB RAM**: no watch-mode runners, no long-lived dev servers unless asked; tests run single-run (`pytest`, `vitest run`).

## Commands

- TS: `pnpm test` (vitest run) / `pnpm typecheck` / `pnpm gen` (registry codegen — run after any registry YAML change; CI fails on drift)
- Python: `pytest` in `packages/ingest` and `packages/model` (uv-managed)
- Pipeline: `dagster asset materialize` (scheduled via GitHub Actions) / `dbt build` in `transform/`
- Seed: `pnpm seed` (UI work must not require live API access)
