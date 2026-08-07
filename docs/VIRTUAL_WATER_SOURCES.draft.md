# Virtual Water Sources — A verified inventory for Basin's water→crop→destination→livestock→destination pipeline

Compiled 2026-08-06/07, by direct `curl -s -L -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"` probing only (WebSearch/WebFetch budget was exhausted for this pass). Every finding below is tagged:

- **[curl-verified]** — confirmed directly via `curl`, exact URL/command and observed HTTP status + response shape cited.
- **[curl-verified, secondary source]** — a non-agency but reputable source (peer-reviewed paper, its own repository copy, Unpaywall locator) fetched directly via curl; used only for attribution figures or as explicitly allowed by the task.
- **UNVERIFIED** — could not be confirmed either way in this pass; not filled in from memory.

**Grading scale** (same convention as `docs/AGENCY_ATLAS.md`): A = REST API or bulk download verified working via curl (real structured data returned); B = web/report tool that returns structured, scrapable results (HTML table or CKAN-style JSON, no auth); C = real tool exists but is bot-blocked, job-submission-gated, or requires simulating browser/session state; D = offline/PDF/email/notarized-form only, or genuinely unreachable.

All evidence files (raw HTTP responses, JSON, PDFs) are saved alongside this brief in this same directory.

---

## Chain-link summary (read this first)

| Chain link | Best source | Grade | Granularity | Key? | Biggest gap |
|---|---|---|---|---|---|
| **Water → crop** | USDA CDL via CroplandCROS's ArcGIS ImageServer (`computeHistograms`) | **A** | 30m pixel, any AOI polygon (county, field, custom), any year 2008–2023 | No key; no auth | Gives crop-class pixel counts, not water volume — must be paired with USGS county irrigation totals (aggregate, not per-crop) or OpenET ET (per-field, now confirmed crop-tagged) to get an actual water number per crop |
| **Water → crop (field-level, ET-based)** | OpenET `geodatabase/metadata/properties` + `geodatabase/timeseries` | **A** | Individual field polygons, CDL-derived crop code per field per year 2016–2024, monthly ET per field | Yes — Kevin already has a Tier-1 key, 78/100 monthly requests left as of this probe | Tight quota (100 req/mo); `Max Field IDS: 100` per call; not all fields nationally covered (geodatabase is a curated field-boundary product, not full CONUS parcel coverage) |
| **Crop → domestic destination** | USDA FAF5 (bulk CSV, ORNL) | **A** | FAF zone × FAF zone × SCTG2 commodity (incl. Cereal grains, Animal feed, Live animals/fish, Meat/seafood) × year; sub-state (metro + "remainder") for CA/AZ/CO | No key; no auth | Commodity resolution is SCTG2 (broad categories), not crop-specific (no "alfalfa" line item) — can't isolate hay/alfalfa flows specifically within "Animal feed" |
| **Crop → international destination** | Census `api.census.gov/data/timeseries/intltrade/exports/statehs` | **A** (once keyed) | State-of-origin-of-movement × country × HS6 (HS 1214 = hay incl. alfalfa) × month | **Now requires a free API key** (this is a change from the historically-keyless small-volume convention) | "State" = transportation/movement origin, **explicitly not production origin** per Census's own guide (quote below) — a CO-grown, CA-exported bale of hay counts as a CA export |
| **Crop → international destination (USDA lens, ESR/PSD)** | USDA FAS OpenData API | **C** confirmed-exists / key-gated | Weekly export sales by commodity × destination country; no state-of-origin dimension at all | Requires API key (self-service portal, `apps.fas.usda.gov/opendataweb/`) | No state breakdown — FAS's own data can't answer "how much CO alfalfa went to Country X"; Census is the only source with a state dimension |
| **Crop → livestock (feed link)** | No direct agency dataset — inferred, not measured | **–** | — | — | No agency publishes "acres of alfalfa consumed by county's cattle herd" as a joined figure; this link is necessarily a Basin-side model assumption (crop acreage × typical dairy/beef feed rations), not a fetched number |
| **Livestock → domestic destination** | FAF5 (SCTG "Live animals/fish", "Meat/seafood") | **A** | Same FAF-zone granularity as above | No key | Same SCTG2-level resolution issue — "live animals/fish" bundles cattle with everything else live |
| **Livestock → international destination** | Census intltrade (HS 0201/0202 beef, 0406 dairy) + FAS ESR | **A** (Census, once keyed) / **C** (FAS) | Same as crop-export row above | Census: key required; FAS: key required | Same origin-of-movement caveat as crop exports |
| **Livestock inventory (county)** | USDA NASS QuickStats API | **A** (once keyed) | County × year × cattle-on-feed / milk cows / total inventory | **Free API key, self-service, instant email** (confirmed process) | Unauthenticated probe returns a clean, unambiguous `401 {"error":["unauthorized"]}` — no way to sample data without requesting the key first |
| **Livestock → slaughter volume** | FSIS | **D** (this pass) | — | — | `fsis.usda.gov/data-sets` returned HTTP 403 to curl; not probed further — NASS QuickStats (`statisticcat_desc=SLAUGHTER`) is a viable same-API fallback once keyed, not independently re-verified this pass |

**Net read:** the water→crop and crop→destination links are in much better shape than expected — both CDL and OpenET turned out to have lightweight, no-heavy-GIS API paths that weren't obvious from their public-facing pages, and FAF5 + Census intltrade are both genuinely bulk-downloadable/queryable. The weak links are (1) crop→livestock, which no agency measures directly and Basin will have to model, and (2) commodity resolution — FAF5 and to a lesser extent FAS never get more specific than broad SCTG/HS categories, so "how much of the Colorado River's water leaves as alfalfa specifically, as opposed to all animal feed" is answerable only via Census HS6 (1214) exports, not domestic FAF flows.

---

## 1. USDA NASS Cropland Data Layer (CDL) — crop-area-by-AOI-by-year

**Bottom line: the legacy SOAP web service is dead; its living replacement is a lightweight, no-auth ArcGIS ImageServer behind CroplandCROS, and it works.**

| Endpoint | Verification | Finding |
|---|---|---|
| `nassgeodata.gmu.edu/axis2/services/CDLService` (legacy GetCDLStat/GetCDLFile SOAP service) | **[curl-verified]** — `curl -v --max-time 25` | TLS handshake completes (valid GMU cert through 2026-09-10), but the server **never returns an HTTP response** — connection times out after full handshake, both on `:80` (redirects to `:443`) and `:443`. This is a server-side hang, not a network block. **Grade D — effectively dead** as of this probe. Do not build against this service. |
| `croplandcros.scinet.usda.gov/` | **[curl-verified]** HTTP 200, 1.2KB | A Svelte/USWDS single-page-app shell (`bundle.js`), no server-rendered content — not directly scrapable, but its `bundle.js` reveals the real backing API (next row). |
| **`pdi.scinet.usda.gov/geoprocessing/rest/services/Calculate_Statistics_with_HI/GPServer`** (the AOI zonal-statistics tool CroplandCROS's UI calls) | **[curl-verified]** HTTP 200; task metadata confirms parameters `AOI` (polygon), `Dataset_Name` (choice list incl. `CDLS_WM`, `Cotton_Frequency`, `Cultivated`, `CDLS_Hawaii_WM`), `Year` | Real Esri geoprocessing service, `executionType: esriExecutionTypeAsynchronous`. **Job submission itself (`/submitJob`) is blocked** — every sub-path tested (`submitJob`, `jobs`, even a deliberately bogus path) returns an identical `{"error":{"code":400,"message":"Invalid URL"}}` wrapped in HTTP 200, consistent with a WAF/proxy allow-listing only the exact task-info GET. **Grade C** — real tool, task schema browsable, not curl-submittable without more work (simulating whatever session/referer the JS app sets). |
| **`pdi.scinet.usda.gov/image/rest/services/CDLS_WM_GP/ImageServer`** (the actual CDL raster mosaic backing the GP tool above) | **[curl-verified]** HTTP 200, real ImageServer metadata: `pixelSizeX/Y: 30`, `serviceDataType: esriImageServiceDataTypeThematic`, `timeInfo` spans 1997–2023, `rasterFunctionInfos` includes `croptypes` | This is the real CDL mosaic dataset, openly discoverable. |
| **`.../CDLS_WM_GP/ImageServer/computeHistograms`** — the actual lightweight crop-area query | **[curl-verified]** — `GET` with `geometry` (a polygon ring, WGS84), `geometryType=esriGeometryPolygon`, `mosaicRule={"where":"Year=2023"}`, `f=json` → **HTTP 200, real pixel-count histogram in <1s**, no auth, no async job. Tested against a ~2,300-acre AOI near Palisade, CO (Grand Valley): returned a 230-bin histogram (class codes 0–229) with plausible non-zero counts at class 1 (Corn), 24 (Winter Wheat), 36 (Alfalfa, 20,207 px ≈ 4,500 ac), 37 (Other Hay), and a grape-adjacent code — consistent with Grand Valley's known corn/wheat/alfalfa/wine-grape mix. | **This is the answer to the task's core question: yes, crop-area-by-AOI-by-year is obtainable via a single lightweight GET, no heavy GIS software, no job queue.** Each pixel = 900 m² = 0.2224 acres; multiply histogram counts by that constant for acreage. **Grade A.** |
| `.../CDLS_WM_GP/ImageServer/legend` (class code → crop name lookup) | **[curl-verified]** HTTP 200, real JSON legend (Corn, Cotton, Rice, Sorghum, Soybeans, Sunflower, Peanuts, Tobacco, Sweet Corn, Mint, Barley, Durum Wheat, …) | Confirms the standard national CDL class-code legend is served alongside the raster — no separate lookup table needed. |
| ADWR-style direct ImageServer guess `pdi.scinet.usda.gov/image/rest/services/CDLS_WM/ImageServer` (without `_GP` suffix) | **[curl-verified]** HTTP 200 body, but `{"error":{"code":499,"message":"Token Required"}}` | A same-named-but-different service exists and IS auth-gated — don't confuse it with the working `CDLS_WM_GP` service above. |

**Access grade: A** (via `computeHistograms`, not the advertised web service or the GP job-submission path). **Cadence:** CDL is an annual USDA release (typically available ~January for the prior crop year); this mosaic's `timeExtent` currently runs 1997–2023 as observed. **Key/auth: none required** for the ImageServer path.

**Caveat for Basin's use:** this gives crop *area* by class by AOI, not water. It must be paired with a water-volume source (USGS county irrigation total, or OpenET field-level ET — see §3) to become a "water → crop" number, and per DESIGN_PRINCIPLES.md §5, pixel-derived crop acreage and OpenET-derived consumptive use are different `accounting_concept`s that should not be silently combined without a declared bridge (crop-weighted allocation of a county ET total, e.g.).

---

## 2. USDA NASS QuickStats API — county acreage/production

| Probe | Verification | Finding |
|---|---|---|
| `quickstats.nass.usda.gov/api/api_GET/?commodity_desc=HAY&year=2023&state_alpha=CO` (no key) | **[curl-verified]** | **HTTP 401**, body exactly `{"error":["unauthorized"]}` |
| `quickstats.nass.usda.gov/api/get_param_values/?param=commodity_desc` (no key) | **[curl-verified]** | Same: **HTTP 401**, `{"error":["unauthorized"]}` — even parameter-discovery endpoints are key-gated, not just data pulls |
| `quickstats.nass.usda.gov/api` (docs page) | **[curl-verified]** HTTP 200, 101.6KB | Confirms the key-request flow: **`POST /data/apiregister` (self-service form, fields: Name/Organization [optional], Email [required])** — "Once you request the API key, we will email it and you can proceed immediately." No manual review implied by the docs text. |

**Access grade: A** (once keyed — this is the standard, well-documented USDA API pattern; county-level acreage/production/inventory for alfalfa, hay, cotton, vegetables, and cattle are all in scope via `commodity_desc`/`statisticcat_desc` filters). **Granularity:** county × year (and sub-annual for some series) × commodity × statistic category (acreage, production, yield, inventory, sales). **Key: required, free, self-service, email-delivered — Kevin needs to submit name/org + email once.** **Cadence:** NASS publishes on its normal survey/census cadence (annual for Ag Census years, annual/seasonal for Quick Stats surveys).

---

## 3. OpenET — per-crop / per-field breakdown capability

**This was the single most valuable finding of the whole pass: OpenET's field geodatabase already carries a CDL-derived crop code per field per year, natively, in the same API response as the ET data.** Basin does not need to do its own CDL-raster-to-OpenET-point intersection — OpenET has effectively already done it for any field in its geodatabase.

| Call | Verification | Finding |
|---|---|---|
| `GET /account/status` (Authorization header = existing Tier-1 key) | **[curl-verified]** | `{"Name":"Kevin Wheeler","Tier":1,"Monthly Requests":"20 used of 100","Max Area Acres":50000,"Max Polygons":100,"Max Field IDS":100,...}` at start of this probe; **22 of 100 used after this session's 2 successful calls** (2 timed-out/retried calls did not appear to count against quota — server-side metering only fired on the 2 that returned HTTP 200). **78 requests remain this month.** |
| `GET /openapi.json` (public, no key needed to read the spec) | **[curl-verified]** HTTP 200, 35.6KB OpenAPI 3.1 spec | Full endpoint list confirmed: `/raster/timeseries/{point,polygon,multipolygon}`, `/raster/geotiff/*`, `/raster/export/*`, and — the key discovery — a separate **`/geodatabase/*`** family: `metadata/ids`, `metadata/properties`, `metadata/boundaries`, `timeseries`, tagged "Retrieve Pre-computed Field Data." |
| `POST /geodatabase/metadata/ids` with a small polygon AOI (`{"geometry":[lon,lat,...], "version":2.1}`) near Palisade, CO | **[curl-verified]** HTTP 200 (gzip-encoded body) | Returned **93 real OpenET field IDs** inside the AOI (e.g. `21108012579`, `21108011825`, …). |
| `POST /geodatabase/metadata/properties` with 3 of those field IDs | **[curl-verified]** HTTP 200, JSON | Returned, per field: `hectares`, and **`crop_2016` through `crop_2024`** — a CDL class code **for that specific field, for every year 2016–2024**. Sample: field `21108011825` = 7.161 ha, class code **36 (Alfalfa)** every year 2016–2023, switching to class 152 in 2024; field `21108013413` = 1.867 ha, also code 36 (Alfalfa) 2016–2023. |
| `POST /geodatabase/timeseries` (not called this pass, to conserve quota) | **[schema-verified, not executed]** | OpenAPI schema confirms parameters: `date_range`, `interval` (`monthly`), `field_ids`, `models` (`disalexi, eemetric, ensemble, geesebal, ptjpl, sims, ssebop`), `variables` (`et, eto, etof, et_mad_max, et_mad_min, ndvi, pr`), `file_format`. Combined with the crop-code metadata above, this is a direct field-ID → (crop type, monthly ET) pairing in two API calls. |

**Access grade: A.** **Granularity:** individual field polygon, annual crop code, monthly ET. **Key: Kevin already has one (Tier 1, `apps/web/.env.local`); no new signup needed.** **Cadence/limits: hard 100 req/month cap, 100 field IDs max per call, 100 polygons max per call, 50,000-acre max area** — this rules out any live/on-demand user-facing query; it's strictly a build-time/baking pattern (as Basin's existing `build-openet.mjs` already assumes). **Caveat:** the geodatabase is a curated field-boundary product, not full-CONUS parcel coverage — it will have gaps outside its mapped fields, and this pass did not check national/basin-wide coverage density.

---

## 4. USDA FAS trade data — GATS / OpenData API

| Probe | Verification | Finding |
|---|---|---|
| `apps.fas.usda.gov/OpenData/api/esr/exports/commodityCode/0201/allCountries/marketYear/2023` (no key) | **[curl-verified]** | **HTTP 403**, body exactly `"Bad API Key"` |
| `apps.fas.usda.gov/opendataweb/` (key-signup portal) | **[curl-verified]** HTTP 200 | Real Angular app shell (`OpendataWeb`), confirms a self-service key-request portal exists at this URL, distinct from the raw API host. Registration flow itself not exercised (would require submitting real contact info). |
| `apps.fas.usda.gov/gats/default.aspx` and `www.fas.usda.gov/data-analysis/gats` | **[curl-verified]** | First: connection timeout (HTTP 000) on repeated tries. Second: **HTTP 403, Akamai "Access Denied"** (`errors.edgesuite.net` reference number in body) — `www.fas.usda.gov` is bot-gated the same way `azwater.gov` was in the Agency Atlas survey. |
| `apps.fas.usda.gov/OpenData/api/swagger/docs/v1` | **[curl-verified]** | Connection timeout (HTTP 000), inconsistent — `apps.fas.usda.gov` overall behaved flakily (some paths 403 fast, others hang) across this session. |

**Access grade: C.** Real API confirmed to exist and enforce keys correctly (clean, unambiguous 403 error, not a silent failure), but (a) requires a key via a separate registration portal, (b) the human-facing GATS browsing tool is Akamai-blocked to curl entirely, and (c) the API host itself was intermittently unresponsive within this session — worth a retry at build time rather than assuming it's reliably up. **Granularity (per API docs metadata, not independently queried with a live key):** ESR (Export Sales Reporting) is weekly, by commodity and destination country — **no state-of-origin dimension at all**, which is the key limitation versus Census (§5). **Key: required, self-service portal identified but registration not completed this pass** (would create a real account under Kevin's info — left for Kevin to do).

---

## 5. Census international trade API — state-level HS exports

| Probe | Verification | Finding |
|---|---|---|
| `api.census.gov/data/timeseries/intltrade/exports/statehs?get=...&STATE=CO&...` (no key) | **[curl-verified]** | Redirects (HTTP 302 → 200) to `api.census.gov/data/missing_key.html`: *"A valid key must be included with each data API request. If you don't have one, request an API Key here [key_signup.html]."* **Census now requires a key for this endpoint** — this is a meaningful update versus the historically-keyless small-volume convention some older integrations assume. |
| `.../exports/statehs/variables.json` (metadata only) | **[curl-verified]** HTTP 200, real JSON | **Metadata/variable-discovery endpoints remain keyless.** This is where the exact field semantics come from (next row). |
| Exact field definition, from the live `variables.json` | **[curl-verified, direct quote]** | `"STATE": "2-character State of Origin of Movement, using US Postal Service State Abbreviations. \"XX\" = Unidentified"`. `"E_COMMODITY": "2-, 4-, or 6-digit Export Harmonized System Code"` (so HS6 `121410` = alfalfa/hay meal & pellets works; full HS 1214 heading covers hay/fodder generally). |
| Census's own methodological caveat, `census.gov/foreign-trade/guide/sec2.html` | **[curl-verified, direct quote]** | *"The OM series based on origin state, available since 1987, provides export statistics based on the state from which the merchandise starts its journey to the port of export; that is, **the data reflect the transportation origin of exports**."* And, on the ZIP-based variant: *"...redefined in 2004 to indicate the origin of movement of goods. **It does not necessarily represent the location of the [exporter of record].**"* |
| `api.census.gov/data/key_signup.html` | **[curl-verified]** HTTP 200 | Self-service form: `POST /data/KeySignup` with `org` (Organization Name) + `email` — same lightweight pattern as NASS and FAS. |

**Access grade: A** (once keyed). **Granularity:** state (origin-of-movement, not production) × country × HS code (up to 6-digit) × month, 2002–present for the OM series. **Key: required now — free, self-service, `org` + `email` only.** **The load-bearing caveat, in Census's own words:** state here means *where the export shipment began its journey*, not where the underlying commodity was grown or produced. A truckload of Colorado-grown alfalfa consolidated and exported through a California or Washington port would count as a CA/WA export in this series, not a CO one. **This is the single most important methodological caveat for the crop→international-destination link** — any Basin chart built on this data needs a visible note per DESIGN_PRINCIPLES.md §8 (provenance/caveats reachable on hover).

---

## 6. Domestic flows — Freight Analysis Framework (FAF5)

| Probe | Verification | Finding |
|---|---|---|
| `faf.ornl.gov/faf5/` (ORNL's FAF5 data page) | **[curl-verified]** HTTP 200, 19.4KB | Real HTML with direct download links, no login. |
| `HEAD https://faf.ornl.gov/faf5/data/Download_Files/FAF5.7.1_State.zip` | **[curl-verified]** | `HTTP 200`, `Content-Length: 145,261,207` (145MB), `Last-Modified: 2025-08-07` — a real, current, no-auth bulk state-level download. |
| `FAF5_metadata.xlsx` (28.8KB, downloaded and parsed directly) | **[curl-verified]** | Confirms **SCTG2-level commodity categories** including `Live animals/fish`, `Cereal grains`, `Animal feed`, `Meat/seafood`, `Milled grain prods.` — exactly the categories the task named. Confirms region field names `dms_orig`/`dms_dest` (domestic FAF zone) and `fr_orig`/`fr_dest` (foreign FAF zone, for imports/exports with a domestic leg). |
| FAF zone list, extracted from the same metadata file | **[curl-verified]** | Confirms **sub-state granularity for AZ/CA/CO**: Arizona = "Phoenix AZ" + "Remainder of Arizona" (2 zones); Colorado = "Denver CO" + "Remainder of Colorado" (2 zones); California includes at minimum "Los Angeles CA" + "Remainder of California" (likely more CA metro zones not captured by this grep). Nevada, by contrast, is a **single statewide zone** ("Remainder of Nevada" only — no metro split found). |

**Access grade: A.** **Granularity:** FAF zone (metro-area/remainder split for larger states, statewide for smaller ones) × FAF zone × SCTG2 commodity × year, plus a separate full FAF-zone-level file (not just the State-aggregated one) for finer geography. **Key: none.** **Cadence:** FAF5.7.1 vintage, base + 2018–2024 actuals + hi/lo forecasts to 2050, last updated 2025-08-07 per the file's `Last-Modified` header — FAF release cadence is roughly biennial with interim updates. **Caveat:** SCTG2 is a broad category — "Animal feed" bundles alfalfa/hay with all other prepared feeds; there is no FAF commodity code specific to alfalfa. For an alfalfa-specific domestic-flow number, Census HS export data (§5) or NASS shipping-point reports would be needed instead, and neither gives interstate domestic movement the way FAF does.

---

## 7. Livestock — inventory, slaughter, and export overlap with §4/§5

| Sub-topic | Source | Grade | Finding |
|---|---|---|---|
| County cattle inventory (incl. cattle-on-feed, milk cows) | NASS QuickStats (§2) | **A** (once keyed) | Same API/key as crop acreage — `commodity_desc=CATTLE`, `statisticcat_desc=INVENTORY` (or `MILK COWS`) filters, county-level, standard NASS survey cadence. Not separately re-probed (same 401-without-key behavior already confirmed in §2 applies identically here — no reason to expect different gating). |
| Slaughter by state | FSIS (`fsis.usda.gov/data-sets`) | **D** (this pass) | **[curl-verified]** `HTTP 403` on the datasets index page — did not investigate further (e.g., data.gov mirrors, direct CSV guesses) within this pass's time budget. **UNVERIFIED whether a workaround exists** — flag as a follow-up. NASS QuickStats also carries a `SLAUGHTER` statistic category as a same-API fallback (schema-plausible, not independently confirmed live this pass). |
| Live cattle + beef/dairy exports by destination | FAS (§4) + Census (§5) | **A** (Census, once keyed) / **C** (FAS) | Directly overlaps §4/§5 findings — HS 0201 (beef, fresh/chilled), 0202 (beef, frozen), 0406 (dairy/cheese) all queryable the same way as HS 1214 hay once a Census key is in hand; same origin-of-movement caveat applies. |

**No new grade beyond what §2/§4/§5 already established** — livestock inventory and livestock-export data ride the same three APIs as the crop side of the chain; the one genuinely new gap identified is FSIS slaughter-by-state, which this pass could not get past a 403.

---

## 8. Richter et al. 2020, *Water scarcity and fish imperilment driven by beef production*, Nature Sustainability 3, 319–328 (2020). DOI: 10.1038/s41893-020-0483-z

**Abstract, verified verbatim via `curl` against `nature.com/articles/s41893-020-0483-z`** (HTTP 200; the DOI resolver `doi.org/10.1038/s41893-020-0483-z` was also followed directly and lands on the same page — 4-hop redirect chain through Nature's identity provider, fully traced and confirmed, no login wall encountered for the abstract itself):

> "Human consumption of freshwater is now approaching or surpassing the rate at which water sources are being naturally replenished in many regions, creating water shortage risks for people and ecosystems. Here we assess the impact of human water uses and their connection to water scarcity and ecological damage across the United States, identify primary causes of river dewatering and explore ways to ameliorate them. **We find irrigation of cattle-feed crops to be the greatest consumer of river water in the western United States, implicating beef and dairy consumption as the leading driver of water shortages and fish imperilment in the region.** We assess opportunities for alleviating water scarcity by reducing cattle-feed production, finding that temporary, rotational fallowing of irrigated feed crops can markedly reduce water shortage risks and improve ecological sustainability. Long-term water security and river ecosystem health will ultimately require Americans to consume less beef that depends on irrigated feed crops."

Nature's own dc.description meta tag appends a one-line editorial gloss not in the formal abstract body: *"Water use in river basins is an age-old resource-management question, but it is rare to quantify consumption by specific sectors. The Colorado River is being overused for beef and dairy production, endangering the entire river ecosystem."*

**The specific numeric attribution figures the task asked for — the share of Colorado River basin water consumption attributable to cattle-feed crops, and the irrigation share of total consumption — are in the paper's Results section, and the main article body is paywalled.** Confirmed multiple ways:
- Direct `nature.com` fetch returns a genuine subscription paywall: *"Buy this article — Purchase on SpringerLink — Instant access to the full article PDF — USD 39.95"* / *"Subscribe to this journal — $119.00 per year"* (exact text, curl-verified).
- Unpaywall's API (`api.unpaywall.org/v2/10.1038/s41893-020-0483-z`) — a legitimate nonprofit open-access locator, not a bypass tool — confirms `is_oa: true` with a green-OA repository copy at the University of Twente research portal (co-author Arjen Hoekstra's institution): `research.utwente.nl/en/publications/water-scarcity-and-fish-imperilment-driven-by-beef-production/`.
- That landing page **was** fetchable (HTTP 200, curl-verified) and links directly to a PDF (`research.utwente.nl/files/250562261/Richter_2020_Water_scarcity_and_fish_imperilment.pdf`), but **the PDF file itself is Cloudflare-gated** (`HTTP 403`, "Just a moment..." challenge page, curl-verified on two attempts including with a matching Referer header) — genuinely blocked to a curl client, not merely unlisted.
- Wayback Machine CDX API checked for both the PDF path and the landing-page path: **zero snapshots found for either** (`[]` empty result).

**What is verified and open (the paper's Supplementary Information, hosted on Nature's own media CDN, not paywalled):**
- `media.springernature.com/.../41893_2020_483_MOESM1_ESM.pdf` — **HTTP 200, 1.1MB PDF, fetched successfully via curl**, no paywall.
- The SI's "Analysis of Fallowing Programs" section (read via the pdf-reader tool against the fetched file) gives real, quotable figures — but these are about the Imperial/Palo Verde fallowing programs specifically, not the basin-wide cattle-feed attribution the task asked for:
  - *"on average, IID has fallowed 4% of its cropland and PVID has fallowed 20%"*
  - *"These districts have been able to save an average of ~2100 cubic meters of water each year per hectare fallowed, equivalent to 1.3 meters of water depth."*
  - *"More than 40% of the water supply in San Diego County is now derived from the IID rotational fallowing program."*
  - Fallowing programs pay farmers **USD 0.14–0.16 per cubic meter**, "2–10 times" cheaper than other supply-augmentation options.
  - *"Even if all farmland producing irrigated alfalfa and grass hay in the entire Colorado River basin were fallowed, it [—sentence continues onto the next page, not captured in this pass's page range]."*
  - Supplementary Table 1 is titled "Virtual water trade associated with transfers of US river-irrigated cattle-feed crops and associated beef consumption" and Table 2 "Causes of summer flow depletion along length of Colorado River" — both **exist, are real tables in the open SI PDF, and were not transcribed in this pass** (worth a dedicated follow-up read since they're already fully accessible).

**Grade for the headline attribution figures: UNVERIFIED via primary source this pass — genuinely paywalled, not filled from memory.** Do not use any specific percentage for "share of Colorado River basin consumption going to cattle feed" until pulled from either (a) the SI tables already confirmed open and just not yet transcribed, or (b) a paid/institutional access to the main text. The abstract's qualitative claim ("greatest consumer... in the western United States") is safe to cite as-is with the DOI; specific percentages are not yet in hand.

---

## 9. Direct agency water-to-crop sources

| Source | Probe | Grade | Finding |
|---|---|---|---|
| **USGS water-use-by-category** | `api.waterdata.usgs.gov/ogcapi/v0/collections?f=json` | **N/A for this purpose** | **[curl-verified]** HTTP 200, full collection list enumerated (36 collections: `daily`, `continuous`, `monitoring-locations`, `peaks`, etc.) — **no water-use-by-category collection exists in the new OGC API at all.** Confirms Basin's existing 2015-county-irrigation dataset must come from the older `water.usgs.gov/watuse/` system, not this API. |
| USGS irrigation-water-use, category definition | `usgs.gov/mission-areas/water-resources/science/irrigation-water-use` | — | **[curl-verified]** HTTP 200 — page text confirms irrigation is tracked as **one aggregate withdrawal category** (with sub-splits only by water source: groundwater/surface water), explicitly **not broken out by crop type**. This closes off USGS as a water→crop link on its own; it can only supply a county irrigation *total* to be allocated across CDL-derived crop-acreage shares, not a per-crop number directly. |
| **CA DWR agricultural water use by crop** | `data.ca.gov` CKAN API, `package_search?q=statewide+crop+mapping` (keyless) | **A** | **[curl-verified]** — real CKAN JSON API, zero auth. Directly surfaced the dataset **"Statewide Agricultural Water Use Data 2016-2020"**: an Excel-tool-delivered dataset computing, **per 20 crop categories, per Detailed Analysis Unit (DAU, a sub-county DWR geography), per year**: irrigated crop area (ICA), crop evapotranspiration (ETc), effective precipitation, **evapotranspiration of applied water (ETaw)**, consumed fraction (CF), and **applied water (AW)**. Confirmed a real, signed S3 download URL resolves (`HTTP 302` → valid pre-signed `s3.amazonaws.com` link with a 24-hour expiry, itself curl-verified reachable). **This is the strongest direct water→crop agency source found in this entire survey** — California publishes the actual join, not just adjacent datasets to be combined. A companion **"Statewide Crop Mapping"** dataset (annual GIS shapefile/geodatabase, provisional 2024 + final 2023 and prior years) was also confirmed in the same search. |
| **AZ AMA annual reports / crop data** | ADWR ArcGIS org search (`azwater.maps.arcgis.com/sharing/rest/search`) for AMA-related irrigation layers | **A** (for irrigated-acreage rights) / gap for crop type | **[curl-verified]** — confirmed real Feature Services: `Groundwater_Use_Right_58_2024`, `Irrigation_Authority_Use_Right_60_2024`, `Irrigation_Grandfathered_Rights_IGFRs_TEST` — these expose **irrigated-acreage entitlements** (right holder, acreage, AMA) per the Agency Atlas's existing Arizona findings, but **do not carry crop type** — AMA irrigation-right data is an acreage/entitlement record, not a crop-composition record. Getting "what crop is grown under this AZ irrigation right" still requires overlaying CDL (§1) on these parcels; AZ AMA annual reports themselves (PDF format) were not independently probed this pass — **UNVERIFIED whether the PDF annual reports contain a crop-mix table** that would shortcut this. |
| `azwater.gov/ama` (main site) | direct fetch | **D / unreachable** | **[curl-verified]** `HTTP 403`, consistent with the Agency Atlas's existing finding that `azwater.gov` is fully Cloudflare-gated — the real data lives on `services.arcgis.com`/`azwater.maps.arcgis.com`, not the main domain, exactly as already documented for Arizona's water-rights data. |

---

## Key-signup steps Kevin personally needs to do

None of these were completed in this pass (submitting real contact info wasn't appropriate for a verification-only probe), but all are confirmed free, self-service, and fast:

1. **USDA NASS QuickStats** — `quickstats.nass.usda.gov/api` → click "obtain an API key" → submit Name/Organization (optional) + Email. Key arrives by email, usable immediately. Unlocks §2 (crop acreage/production) and §7 (livestock inventory/slaughter category).
2. **Census Bureau API key** — `api.census.gov/data/key_signup.html` → submit Organization Name + Email (`POST /data/KeySignup`). Now required (previously some low-volume Census endpoints were keyless) — unlocks §5 (state-level HS export data for hay/beef/dairy).
3. **USDA FAS OpenData** — `apps.fas.usda.gov/opendataweb/` portal (Angular app; registration flow not fully traced this pass — worth 5 minutes to click through). Unlocks §4 (ESR/PSD export-sales data), though note this data has no state-of-origin dimension so it's a lower priority than the Census key.
4. **OpenET** — already done (Tier-1 key in `apps/web/.env.local`, 78/100 monthly requests remaining as of this probe). No action needed unless quota needs raising (per Basin's own `DATA_SOURCES.md`, linking a GCP project can raise it).

No source probed in this pass required a paid tier, a manual/human-reviewed application, or a waiting period — every key process found was instant, self-service, and free.

---

## Evidence files

All raw probe output (JSON, HTML, PDFs, and the OpenET binary responses) is saved in this directory: `/private/tmp/claude-501/-Users-kevinwheeler-projects/2b58ccf9-3eea-4520-89bf-8a0adac36fdc/scratchpad/virtualwater/`. Notable files: `cdl_histogram.json` (the working CDL AOI query), `cdl_legend.json`, `openet_field_ids.json` / `openet_field_props.bin` (gzip-encoded — decode with `gzip.decompress`), `census_vars.json` (Census's own field caveats), `faf5_metadata.xlsx`, `ca_agwateruse_pkg.json`, `richter_nature.html`, `richter_SI.pdf`, `unpaywall.json`.
