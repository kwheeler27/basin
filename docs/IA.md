# Information Architecture v2 — the backbone and its applications

> **Superseded in part (2026-09-03):** the nav and the Report-tab role are
> superseded by [decision record IA v3](decisions/2026-09-03-ia-v3-report-consolidation.md)
> — nav is Now · Explore · Data, and the chapters are the landing's
> evidence appendix. The backbone contract and surfaces below still hold.

**Supersedes the v1 topic-tab IA (Phase 1, 2026-08).** v1 mapped ten topical
sections; what shipped drifted into nine peer tabs ordered by build history,
and individual pages mixed monitoring, narrative, and exploration on one
surface (the Overview rendered the story map twice — once guided, once
free-roam — plus a live-status banner and an essay). v2 reorganizes the
product around **what the reader is doing**, not what the data is about.
The v1 section specs that remain unbuilt (Snow to River, States & Tribal
Rights, History, full Scenario Lab) are carried forward below as planned
chapters and instruments, not dropped.

---

## The model

```
                    ┌─────────────┬─────────────┬─────────────┐
   applications →   │   MONITOR   │   REPORT    │   EXPLORE   │
                    │ what's the  │ why is it   │ let me look │
                    │ state?      │ happening?  │ for myself  │
                    └──────┬──────┴──────┬──────┴──────┬──────┘
                           │             │             │
                    ┌──────┴─────────────┴─────────────┴──────┐
   backbone →       │              THE DATA                   │
                    │  trustworthy · reliable · relevant ·    │
                    │  up-to-date · consistent                │
                    └─────────────────────────────────────────┘
```

- **The backbone is the product's foundation, treated with scientific
  rigor.** Every fact on any surface traces to it. Applications make
  different presentation choices but never own private facts.
- **Monitor, Report, and Explore are applications built on the backbone.**
  They differ in what the reader is doing, not in what data they can see.
- Monitor is deliberately the smallest application: a dense strip of live
  state whose job is to prove the data is alive and current — the backbone's
  trustworthiness made visible. It must not grow into a dashboard suite;
  Report and Explore are where the product earns its existence.

## The user journey — and why the nav mirrors it

1. **What's happening, and what has been happening?** → Monitor (**Current state**)
2. **Why? What's driving the trends and their changes over time?** → **Report**
3. **Let me go explore the data myself.** → **Explore**

```
BASIN ▸ Colorado          Current state · Report · Explore · Data
```

The nav order *is* the journey. **Data** sits last as the audit surface —
where any reader, at any point in the journey, can inspect what a number is,
where it came from, and when it was last true.

---

## The backbone contract

The backbone spans multiple stores — the measure registry / Postgres time
series, geospatial bakes (`public/geo/*.json`, PMTiles), document ledgers
(decrees, change applications), and literature-derived constants (e.g. the
Richter et al. sector shares). **The contract is singular even though the
stores are plural.** Every dataset, regardless of store, carries:

| Field | Meaning |
|---|---|
| Source | Agency of record or peer-reviewed citation (primary sources only) |
| Valid time | What period the value describes |
| Publication / retrieval time | When the source published it; when we fetched it |
| Accounting concept | Where applicable — never summed across concepts without a declared bridge |
| Measurement class | observed / estimated / modeled / forecast / reconstructed / administrative |
| Revision status | Revisions are new rows/records, never in-place edits |
| Refresh cadence & freshness | Expected update rhythm; staleness surfaces, never silently served |
| Caveats & incompatibilities | Including `not_comparable_with` edges with reasons |
| Citation & download | How a reader takes it with them |

**Honest current state (2026-08):** the measure registry implements this
contract in full, but only two shipped pages draw live from it (Overview,
Reservoirs via RISE). The geo bakes are individually sourced and dated but
bespoke — no shared manifest, no freshness surfacing. Narrative constants
live hardcoded in `lib/system.ts` / `lib/markets.ts`. Bringing these under
the contract (a bake manifest; constants into the registry) is incremental
backbone work — see Sequencing.

---

## The surfaces

### `/` — the front door

Stages the journey in order. The thesis headline ("The Colorado River is
committed to delivering more water than it produces"), a **compact live
state strip** (combined storage, Powell/Mead, rulebook in force — a
condensation of Current state), then the two doorways: *read the report* (chapter
list visible, not hidden behind a click) and *explore the data* (instrument
index visible). Because mode labels are more abstract than topic labels,
the front door works harder: a reader looking for a topic ("water rights")
must find it from here in one glance.

### `/current-state` — the monitor

The v1 "Today" spec, finally a real place. Dense and small: rulebook banner,
combined storage vs. capacity with percentile-of-record, Powell and Mead
tiles (elevation, % full, operating thresholds), snowpack / runoff forecast /
drought / WY precipitation tiles, and the **per-source freshness strip**.
Every tile: value · unit · percentile · source · as-of · provisional badge.
Click-through → the measure's Data entry. No prose beyond captions.

### `/report` — the narrative spine

Ordered chapters with prev/next, readable front to back like an atlas.
Chapter titles are questions or claims (DESIGN_PRINCIPLES §1). Chapters are
essays: prose and charts, no stateful instruments embedded. Every chart
deep-links into the matching Explore instrument at the moment a reader
wants to verify or dig further.

| # | Chapter | Content (today's source) |
|---|---|---|
| 1 | The System | Guided story map, the three numbers, where the water goes (from Overview) |
| 2 | Supply | Why the river is shrinking (from `/supply`) |
| 3 | Demand | Who uses the water (from `/demand`) |
| 4 | Reservoirs | The drawdown; what happens next (from `/reservoirs`, minus the scenario widget) |
| 5 | Agriculture | What the water grows (from `/agriculture`) |
| 6 | Infrastructure | The machine, narratively (from `/infrastructure`, minus the explorer) |
| 7 | Water Rights | Property on a shrinking river: the GSC case, the watchlist story, legal geography (the essay half of `/water-rights`) |
| 8 | Distribution | Where deliveries actually went (from `/distribution`) |
| — | *Planned* | Snow to River · States, Allocations & Tribal Rights · History (v1 §§4, 7, 8) |

### `/explore` — the instruments

Full-page, data-dense, stateful destinations with an index page. Every view
state is URL-addressable and shareable. No essay prose — captions and
provenance only.

| Instrument | Content (today's source) |
|---|---|
| Basin map | The free-roam story map (`variant="explore"` from Overview) |
| Rights ledger | 617k rights drill-in, largest holders, transactions, state ledgers (the instrument half of `/water-rights`) |
| Machine explorer | One-system-at-a-time infrastructure explorer with zoom, plant cards, terrain profiles |
| Scenario lab | The what-if model (currently embedded in `/reservoirs`), grown per v1 §9 |
| *Planned* | Per-measure series explorer rendered from the registry |

### `/data` — the backbone made visible

Promoted from a peer tab to the audit surface for **everything**: registry
measures *and* geo bakes *and* document ledgers *and* literature constants,
each with its full contract fields, incompatibility edges, downloads, and
citation blocks. Rendered from the registry and (new) bake manifest so it
cannot drift from the pipeline.

---

## Migration map

| Current route | Destination(s) |
|---|---|
| `/` (Overview) | Split → front door `/` + chapter 1 + Explore basin map + state strip |
| `/supply` | `/report/supply` |
| `/demand` | `/report/demand` |
| `/reservoirs` | `/report/reservoirs`; scenario widget → `/explore/scenarios` |
| `/distribution` | `/report/distribution` |
| `/water-rights` | Split → `/explore/rights` + `/report/water-rights` |
| `/infrastructure` | Split → `/report/infrastructure` + `/explore/machine` |
| `/agriculture` | `/report/agriculture` |
| `/data` | `/data` (expanded per contract) |

The site is public and linked: every current route gets a **permanent
redirect** to its primary destination (the split pages redirect to the
Report chapter, which links its sibling instrument above the fold).

## Sequencing stance

**Applications first, backbone incrementally.** Restructure the surfaces on
top of today's bespoke bakes; adopt the backbone contract as a hard
requirement for all *new* datasets from day one; consolidate existing bakes
and constants under a manifest as they come up for refresh. Rationale: the
surface restructure is user-visible and cheap; a backbone-first
consolidation would stall visible progress for weeks with no reader benefit
until the surfaces move anyway.

## Multi-basin note

Surfaces are basin-scoped in principle (`/​colorado/report/...`), matching
the measure-ID prefixes. With one basin shipped, routes stay unprefixed;
the prefix is introduced when basin #2 arrives, with redirects.

## Cross-cutting (carried from v1, unchanged)

**Unit switcher** — global, registry-driven, rewrites every number including
anchors. **Provenance hover** — on every number, everywhere. **Glossary** —
registry-sourced, one click from any term. **Deep links** — every scenario,
chart state, and time range URL-addressable. **Freshness strip** — per-source
status; stale sources surface rather than silently serving old numbers
(lives on Current state and Data). **Rulebook banner** — persistent while the
operating framework is unsettled.
