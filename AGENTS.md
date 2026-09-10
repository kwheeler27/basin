# AGENTS.md

**Basin** — a public digital twin of a river system (Colorado River first); Next.js/TS on Vercel + Neon Postgres/PostGIS + Python (Dagster ingest, simulation model) + dbt + Modal. Product context: `PLAN.md`; build spec: `ORCHESTRATION_PROMPT.md`; mission: `docs/MISSION.md`; data architecture: `docs/DATA_MODEL.md`; design doctrine: `docs/DESIGN_PRINCIPLES.md`; decisions: `docs/decisions/`. Read the minimum relevant material for the task; do not load large docs merely because they exist.

This file is the contract for every coding agent. Claude Code reads it through `CLAUDE.md`; Codex, Cursor, and Copilot read it directly.

## Source of truth & change flow

- **GitHub (`kwheeler27/basin`, PUBLIC) is the source of truth.** The repo is public and Apache-2.0 licensed: never commit secrets, credentials, or tokens — not in code, fixtures, snapshots, or history. `.env` is gitignored; `.env.example` documents required vars.
- **Never commit directly to `main`** (branch-protected). For any change: feature branch (`feat/...`, `fix/...`) → push → `gh pr create`.
- **Branch from `main`, merge to `main`, delete the branch.** No long-lived integration branches, no stacked PRs. If a second feature finishes while the first PR is open, merge the first — never stack on it.
- **Small PRs, merged same-day.** Merge cadence beats review ceremony; an aging PR is where stacks and drift come from.
- **Merge authority is split by class** (agreed 2026-08-06): Kevin merges anything with product judgment, factual/public-facing claims, or money/data-integrity implications. The agent has standing authorization to merge *mechanical* PRs only: automated ledger/data re-bakes (shape-checked, data-only), dependency bumps, typo-level docs.
- **Review depth is proportional to risk**: PR descriptions state what was tested; money-representation, data-integrity, sourcing/factual claims, and security changes get an adversarial review (the `adversarial-review` skill) before merge.
- **Deploys are automatic.** The repo is GitHub-connected to Vercel (2026-08-06): merging to `main` deploys production; every PR gets a preview URL — review visual changes there before merging. Never CLI-deploy to production except in a Vercel outage; never deploy from a working branch.
- **Briefs and decisions:** features start with a four-part brief (what, why, use cases, proposed solution) traced to `docs/MISSION.md` and read by Kevin before build time; key design and technical decisions get a record in `docs/decisions/` before the build (the `feature-brief` and `decision-record` skills).

## Hard rules (violations are bugs)

- **Languages:** Python lives ONLY in `packages/ingest/` and `packages/model/`. Everything user-facing is TypeScript. Do not add Python elsewhere; do not add TS business logic that belongs in the model.
- **The measure registry (`packages/registry/`) is the single source of truth.** Pydantic models, TS/Zod contracts, the Postgres `measure` dimension, dbt `schema.yml`, and the AI tool schema are GENERATED from it. Never hand-edit generated artifacts; never define a measure's semantics anywhere but its YAML. Run `pnpm gen` after any registry YAML change; CI fails on drift (`pnpm gen:check`).
- **Measure IDs carry a basin prefix** (`colorado.reservoir.mead.storage`). Rulebooks are basin-scoped, versioned config — operating rules are NEVER hardcoded. Every model output is stamped with `model_version`, `rulebook_version`, `scenario_id`, `input_data_version`.
- **Never sum or compare across `accounting_concept` values** (diversion / withdrawal / consumptive_use / depletion / return_flow / delivery / storage / evaporation / loss / allocation) without a declared bridge. Never merge `measurement_class` values (observed / estimated / modeled / forecast / reconstructed / administrative) in a query or chart series without explicit distinction.
- **All stored values are in the measure's canonical unit** (acre-feet for volume). Conversion happens only at the presentation boundary via the registry's conversion table. No magic conversion constants in components.
- **Water year (Oct 1–Sep 30, named for the ending year) is a dimension, never derived ad hoc in a query.**
- **Revisions are new rows** (`revision_of`), never in-place updates. Three time columns stay distinct: `valid_time`, `publication_time`, `ingested_at`.
- **Missing data renders as a gap, never as zero.** Every displayed number carries source, as-of timestamp, unit, and accounting concept.
- **Narrative copy, headings, charts, and IA follow `docs/DESIGN_PRINCIPLES.md`:** §7 neutral register (no editorial color, no imputed motive; every sentence survives being read aloud by any party it describes), §10 plain language (Money Stuff register), §11 assume no prior water knowledge (`apps/web/lib/glossary.ts` is the single teaching layer — never fork a second wording), §12 headings lead with the finding and self-retract when the data stops supporting them, §13–§15 chart mechanics, IA, and visual grammar (fixed entity hues, identity never by color alone, one accounting concept per chart, honest axes, hover = tap, the landing owns the argument, URLs are commitments). Read the relevant section before writing copy or a chart; the shared rationale is the `design-doctrine` skill.
- **Primary sources only.** Data comes directly from the agency of record (federal/state/county), never through third-party aggregators or repackagers. Known exceptions to migrate: Natural Earth river centerlines (→ USGS NHD) and us-atlas boundary TopoJSON (→ Census TIGER direct). Anything new that isn't an agency-of-record source needs Kevin's explicit sign-off.
- **Never use `waterservices.usgs.gov`** (being decommissioned) — only `api.waterdata.usgs.gov/ogcapi/v0/`. USGS site 09379910 is discontinued since 2004; use 09380000 (Lees Ferry) + RISE.
- **Desktop and mobile ship together and are verified together.** Any change to the story map requires `pnpm --filter web qa:map` (screenshots every step at BOTH viewports + a tap-through smoke test) before merging — eyeballing one viewport is how they drift.
- **UI work must not require live API access.**
- The dev machine has **8 GB RAM**: no watch-mode runners, no long-lived dev servers unless asked; tests run single-run (`pytest`, `vitest run`).

## Commands

- TS: `pnpm test` (vitest run) / `pnpm typecheck` / `pnpm gen` (registry codegen) / `pnpm gen:check` (drift check, what CI runs) / `pnpm verify:rules` (rulebook contract check)
- Python: `pytest` in `packages/ingest` and `packages/model` (uv-managed)
- Pipeline: `dagster asset materialize` (scheduled via GitHub Actions) / `dbt build` in `transform/`
- Story-map QA: `pnpm --filter web qa:map`

## Working with other agents

- Claude Code and Codex may review one another's work. When reviewing another agent's implementation, optimize for independent verification rather than agreement: treat its reasoning, summaries, and recommendations as hypotheses to test against the repository, not ground truth. The procedure is the `adversarial-review` skill.
- **Codex's default role** in this repo is independent senior-engineering reviewer unless explicitly asked to implement. When implementing: obey the branch/PR flow above, preserve unrelated working-tree changes, inspect existing abstractions before introducing new ones, make the smallest coherent change, run the relevant tests, report exactly what was tested, and do not merge unless explicitly instructed.
