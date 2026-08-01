# Data Source Matrix

**Compiled 2026-07-31** from five parallel verification briefs. Every row was checked live on that date unless marked otherwise.

**Confidence key:** **High** = confirmed by direct fetch of the primary source · **Medium** = search-summarized vendor/agency content or reputable secondary source · **Low** = could not confirm, conflicting, or inferred.

---

## Tier 1 — Phase 1 critical path

| Agency | Dataset | Endpoint | Geography | Variables | Range | Cadence | Format | Auth | Conf. | Caveats |
|---|---|---|---|---|---|---|---|---|---|---|
| USBR | **RISE API** | `data.usbr.gov/rise/api` — `/catalog-item`, `/catalog-record`, `/result`, `/location` | Basin-wide | Elevation, storage, inflow, release, evaporation, bank storage, surface area | Mead elevation from **1935-02-02** | Daily | JSON (JSON:API) | **None** | High | CORS enabled — browser-fetchable. No published rate limit; throttle politely. All data provisional; detect revisions via `updateDate`. |
| USBR | RISE — **Lake Powell** (record 2362) | items 508 elev · 509 storage · 511/512 inflow · 507/4315/4354 release · **510 evaporation** · 4276 bank storage | Glen Canyon | Full variable set | Dam closed 1963 | Daily | JSON | None | High | Richest record in the system. |
| USBR | RISE — **Lake Mead** (record 4370) | items **6123 elev** · 6124 storage · 6122/6125 release | Hoover | Elevation, storage, release only | 1935→ | Daily | JSON | None | High | **No inflow, no evaporation, no hydropower items found.** Mead inflow ≈ Powell release + ungauged tributaries; may need derivation. |
| USGS | **Water Data OGC API** | `api.waterdata.usgs.gov/ogcapi/v0/` — collections `daily`, `continuous`, `latest-daily`, `monitoring-locations` | National | Discharge (00060), gage height (00065) | Full period of record via `/daily` | 15-min / daily | GeoJSON, CSV, JSON | Optional key (instant) | High | **`/continuous` serves only ~3 years** — use `/daily` for long series. Field names all differ from legacy NWIS. |
| USGS | ~~WaterServices legacy~~ | `waterservices.usgs.gov/nwis/{iv,dv}` | — | — | — | — | WaterML/RDB | None | High | ⚠️ **DO NOT USE.** Degradation from ~Aug 2026; decommission targeted Q1 2027. |
| USDA-NRCS | **AWDB REST API** | `wcc.sc.egov.usda.gov/awdbRestApi/services/v1/` | Station (`stationTriplet`), HUC filter | WTEQ (SWE), SNWD, PREC, TOBS/TMAX/TMIN | Many CO/UT stations from **late 1970s** | Daily | JSON | None documented | Medium | Swagger UI is JS-rendered and could not be fetched; endpoint names corroborated via the CRAN `awdb` package and an NRCS demo repo but **not executed live**. Verify first. |
| USDA-NRCS | Basin SWE **% of median** | Snow & Water Interactive Map | HUC6 | SWE % of 1991–2020 median | — | Daily | Map product / PDF | — | Medium | ⚠️ **Not an API.** A computed NWCC map product. Must be replicated from station data + HUC membership, matching their weighting and minimum-record-length filters. **On the MVP critical path.** |
| USBR | **24-Month Study** | `usbr.gov/lc/region/g4000/24mo.pdf`, `24mo_MIN.pdf`, `24mo_MAX.pdf`; archive at `.../24mo/index.html` | System-wide | Projected EOM elevation & storage, Mead + Powell | Archive depth **unverified** | Most Probable monthly ~15th; Min/Max quarterly (Jan/Apr/Aug/Oct) | **PDF only** | None | High | ⚠️ **No machine-readable form exists anywhere.** This is the backtest source. Reclamation PDFs resisted text extraction in two independent research passes. |

### Key gauges (all verified live 2026-07-31)

| Site | Number | Status | Daily discharge record | Note |
|---|---|---|---|---|
| Colorado R. at **Lees Ferry**, AZ | **09380000** | Active | 1921-10-01 → present | The compact point. Also the real-time proxy for Glen Canyon releases. |
| Colorado R. near Cisco, UT | 09180500 | Active | 1913-10-01 → | |
| Green R. at Green River, UT | 09315000 | Active | 1894-10-01 → | Regulated by Flaming Gorge since 1962 |
| San Juan R. near Bluff, UT | 09379500 | Active | 1914-10-30 → | |
| Gunnison R. near Grand Junction, CO | 09152500 | Active | 1896-10-01 → | Multiple Gunnison gauges exist — confirm intent |
| Colorado R. below Hoover Dam | 09421500 | Active | 1934-04-01 → | Continuous 15-min only from **2017-10-01** |
| Colorado R. at NIB (Mexico) | 09522000 | **Ambiguous** | 1950-01-01 → 2026-06-30 | Conflicting signals on real-time status. Verify before promising a Mexico-delivery feature. |
| ~~Colorado R. below Glen Canyon Dam~~ | ~~09379910~~ | **DISCONTINUED 2004-08-02** | — | ⚠️ **Trap.** Looks like exactly the gauge you want; silently stale since 2004. Use Lees Ferry + RISE instead. |

---

## Tier 2 — Phase 2/3

| Agency | Dataset | Endpoint | Geography | Variables | Range | Cadence | Format | Auth | Conf. | Caveats |
|---|---|---|---|---|---|---|---|---|---|---|
| USBR | **Consumptive Uses & Losses** | `usbr.gov/uc/DocLibrary/reports.html` | Whole system; state/tributary for UB | Ag, M&I, evaporation by state | 1971–2025 (provisional) | ~5-yr, provisional annual | PDF + Excel + Power BI | None | Medium-High | Canonical basin-wide backbone. Filename literally contains "provisional." |
| USBR | **Decree Accounting** (Art. V, *Arizona v. California*) | `usbr.gov/lc/region/g4000/wtracct.html` | AZ/CA/NV per diverter | Diversion, return flow, CU per user | 1964–2025 | Annual (~1 yr lag) | PDF | None | High | Legally authoritative for the Lower Basin. Won't tie to CU&L — different accounting basis. |
| USBR | **Natural Flow & Salt Data** | `usbr.gov/lc/region/g4000/NaturalFlow/` — `current.html` (1906–2020 final), `provisional.html` (1906–2024) | 29 CRSS nodes | Naturalized flow | 1906→ | ~3×/yr (after Jan/Apr/Aug studies) | **Excel only** | None | Medium | ⚠️ Newest confirmed file is **Sept 2024** — verify currency. "Subject to change over the entire record." The standard series for what the river produces. |
| USBR | LCRAS (ET & acreage) | `usbr.gov/lc/region/g4000/wtracct.html` | LB riparian/ag | ET, acreage by type | 1995–**2016** | Stalled | PDF + Excel | None | High | ~10-year lag. Do not build anything "current" on it. |
| UCRC | Annual Report | `ucrcommission.com` | Upper Basin | Compact administration narrative | 1948→ | Annual (~9–10 mo lag) | PDF | None | High | Policy framing, not a quantitative source. |
| USGS | National Water-Use | ScienceBase + legacy `waterdata.usgs.gov/nwis/wu` | County; HUC-12 monthly for 3 categories in 2020 | Withdrawals by 8 categories | 5-yr since 1950; **2020 latest** | 5-yr | CSV download | None | Medium | ⚠️ **Not an API.** Reports *withdrawals*, not CU. 2015→2020 changed geography and frequency — not apples-to-apples. |
| USDA-NASS | **Quick Stats API** | `quickstats.nass.usda.gov/api` | County → national | Crop acreage, yield, irrigation status | Decades | Continuous | JSON/XML/CSV | **Free key, instant** | High | 50k records/request cap. County cells suppressed as `(D)` where few farms report. |
| USDA-NASS | Census of Agriculture | `nass.usda.gov/AgCensus` | County | Farm economics, irrigated acres, crop type | 5-yr; **2022 latest** | 5-yr (2027 next) | PDF + CSV | None | High | Disclosure suppression at county level. |
| USDA-NASS | Irrigation & Water Mgmt Survey | `nass.usda.gov/Surveys/.../Farm_and_Ranch_Irrigation` | Mostly state | Water applied per acre by crop, irrigation method | 5-yr; **2023 latest** | 5-yr | PDF + tables | None | High | Sample-based (~35k producers). Not full county granularity. |
| OpenET | Evapotranspiration API | `etdata.org` · `openet.gitbook.io/docs` | 30m raster, 23 western states | Field-scale ET | 2016→ | Varies | API | Free, quota-limited | High | **Free**, covers all 7 basin states. Quotas are compute-based and unpublished — re-check at build time. Link a GCP project to raise. |
| CO DWR | **CDSS REST API** | `dwr.state.co.us/Rest/GET/api/v2` | Colorado | Diversions, structures, transbasin, water rights | Long | Varies | JSON | Anonymous 1k calls/day; free key for more | High | **The only genuinely good state API of the seven.** |
| NOAA-NCEI | **Paleoclimatology** | `ncei.noaa.gov/access/paleo-search/` | — | Tree-ring reconstructions | 762 CE → | Static | Flat files; JSON metadata search API | None | Medium | Discovery API for metadata; data itself is flat files. |
| TreeFlow | Reconstruction archive | `treeflow.info` | Lees Ferry, Green, San Juan, Cisco | Reconstructed annual flow | 762–2005 | Static | Plain text | None | High | **Most practical paleo source** — better documented than hunting NCEI study IDs. |
| NDMC | **US Drought Monitor** | `usdmdataservices.unl.edu/api/` | National → **HUC 2/4/6/8** | D0–D4 area & population | 2000→ | **Thursdays** | CSV/XML/JSON | None | High | ⚠️ Host is `usdmdataservices.unl.edu`, **not** `droughtmonitor.unl.edu` — stale tutorials get this wrong. HUC aggregation supported natively. |
| NOAA-NCEI | Climate Data Online v2 | `ncdc.noaa.gov/cdo-web/` | Station/grid | Precip, temp, normals | GHCND to 1800s | Daily w/ lag | JSON/XML | **Token required**, instant | High | 5 req/sec, 10k req/day. NCEI mid-migration to AWS — access methods stated unchanged. |
| NOAA-CPC | ENSO index | `cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/` | Niño 3.4 | ONI / **RONI** | 1950→ | Monthly | HTML table | None | Medium-High | ⚠️ **CPC switched the official index from ONI to Relative ONI effective 2026-02-01.** No API — scrape. |
| NOAA-CBRFC | Seasonal water supply forecast | `cbrfc.noaa.gov/wsup/` | 143 forecast points | Volume forecasts, ESP traces, 10/50/90% exceedance | Archive on site | Official 1st of month Jan–Jun; ESP daily | **Web pages + PDF** | — | Medium | ⚠️ **No API confirmed.** Method: SNOW-17 + Sac-SMA in ESP mode, ~30 traces, 1991–2020 reference. |
| IBWC | Mexico deliveries / Minutes | `ibwc.gov/water-data/` | NIB / SIB | Treaty deliveries, bypass flows | — | Periodic | PDF | None | Medium | No API. **No dedicated SIB gauge identified.** Minute 323 as extended by Minute 330 (in force 2024-04-18); both sunset **2026-12-31**. |

---

## Providers and state agencies

| Entity | Programmatic access? | Notes |
|---|---|---|
| Central Arizona Project | **Partial** — Open Data Hub at `cap-az.com/data-and-maps` | Downloadable datasets and maps; no REST API for delivery time series. Best of the five providers. |
| Metropolitan Water District SoCal | **No** | PDF reports only. |
| Southern Nevada Water Authority | **No** confirmed | Absence of evidence, not evidence of absence — check directly. |
| Denver Water | **No** | Daily raw-water diversion readings + Water Watch Report, PDF/manual request only. |
| Imperial Irrigation District | **No** | PDF annual + QSA reports. ~3.1 MAF entitlement, ~97% agricultural. |
| **Colorado** DWR/CDSS | **Yes — real REST API** | See Tier 2. |
| Nevada DWR | Partial | ArcGIS Hub, GIS-oriented. |
| Arizona · California · New Mexico · Utah · Wyoming | **Unverified** | Not directly checked. Do not assume PDF-only without confirming. |

---

## Reference values

Every figure below needs its source and as-of date carried into the UI. Nothing here is a constant.

| Quantity | Value | Source | Conf. |
|---|---|---|---|
| Lees Ferry natural flow, long-term | ~14.6 MAF/yr (1906–2024); ~14.0 by other method/period | Reclamation naturalized flow / TreeFlow | Medium |
| Lees Ferry natural flow, 2000–2025 | ~12.4 MAF/yr | Secondary summary of Reclamation record | Medium |
| 1922 Compact assumed flow | ~16.4 MAF/yr | Widely corroborated secondary consensus | High |
| Reconstructed long-term mean | 13.5 (Stockton & Jacoby 1976) · 14.655 (Meko 2007) · 14.669 (Woodhouse 2006) | TreeFlow data files | High |
| Upper Basin consumptive use | **3.8 MAF** (FEIS, 2020–24) *or* **4.3 MAF** (CU&L, 2021–25) | Both federal — see R-8 | Medium |
| Lower Basin consumptive use | 6.5 MAF/yr (2020–24, 49% of total) | Post-2026 FEIS | High |
| Mexico treaty delivery | 1.5 MAF guarantee; **2026 initial allocation 1,352,595 AF** | IBWC | Medium-High |
| Basin reservoir evaporation | ~1.4–1.5 MAF/yr basin-wide; Powell+Mead ~1.135 MAF | FEIS / coloradoriverscience.org | Medium |
| Mead evaporation range by method | 600,000–875,000 AF/yr | Multiple studies | Medium |
| CY2026 Lower Basin tier | **Tier 1 shortage** (Aug 2025 24MS, projected Jan 1 2026 Mead elev. 1,055.88 ft) | Reclamation news release 5211 | High |
| WY2026 Powell release | Set 7.48 MAF (Aug 2025) → **revised to 6.00 MAF** 2026-04-17 under §6.E | Reclamation news release 5326 | High |
| Combined system storage | ~33% (2026-07-19); Powell ~22%, Mead ~27% | Secondhand blog citing USBR weekly | **Medium — verify via RISE** |
| Basin consumptive use total | 19.3 MAF/yr (2000–2019) | Richter et al. 2024, *Comms Earth & Env* | High |
| Agriculture share | 52% of basin consumption | Richter et al. 2024 | High |
| Cattle-feed crops | 32% of all basin water; 62% of agricultural use | Richter et al. 2024 | High |
| **Alfalfa alone** | **>5 MAF/yr ≈ 26% of all water consumed** | Richter et al. 2024 | High |
| Upper Basin ag → cattle feed | 90% | Richter et al. 2024 | High |
| Tribes in basin | **30** federally recognized | NARF, Reclamation Ten Tribes study | High |
| Tribal quantified entitlement | ~3.2 MAF/yr (~22–26% of supply) | Getches-Wilkinson Center 2021 (secondary) | Medium |
| Tribes with quantified rights | **18 or 22** — sources disagree | Multiple | **Low — present as disputed** |
| NE Arizona settlement | **NOT ENACTED.** S.953/H.R.2025 pending in 119th Congress | Congress.gov | High |
| CO transbasin diversions | ~430–440 kaf/yr (C-BT ~230k, Moffat+Roberts ~150k, Fry-Ark ~52k) | Aggregated, no single canonical source | Medium |
| Megadrought severity | Driest 22-yr period since ~800 CE; ~40% attributable to anthropogenic warming | Williams et al. 2022, *Nat. Clim. Chang.* | High |
| 2000–2014 flow deficit | 19% below 1906–1999 average; ~1/3 attributable to warming | Udall & Overpeck 2017, *WRR* | High |
| Temperature sensitivity | ~9.3% flow decline per °C, via snow-albedo loss | Milly & Dunne 2020, *Science* | High |

---

## What a developer will trip over

**Three parallel Reclamation data systems exist**, undocumented relative to each other: RISE (documented, primary), the HydroData flat-file dashboards (`usbr.gov/uc/water/hydrodata/reservoir_data/{id}/{csv,json}/{metric}.{ext}` — undocumented numeric metric IDs), and the legacy HDB CGI tool (`pn-bin/hdb/hdb.pl`, which powers RISE underneath via `sourceCode: lchdb2`). **Treat RISE as the only committed public API.**

**Provisional is the default state everywhere** — RISE, HydroData, USGS, and even multi-year-old consumptive-use figures. Reclamation revised Powell's WY2026 release mid-year. Design for revision, not for caching.

**The USGS migration is a rewrite, not a URL swap.** `site_no` → `monitoring_location_id`, `parm_cd` → `parameter_code`, provisional/approved qualifier codes → `approval_status`, and one-feature-per-observation instead of grouped time series.

**Water-use numbers are not comparable across sources.** NASS reports irrigated acres and water applied; OpenET and Richter et al. report ET-based consumptive use; USGS reports withdrawals; Reclamation reports consumptive use on a Compact basis. Four different accounting universes wearing the same units.

**Four areas need scraping or PDF parsing rather than clean integration:** the 24-Month Study, CBRFC seasonal forecasts, basin-level SWE percentages, and Mexico delivery data. Scope them as higher-effort, higher-risk line items.

---

## Time-based blockers

**None gate the schedule.** Every source is keyless or instant self-serve — no Plaid-style review, no waitlist, no business verification anywhere in this project. The only external unknown is the **post-2026 Record of Decision**, which affects *content*, not access.
