# The Rulebook

Operating rules the model must encode. **Every entry carries a confidence rating.** Rules are stored as versioned config (`rulebook` + `rule` tables), never hardcoded — the rulebook in force is changing this quarter, and every scenario must declare which version it ran under.

**Verified 2026-07-31.**

---

## ⚠️ Status: the rulebook is being rewritten

| Instrument | Expires | Status |
|---|---|---|
| 2007 Interim Guidelines | **2026-09-30** (end of WY2026) | In force now |
| 2019 Drought Contingency Plan | **2026-09-30** | In force now |
| Minute 323 (as extended by Minute 330) | **2026-12-31** | In force; successor not negotiated |
| Post-2026 Operations | — | **Final EIS published 2026-07-31. No Record of Decision.** |

As of 2026-07-31: no ROD issued, no seven-state consensus, Arizona publicly calls the shortage sideboards "unacceptable," California seeks more explicit mandatory cuts, and multiple outlets report both Arizona and Colorado bolstering legal teams over 1922 Compact compliance. **The post-2026 rules may be altered by litigation even after a ROD issues.**

**Implication:** ship with at least two selectable rulebooks (`v2007-ig-dcp`, `v-post2026-preferred`), and treat rulebook content as a versioning problem separate from the data pipeline.

---

## 1. Lake Powell release tiers — 2007 Interim Guidelines

**Confidence: HIGH.** Read directly from Reclamation's primary fact sheet, *"Lake Powell Operations, Equalization and the Interim Guidelines"* (June 2011; rule structure unchanged through WY2026).

| Tier | Trigger — Jan 1 projected Powell elevation | Release rule |
|---|---|---|
| **Equalization** | At or above the year-specific Equalization Elevation (an annual table in the Guidelines; historical examples 3,636–3,666 ft) | Release **>8.23 MAF**; equalize contents with Mead, or avoid spills |
| **Upper Elevation Balancing** | Below equalization elevation, **≥ 3,575 ft** | Release **8.23 MAF**. **If Mead < 1,075 ft**: balance contents, release **7.0–9.0 MAF**. Can shift back to Equalization if the April 24-Month Study projects reaching the equalization elevation (release may then exceed 9.0 MAF) |
| **Mid-Elevation Release** | **< 3,575 ft, ≥ 3,525 ft** | Release **7.48 MAF**. **If Mead < 1,025 ft**: release **8.23 MAF** instead |
| **Lower Elevation Balancing** | **< 3,525 ft** | Balance contents, release **7.0–9.5 MAF** |

> The primary source is internally inconsistent on the third tier's name — "Mid-Elevation Balancing Tier" in prose, "Mid-Elevation Release Tier" in the table header. Same tier.

**Precedent for mid-year revision:** WY2026's release was set at 7.48 MAF in August 2025, then **revised to 6.00 MAF on 2026-04-17** under §6.E of the 2024 Interim Guidelines SEIS ROD, to protect Powell's elevation. The model must accommodate within-year rule-driven adjustments.

---

## 2. Lake Mead shortage tiers

### 2007 Interim Guidelines base tiers — **confidence: HIGH**

| Level | Mead elevation | Arizona | Nevada | California |
|---|---|---|---|---|
| 1 | 1,050 – 1,075 ft | −320,000 AF | −13,000 AF | 0 |
| 2 | 1,025 – 1,050 ft | −400,000 AF | −17,000 AF | 0 |
| 3 | below 1,025 ft | −480,000 AF | −20,000 AF | 0 |

### Combined 2007 IG + 2019 DCP + Minute 323 — ✅ **confidence: HIGH. PRIMARY-VERIFIED 2026-08-01 (gate G1 closed).**

Every cell traces to a primary document: 2007 ROD §XI.G.2.D (pp. 36–37); LB DCP Exhibit 1 ("LBOps") §III.B–C — whose own Table 1 (p. 5) publishes the IG+DCP combined columns verbatim; Minute 323 §III.A (p. 4) and §IV first/second tables (p. 7), read directly from the IBWC scanned original.

All figures kaf. DCP contributions apply from ≤1,090 ft; IG shortages from ≤1,075 ft.

| Projected Jan 1 Mead elevation | AZ (IG+DCP) | NV (IG+DCP) | CA (DCP) | **US LB total** | MX §III.A reduction | MX §IV savings | **MX total** | **Grand total** |
|---|---|---|---|---|---|---|---|---|
| ≤1,090 & >1,075 | 0+192 = **192** | 0+8 = **8** | 0 | **200** | 0 | 41 | **41** | **241** |
| ≤1,075 & ≥1,050 | 320+192 = **512** | 13+8 = **21** | 0 | **533** | 50 | 30 | **80** | **613** |
| <1,050 & >1,045 | 400+192 = **592** | 17+8 = **25** | 0 | **617** | 70 | 34 | **104** | **721** |
| ≤1,045 & >1,040 | 400+240 = **640** | 17+10 = **27** | **200** | **867** | 70 | 76 | **146** | **1,013** |
| ≤1,040 & >1,035 | 400+240 = **640** | 17+10 = **27** | **250** | **917** | 70 | 84 | **154** | **1,071** |
| ≤1,035 & >1,030 | 400+240 = **640** | 17+10 = **27** | **300** | **967** | 70 | 92 | **162** | **1,129** |
| ≤1,030 & >1,025 | 400+240 = **640** | 17+10 = **27** | **350** | **1,017** | 70 | 101 | **171** | **1,188** |
| ≤1,025 | 480+240 = **720** | 20+10 = **30** | **350** | **1,100** | 125 | 150 | **275** | **1,375** |

**Why secondary sources appeared to disagree:** they silently summed two legally distinct Mexico mechanisms. Minute 323 §III.A imposes **unrecoverable delivery reductions** (50/70/125 kaf); §IV adds **recoverable water savings** (41/30/34/76/84/92/101/150 kaf) that Mexico can recover when the August 24-Month Study projects Mead ≥ 1,110 ft on Jan 1. The model must keep them separate — different `accounting_concept`, different recovery dynamics. Cross-check from the Minute itself: it restates the US IG reductions as 333/417/500 kaf = exactly AZ+NV (320+13 / 400+17 / 480+20). ✓

**Rules-engine encoding notes (from primary text):**
- **Trigger:** the projected January 1 Mead elevation from the **August** 24-Month Study, most-probable inflows (ROD §XI.F.1 p. 29; LBOps §III.A p. 2; Minute 323 §II.B/III.B).
- **Interval semantics differ by instrument** — encode each instrument's own wording, do not normalize: §IV bands are open-below ("at or below X **and above** Y"); §III.A's first band is closed-both ("at or below 1,075 **and at or above** 1,050"). Measure-zero in practice; encoded faithfully anyway.
- **Mexico's Water Reserve mechanics** (Minute 323 §V.E, p. 9): creation ≤250 kaf/yr through 2026-12-31; delivery from reserve ≤200 kaf/yr; unavailable below 1,025 ft; **3% evaporation deduction annually on Dec 31** (waived when Mead < 1,025 on Jan 1); total annual scheduled delivery to Mexico capped at **1.7 MAF**.
- **Sunset (primary wording):** IG terminates **December 31, 2025 "(through preparation of the 2026 AOP)"** (ROD §8.C p. 58) — i.e., it governs operations through 2026 but no future AOPs; DCP contributions run through the same date (LBOps §III.B, §V.C); certain ICS accounting provisions persist to 2036/2057. Minute 323 runs through **2026-12-31**.
- One residual gap, immaterial to the model: the full LB DCP Agreement (Attachment B) parent document was confirmed and cached but not exhaustively read; all numeric content comes from its operative Exhibit 1.

**Current status:** CY2026 is a **Tier 1 shortage**, declared from the August 2025 24-Month Study on a projected 2026-01-01 Mead elevation of **1,055.88 ft**. *(Confidence: high — Reclamation news release 5211.)*

---

## 3. Critical elevations

| Elevation | Meaning | Confidence |
|---|---|---|
| Powell **3,370 ft** | Dead pool — 0 MAF active storage, no gravity release | **HIGH** — appears directly in Reclamation's own tier table |
| Powell **3,490 ft** | Minimum power pool — Glen Canyon stops generating | **MEDIUM** — convergent secondary sources attributing to Reclamation; not independently primary-confirmed |
| Mead **950 ft** | Minimum power pool — Hoover | **MEDIUM-HIGH** — ADWR primer + convergent sources |
| Mead **895 ft** | Dead pool | **MEDIUM-HIGH** — consistent across sources, not read in a primary document |

Verify the three non-HIGH values against primary Reclamation documents before displaying them as thresholds on a chart.

---

## 4. Post-2026 preferred alternative

**Confidence: HIGH** for the parameters (DOI press release, 2026-07-31, fetched directly). **No ROD — these are proposed, not in force.**

- **Adaptive framework through 2036**, guidelines revisited at ~2-year intervals, explicitly preserving room for a future consensus interstate agreement to supersede it.
- **Lake Powell annual releases: 5.0 – 12.0 MAF** (vs. the ~8.23 MAF historic baseline).
- **Lower Basin shortage allowance: up to 3.0 MAF.**
- **Conserved-water storage pools: 8.0 MAF at Powell, 3.0 MAF at Mead.**
- **Voluntary Upper Basin conservation: up to 200,000 AF** (CO, NM, WY, UT combined).

These closely track the "Supply-Driven Alternative" from the January 2025 Alternatives Report (4.7–12 MAF Powell releases, 200 kaf Upper Basin pool), strongly suggesting the preferred alternative is built on it — though no primary text was found stating that explicitly.

**NEPA timeline:** process began June 2023 · Alternatives Report 2025-01-17 (five alternatives) · Draft EIS 2026-01-09 · comment period 2026-01-16 to 2026-03-02 (~785 unique submissions + 17,000+ form letters) · **Final EIS 2026-07-31**.

---

## 5. Evaporation and system losses

⚠️ **Never present a single number as ground truth.** Expose method as a scenario parameter.

| Quantity | Value | Confidence |
|---|---|---|
| Powell + Mead combined | ~1.135 MAF/yr at full pool | Medium |
| Basin-wide reservoir evaporation | ~1.4–1.5 MAF/yr (~10% of natural flow) | Medium |
| Lake Mead alone | **600,000 – 875,000 AF/yr depending on method** | Medium |
| Lake Powell alone | ~386,000 AF/yr (older estimate) | Low-Medium |
| LB mainstream evaporation | ~860,000 AF/yr (2017–2021 avg, Mead→border) | Medium |
| LB natural vegetation ET | ~445,000 AF/yr | Medium |

Methods differ materially: Eddy Covariance, Bowen Ratio Energy Balance, and mass-transfer approaches give different answers. Reclamation is working with USGS and the Desert Research Institute to improve measurement.

**The political question is unresolved and is itself a scenario dimension.** California's DWR has formally rejected charging evaporation and system losses as consumptive use against individual Lower Basin contractors, arguing it should be treated as a diminution of available supply. A May 2026 Lower Division States proposal moved toward a flat **~3% annual evaporation-loss factor** in some accounting contexts — a negotiating artifact, not settled law.

---

## 6. Official models (for positioning and validation, not reimplementation)

**CRSS** — Reclamation's long-term (5–50 yr) monthly planning model in **RiverWare** (CADSWES, CU Boulder). 12 reservoirs (9 Upper, 3 Lower), 29 inflow points, ~115 aggregate diversion nodes representing 500+ users. Probabilistic runs: **113 traces** (Full Hydrology, resampled 1906–2018) or **31 traces** (Stress Test, resampled 1988–2018, ~10% drier).

**RiverWare** is commercially licensed with **no self-serve purchase** — licensing goes through CADSWES and CU's Tech Transfer Office. Only pricing found was stale 2008 figures (~$6,500 government/commercial, ~$3,000 academic). Budget weeks, not days, if you ever want to run it. *Given the reduced-form goal, you almost certainly don't.*

**CRMMS** — consolidated the 24-Month Study and MTOM in **August 2021**. Two modes:
- *24-Month Study mode* — 1–2 year horizon, single trace, published monthly (~15th) as Most Probable, plus quarterly (Jan/Apr/Aug/Oct) Probable Minimum (10th pct) and Probable Maximum (90th pct).
- *Ensemble mode* (CRMMS-ESP, successor to MTOM) — 5-year horizon, driven by an ensemble of CBRFC ESP unregulated-inflow forecasts (~35 traces historically cited).

**CBRFC method** — SNOW-17 snow model + Sacramento Soil Moisture Accounting (Sac-SMA), run in Ensemble Streamflow Prediction mode: current conditions forced forward with ~30 years of historical temperature and precipitation traces. Reference period updated to 1991–2020. 143 forecast points in the basin.

### Useful tooling

CU Boulder's **BoulderCodeHub** publishes open-source R packages around RiverWare I/O: `CRSSIO` (manipulate CRSS inputs), `RWDataPlyr` (read `.rdf`/`.csv`/`.nc` output), and **`rdf2rise`** (convert RiverWare output to RISE JSON). These handle RiverWare *files* — they do not let you run CRSS without a license — but `rdf2rise` is worth knowing about if CRSS output ever becomes available.

Reclamation also published an interactive **Post-2026 Operations Explorations Web Tool** (`usbr.gov/ColoradoRiverBasin/post2026/alternatives/webtool.html`) letting stakeholders configure alternatives and run them through CRSS within a constrained scenario space.

---

## 7. Open-source modeling options

| Tool | License | Language | 2026 status | Native reservoir rules? | Fit |
|---|---|---|---|---|---|
| **pywr** | GPLv3 | Python (Cython) | Active; **Pywr-DRB** (Delaware Basin twin, v2.0.0 in 2025) is a directly comparable precedent | Yes — LP network allocation with per-timestep rules | Strong for Phase 4. **GPL is a consideration** if open-sourcing later. |
| pywr-next | — | Rust + Python | Maintainers say "not ready beyond development and experimentation" | In development | Watch, don't depend |
| **HEC-ResSim** | Public domain (USACE) | Java GUI, Jython-scriptable | Actively distributed | Yes — purpose-built for reservoir regulation | Free and rule-native, but a Windows-oriented desktop tool, not a Python library |
| WEAP | ~$2,000 commercial | Proprietary desktop | SEI-maintained | Yes | Free tier only for developing-country nonprofits — doesn't apply |
| **StateMod** + `statemodify` | Open source (CWCB/DWR + PNNL) | Fortran core, Python wrapper | Active (PNNL IM3) | Yes, but Colorado intrastate allocation | Good Upper Basin depletion reference; not a Powell-Mead model |
| Pyomo | BSD-3 | Python | Active | No — generic optimization | Useful as an LP engine if building rules yourself |
| Utah State exploratory CRB model | **Unclear** | Python | Academic (ASCE JWRPM 2023) | Yes — approximates CRSS-style rules | ⚠️ **Could not confirm a public repo or license.** Don't assume reusable code exists. |
| CRiSPPy (Argonne, for WAPA) | **Unclear** | Python | Active 2024–25 | Yes, but CRSP hydropower scheduling | Likely not publicly redistributable |

**No fully public, actively maintained, license-clear reimplementation of the Powell/Mead rule set exists.** Pywr-DRB is the closest precedent for the *approach*, on a different basin.

**Phase 1 decision: hand-roll it.** Two reservoirs and four release tiers is ~300 lines of transparent, fully testable Python. Transparency *is* the product. Revisit `pywr` at Phase 4 when the network grows to full-basin allocation with priorities — and weigh GPLv3 against open-sourcing plans at that point.

---

## 8. What would be overclaiming

- Calling anything here **CRSS-equivalent**. CRSS's 500+ demand points, 12-reservoir coordinated operations, and Reclamation's institutional calibration are not reproducible by a small team.
- Presenting **any tier table as settled policy**. It expires this fiscal year, the granular DCP numbers are internally inconsistent across authoritative secondary sources, and post-2026 is contested.
- Presenting **a single evaporation number** as ground truth — the science acknowledges method-dependent results and the accounting question is explicitly unsettled.
- Presenting **paleo reconstructions as measurements**. They are `measurement_class: reconstructed`, with method differences worth footnoting (Meko 2007 uses tree-ring regression; Gangopadhyay 2022 uses a KNN drought-atlas approach).
