# Information Architecture & Interaction Map

**Phase 1 (MVP) ships §1, §2, §9-lite, §10.** The rest are mapped so the seams exist from the start.

---

## Global shell

```
┌──────────────────────────────────────────────────────────────────┐
│  BASIN ▸ Colorado   Today · Balance · Reservoirs · Snow · Use    │
│                     Ag · States · History · Scenarios · Data     │
│                                                [units: AF ▾]     │
├──────────────────────────────────────────────────────────────────┤
│  ⚠ Operating rules in force: 2007 IG + 2019 DCP (expires Sep 30) │
│    Post-2026 Final EIS published Jul 31 2026 — no ROD yet   [→]  │
└──────────────────────────────────────────────────────────────────┘
```

Persistent: **unit selector** (acre-feet · gallons · liters · m³ · household-years) rewrites every number live via the registry's conversion table. **Rulebook banner** states what's in force — earns its place while the framework is unsettled.

---

## 1. Today  *(MVP)*

```
┌─ How much water is in the system today? ────────────────────────┐
│                                                                  │
│   COMBINED STORAGE          ▁▂▃▄▅▆▇ ▇▆▅▄▃▂▁                     │
│   ██████░░░░░░░░░░░  33%    2000 ──────────────── 2026          │
│   19.2 MAF of 58.5 MAF      ↓ 6 pts vs. one year ago            │
│   provisional · RISE · 2026-07-30                                │
│                                                                  │
│  ┌── LAKE POWELL ──────────┐  ┌── LAKE MEAD ───────────────┐   │
│  │  3,5xx.x ft    22% full │  │  1,04x.x ft     27% full    │   │
│  │  ▁▂▃▅▇ percentile: 2nd  │  │  ▁▂▃▅▇ percentile: 3rd      │   │
│  │  ── min power 3,490 ─── │  │  ── min power 950 ────────  │   │
│  │  ── dead pool 3,370 ─── │  │  ── dead pool 895 ────────  │   │
│  │  in 7.48 → out 6.00 MAF │  │  Tier 1 shortage (CY2026)   │   │
│  └─────────────────────────┘  └─────────────────────────────┘   │
│                                                                  │
│  ┌─ SNOWPACK ──┐ ┌─ RUNOFF FCST ┐ ┌─ DROUGHT ─┐ ┌─ WY PRECIP ┐ │
│  │  xx% median │ │  13% of avg  │ │ D3 · 62%  │ │  xx% avg   │ │
│  │  (Jul: n/a) │ │  CBRFC Apr–Jul│ │ of basin  │ │            │ │
│  └─────────────┘ └──────────────┘ └───────────┘ └────────────┘ │
│                                                                  │
│  ┌─ WHAT CHANGED AND WHY ────────────────── [Phase 5: AI] ────┐ │
│  │  Every claim links to a measure id. No free-text retrieval.│ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

Every tile: value · unit · percentile-of-record · source · as-of · provisional badge. Click → the measure's Data Explorer entry.

---

## 2. The Water Balance  *(MVP — the signature visual)*

The one view that proves the thesis. A Sankey where **width is volume** and the reader can see the imbalance.

```
  SNOWPACK          RUNOFF        POWELL         MEAD        DELIVERIES
  ────────          ──────        ──────         ────        ──────────
  Upper Basin ═══╗
  SWE            ║══► Unregulated ═══╗
  xx% median     ║    inflow         ║══► STORAGE ══╗
                 ║    xx% of avg     ║    ▼ falling ║══► STORAGE ═══╦══► California 4.4
  Precip     ════╝                   ║              ║    ▼ falling  ╠══► Arizona   2.8
                     ┌───────────────╨──┐           ║               ╠══► Nevada    0.3
                     │ evaporation ~0.4 │           ║               ╠══► Mexico    1.35
                     │ ← method-dependent│          ║               ╠══► evap ~0.6
                     └──────────────────┘           ║               ╚══► losses
                                                     ║
   ⚠ OUT EXCEEDS IN ──────────────────────────────────┘
     the gap is drawn to scale and labeled in household-years
```

**Interactions:** hover a flow → volume in the active unit + scale anchors + source. Click → drill to that component. Toggle *this year* / *10-yr average* / *pre-2000 average* to watch the structural deficit appear. Toggle `accounting_concept` visibility so diversion vs. consumptive use vs. return flow are separable, never merged.

---

## 3. Reservoir Explorer

Per reservoir (Mead, Powell first; Flaming Gorge, Navajo, Blue Mesa later): elevation and storage with historical percentile bands, operating thresholds as reference lines, inflow/outflow, storage trend, forecast range, and analog-year comparison ("2026 most resembles ___"). Powell has ~15 RISE series including evaporation; **Mead has only 4** — the UI must degrade honestly where series don't exist.

## 4. Snow to River

The causal explainer for why normal snowpack no longer means normal runoff.

```
  SWE ──┐
  Precip ─┤
  Soil moist ─┼──► RUNOFF EFFICIENCY ──► Forecast inflow ──► Actual
  Temp ──┘         ▼                        vs.
              declining trend, ~9.3%/°C   (skill shown honestly)
              Milly & Dunne 2020
```

Scatter of SWE vs. subsequent runoff, colored by decade — the visual proof that the relationship has shifted. Model coefficients and CV skill shown, not hidden.

## 5. Who Uses the Water

Breakdown by state, basin, sector, crop, provider, and legal entitlement — with `accounting_concept` as an explicit, switchable dimension. Scale anchors throughout. Where agencies disagree (Upper Basin CU: 3.8 vs 4.3 MAF), both are shown with methodology notes.

## 6. Agriculture

Irrigated acreage, crop mix, water applied per acre, estimated consumptive use, alfalfa and forage share, crop value, water productivity, virtual water exports. Leads with **why alfalfa persists** before quantifying its cost. Richter et al. 2024 as the citable spine: 52% agriculture, alfalfa alone >5 MAF/yr ≈ 26% of everything consumed, 90% of Upper Basin irrigation water to cattle feed.

## 7. States, Allocations & Tribal Rights

Per state: legal allocation, historical and current use, consumptive use, sectors, projects, seniority, transbasin diversions, trend. **Tribal rights are structural here, not a sidebar** — 30 tribes, quantified/unquantified/pending as first-class states, the pending Northeastern Arizona settlement flagged as *not enacted*.

## 8. Historical Timeline

Compact · dams · reservoir filling · droughts · policy changes · shortage rules · conservation agreements · climate trends, overlaid on reconstructed and observed flow back to 762 CE. The 1922 Compact's ~16.4 MAF assumption drawn against the ~14.6 MAF reconstructed mean and the ~12.4 MAF modern average — the structural problem in one image.

## 9. Scenario Lab  *(MVP: one slider; Phase 4: full)*

```
┌─ INPUTS ──────────────────┐   ┌─ OUTPUTS ─────────────────────┐
│ Rulebook  [2007 IG ▾]     │   │  Mead trajectory              │
│ Snowpack     ──●────  85% │   │   ▔▔▔╲▁▁▁ P90                 │
│ Temperature  ──●──   +1°C │   │      ╲▁▁▁▁ P50                │
│ LB cut       ●─────  0 MAF│   │       ╲▁▁▁▁▁ P10             │
│ Ag reduction ●─────    0% │   │  ── min power ──────────────  │
│ Evap method  [BREB ▾]     │   │  ── dead pool ──────────────  │
│                           │   │                               │
│ [run exact scenario]      │   │  Time to min power: xx months │
└───────────────────────────┘   │  ≈ x.x M household-years      │
                                 └───────────────────────────────┘
   sliders interpolate a precomputed surface → instant
   off-grid combinations → server run on Modal
   every output stamped: model_version · rulebook_version · input_data_version
```

**MVP scope:** one slider (Lower Basin cut), Mead trajectory, uncertainty band, time-to-threshold.

## 10. Data Explorer  *(MVP)*

**Rendered directly from the measure registry** — it cannot drift from the pipeline. Per measure: definition, accounting concept, measurement class, temporal semantics, canonical unit, source and endpoint, historical coverage, cadence, last refresh, revision status, caveats, `not_comparable_with` edges with reasons, CSV/JSON download, citation block. Links to the hosted **dbt docs** lineage graph.

---

## Cross-cutting

**Unit switcher** — global, registry-driven, rewrites every number including anchors.
**Provenance hover** — available on every number, everywhere.
**Glossary** — registry-sourced, one click from any term.
**Deep links** — every scenario, chart state, and time range is URL-addressable and shareable.
**Freshness strip** — per-source status; stale sources surface rather than silently serving old numbers.
