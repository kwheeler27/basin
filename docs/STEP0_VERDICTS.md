# STEP-0 Gate Verdicts

Live verification results. Gates G3/G4 executed inline 2026-08-01; G1/G2 delegated (verdicts pending).

---

## G3 — RISE live verification: ✅ PASS

Queried `data.usbr.gov/rise/api/result` directly, 2026-08-01.

**Protocol finding:** requires `Accept: application/vnd.api+json` (or `application/ld+json`) — plain `application/json` returns HTTP 406. Encode this in the ingest client.

**Current values (2026-07-31, provisional):**

| Measure | Value | vs. secondhand report |
|---|---|---|
| Mead elevation (item 6123) | **1,041.10 ft** | consistent |
| Mead storage (item 6124) | **7,053,590 AF** ≈ 27% of 26.12 MAF | ✅ confirms ~27% |
| Powell elevation (item 508) | **3,522.27 ft** | — |
| Powell storage (item 509) | **5,389,110 AF** ≈ 22% of 24.32 MAF | ✅ confirms ~22% |

**Notable:** Powell's *current* elevation (3,522 ft) is below the 3,525 ft Mid-/Lower-Elevation tier boundary and ~32 ft above minimum power pool (3,490 ft), declining ~0.15 ft/day in late July. (Tier determination uses projected Jan 1 elevation, not current — but this confirms the "lowest on record" reporting.)

**Revision behavior observed directly:** results for 2026-07-26 → 2026-07-30 all carried `updateDate: 2026-08-01T13:00:03Z` — i.e., **the prior week's values were revised the morning we queried**. The new-row/`revision_of` design and `updateDate` polling are not defensive paranoia; revisions happen weekly. Also confirmed: `resultAttributes.resultType: "observed"` and `sourceCode: lchdb2` are present per row.

## G4a — Natural Flow currency: ⚠️ STALE, ACCEPTED

`usbr.gov/lc/region/g4000/NaturalFlow/provisional.html` fetched 2026-08-01. Newest file remains **`LFnatFlow1906-2024.2024.9.12.xlsx` (September 2024)** — no 2025/2026 vintage exists. The claimed Jan/Apr/Aug update cadence is evidently not being met.

**Disposition:** accepted, not blocking. The naturalized-flow series is used for historical trace resampling and the Phase 3 narrative, not live operations. UI must display the vintage ("naturalized flow through WY2024, published 2024-09"). Re-check quarterly.

## G4b — AWDB REST smoke test: ✅ PASS

Live queries 2026-08-01:

- `/stations?stationTriplets=*:CO:SNTL&activeOnly=true` — works; returns per-station **`huc` and `associatedHucs`**, which is exactly what the basin-SWE rollup needs for HUC membership.
- `/data?stationTriplets=713:CO:SNTL&elements=WTEQ&duration=DAILY&...` — works; daily SWE with `beginDate: 1979-10-01` period of record, values in inches (`storedUnitCode: "in"`), `dataPrecision`, `derivedData` flags present.

**Protocol findings:** no auth required. Empty-result queries return `[]` (valid JSON) rather than an error — the ingest client must distinguish "no data" from "bad station id" via the stations endpoint, not by response shape. Unit is inches → registry conversion to canonical mm required.

## G1 — Mead DCP tier verification: ⏳ PENDING

Delegated to primary-source verification (2007 IG ROD, LB DCP Agreement exhibits, Minute 323 text). Until it lands: **no Mead shortage-branch code beyond the 2007 IG base tiers.** Everything else proceeds.

## G2 — 24-Month Study archive & parseability: ⏳ PENDING

Delegated: archive enumeration plus proven text extraction on sample PDFs (current, ~2020, oldest). Until it lands: backtest harness can be built against a fixture interface, but no commitment to backtest sample size.
