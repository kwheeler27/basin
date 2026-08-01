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

### Combined 2007 IG + 2019 DCP + Minute 323 — ⚠️ **confidence: MEDIUM. DO NOT ENCODE AS-IS.**

| Band | Arizona | Nevada | California | Mexico | LB + Mexico |
|---|---|---|---|---|---|
| Tier 0 · 1,075–1,090 | — | — | — | ~30–41 kaf | ~30–41 kaf |
| Tier 1 · 1,050–1,075 | ~512,000 | ~21,000 | 0 | ~80,000 | ~613 kaf |
| Tier 2a · 1,045–1,050 | ~592,000 | ~25,000 | 0 | ~104,000 | ~721 kaf |
| Tier 2b · 1,040–1,045 | ~640,000 *(est.)* | ~25–27,000 *(est.)* | 200,000 | ~146,000 | ~1,013 kaf |
| Tier 2c · 1,035–1,040 | *(unconfirmed)* | *(est.)* | 250,000 | ~154,000 | ~1,071 kaf |
| Tier 3 · below 1,025 | ~720,000 | ~30,000 *(est.)* | 350,000 | ~275,000 | **~1,375,000** |

> **This is risk R-1 and it is a STEP-0 blocking gate.** Figures were assembled from an AMWUA/CAP-derived summary, the Colorado River Commission of Nevada's official table, and an ADWR/AZWater FAQ. They only partially agree, and the Nevada table's own rows did not arithmetically reconcile as parsed. Tier 3 totals are the most reliable; **Tier 2b/2c granular numbers are not verified.**
>
> **Verify line-by-line against the primary DCP Record of Decision or the Federal Register notice before encoding.** A transparent twin cannot afford to get shortage volumes wrong — this is the number most likely to be screenshotted and checked.

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
