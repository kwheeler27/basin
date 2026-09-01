/**
 * The curated bibliography — every source Basin rests on that is NOT a
 * registry measure (those render from the registry's own provenance).
 *
 * Link discipline: a `url` appears ONLY if it points at the primary host
 * (doi.org, the agency itself) and was verified reachable when added
 * (ranged GET, 2026-08-30). Entries without a URL are documents whose
 * agency page moved or has no stable address — an honest gap, never a
 * guessed link.
 */

export type RefKind = "law" | "federal" | "state" | "research" | "geo";

export interface Reference {
  readonly id: string;
  readonly kind: RefKind;
  /** Full citation, plain text. */
  readonly cite: string;
  /** Primary-host URL, verified at add time. */
  readonly url?: string;
  /** What Basin uses it for. */
  readonly used: string;
  readonly note?: string;
}

export const KIND_LABELS: Record<RefKind, string> = {
  law: "Law & operating rules",
  federal: "Federal data & publications",
  state: "State records",
  research: "Peer-reviewed research",
  geo: "Geospatial reference",
};

export const REFERENCES: readonly Reference[] = [
  // ------------------------------------------------------------- law
  {
    id: "compact1922",
    kind: "law",
    cite: "Colorado River Compact (1922).",
    url: "https://www.usbr.gov/lc/region/pao/pdfiles/crcompct.pdf",
    used: "The 7.5 + 7.5 MAF basin apportionments and the 16.4 MAF flow assumption behind the thesis.",
  },
  {
    id: "bcpa1928",
    kind: "law",
    cite: "Boulder Canyon Project Act, Pub. L. 70-642 (1928).",
    url: "https://www.usbr.gov/lc/region/pao/pdfiles/bcpact.pdf",
    used: "Lower Division state apportionments (CA 4.4 / AZ 2.8 / NV 0.3 MAF).",
  },
  {
    id: "ubcompact1948",
    kind: "law",
    cite: "Upper Colorado River Basin Compact (1948).",
    used: "Upper Division percentage shares of the 7.5 MAF apportionment.",
    note: "No stable agency URL at add time.",
  },
  {
    id: "treaty1944",
    kind: "law",
    cite: "Treaty on Utilization of Waters of the Colorado and Tijuana Rivers and of the Rio Grande, U.S.–Mexico (1944).",
    used: "Mexico's 1.5 MAF delivery obligation.",
    note: "IBWC's document library has no stable URL at add time.",
  },
  {
    id: "decree2006",
    kind: "law",
    cite: "Consolidated Decree, Arizona v. California, 547 U.S. 150 (2006).",
    used: "Lower Basin mainstem entitlements and accounting duties.",
    note: "No stable agency URL at add time.",
  },
  {
    id: "m323",
    kind: "law",
    cite: "International Boundary and Water Commission, Minute No. 323 (2017).",
    used: "Mexico's shortage-tied delivery reductions (§III.A) and recoverable savings (§IV); in effect through 2026-12-31.",
    note: "IBWC's document library has no stable URL at add time.",
  },
  {
    id: "rod2007",
    kind: "law",
    cite: "Record of Decision, Colorado River Interim Guidelines for Lower Basin Shortages and Coordinated Operations for Lake Powell and Lake Mead (2007).",
    url: "https://www.usbr.gov/lc/region/programs/strategies/RecordofDecision.pdf",
    used: "The v2007-ig-dcp rulebook's Powell tiers and Mead shortage bands; ICS program.",
  },
  {
    id: "dcp2019",
    kind: "law",
    cite: "Colorado River Basin Drought Contingency Plans (2019).",
    url: "https://www.usbr.gov/ColoradoRiverBasin/dcp/finaldocs.html",
    used: "Lower Basin DCP contributions layered onto the 2007 shortage tiers.",
  },
  {
    id: "seisrod2024",
    kind: "law",
    cite: "Record of Decision, Near-term Colorado River Operations SEIS (2024).",
    url: "https://www.usbr.gov/ColoradoRiverBasin/documents/NearTermColoradoRiverOperations/20240507-Near-termColoradoRiverOperations-SEIS-RecordofDecision-signed_508.pdf",
    used: "§6.E authority for the WY2026 Powell release reduction (7.48 → 6.00 MAF).",
  },
  {
    id: "p26rod2026",
    kind: "law",
    cite: "Record of Decision, Decision Framework for Colorado River Guidelines: Coordinated Operations of Lake Powell and Lake Mead 2027–2036 (signed August 21, 2026).",
    url: "https://www.usbr.gov/ColoradoRiverBasin/post2026/decision-doc/P26_RecordofDecision_Final.pdf",
    used: "The succession: adopts the Decision Framework the 2027–2028 Operating Guidelines implement.",
  },
  {
    id: "og2728",
    kind: "law",
    cite: "Colorado River Guidelines for Coordinated Operations of Lake Powell and Lake Mead, Operating Years 2027 and 2028 (August 2026).",
    url: "https://www.usbr.gov/ColoradoRiverBasin/post2026/decision-doc/2027-2028OperatingGuidelines_Final.pdf",
    used: "The v2027-og rulebook: Powell operating ranges and release ladders; the fixed 6.25 MAF Shortage Condition.",
  },
  {
    id: "aop2026",
    kind: "law",
    cite: "Annual Operating Plan for Colorado River Reservoirs 2026.",
    url: "https://www.usbr.gov/lc/region/g4000/aop/AOP26.pdf",
    used: "The operating context the 24-Month Study implements for 2026.",
  },
  // --------------------------------------------------------- federal
  {
    id: "rise",
    kind: "federal",
    cite: "U.S. Bureau of Reclamation, Reclamation Information Sharing Environment (RISE).",
    url: "https://data.usbr.gov/",
    used: "Live reservoir storage, elevation, and Powell unregulated inflow — every live water number on the site. Provisional throughout.",
  },
  {
    id: "ms24",
    kind: "federal",
    cite: "U.S. Bureau of Reclamation, 24-Month Study (monthly; Most Probable).",
    url: "https://www.usbr.gov/lc/region/g4000/24mo.pdf",
    used: "Official projections shown beside ours; the trigger mechanism for annual determinations.",
    note: "PDF-only; the URL always holds the current edition.",
  },
  {
    id: "naturalflow",
    kind: "federal",
    cite: "U.S. Bureau of Reclamation, Colorado River Basin Natural Flow and Salt database (WY1906–2020 release of 2022-12-15).",
    url: "https://www.usbr.gov/lc/region/g4000/NaturalFlow/",
    used: "The century supply series at Lees Ferry; the long-term and modern means.",
    note: "Natural flow is computed (observed flow plus upstream use added back) and revisable.",
  },
  {
    id: "decree2025",
    kind: "federal",
    cite: "U.S. Bureau of Reclamation, Colorado River Accounting and Water Use Report: Arizona, California, and Nevada, CY2025 (Article V decree accounting).",
    url: "https://www.usbr.gov/lc/region/g4000/4200Rpts/DecreeRpt/2025/2025.pdf",
    used: "Delivery volumes by system (the Pareto on Current state; the infrastructure roster) — and, via the annual report series 2003–2025, the Lower Basin consumptive-use history on the landing.",
  },
  {
    id: "feis2026",
    kind: "federal",
    cite: "U.S. Bureau of Reclamation, Final Environmental Impact Statement, Post-2026 Colorado River Operations (published July 31, 2026).",
    url: "https://www.usbr.gov/ColoradoRiverBasin/post2026/",
    used: "The 2020–2024 consumptive-use averages behind the demand figures.",
  },
  {
    id: "usdm",
    kind: "federal",
    cite: "U.S. Drought Monitor (National Drought Mitigation Center, USDA, NOAA); data services API.",
    url: "https://usdmdataservices.unl.edu/",
    used: "Weekly percent-area drought severity for the Upper and Lower Colorado watersheds.",
    note: "A weekly expert synthesis of many indicators, not a single instrument.",
  },
  {
    id: "awdb",
    kind: "federal",
    cite: "USDA Natural Resources Conservation Service, Air and Water Database (AWDB) REST API — SNOTEL network.",
    url: "https://wcc.sc.egov.usda.gov/awdbRestApi/",
    used: "Snow-water equivalent and medians for the basin snowpack index (137 HUC-14 stations).",
  },
  {
    id: "cdl",
    kind: "federal",
    cite: "USDA National Agricultural Statistics Service, Cropland Data Layer (2023).",
    url: "https://pdi.scinet.usda.gov/image/rest/services/CDLS_WM_GP/ImageServer",
    used: "Satellite-classified crop composition for the sixteen largest irrigation counties.",
  },
  {
    id: "nid",
    kind: "federal",
    cite: "U.S. Army Corps of Engineers, National Inventory of Dams.",
    url: "https://nid.sec.usace.army.mil/",
    used: "The map's inventory of large dams (≥10 kAF) beyond the live-gauged reservoirs.",
  },
  {
    id: "usgswd",
    kind: "federal",
    cite: "U.S. Geological Survey, Water Data OGC API.",
    url: "https://api.waterdata.usgs.gov/ogcapi/v0/",
    used: "Daily river discharge for the tappable river hydrographs (Lees Ferry, Cisco, Green River, Bluff, Dome).",
  },
  {
    id: "usgswu2015",
    kind: "federal",
    cite: "U.S. Geological Survey, Estimated Use of Water in the United States, county-level data (2015).",
    used: "County irrigation withdrawals on the map — the last county-by-county census of water use.",
    note: "Withdrawals, not consumptive use; never combined with other accountings.",
  },
  {
    id: "epqs",
    kind: "federal",
    cite: "U.S. Geological Survey, 3D Elevation Program — Elevation Point Query Service.",
    url: "https://epqs.nationalmap.gov/",
    used: "Terrain profiles under the aqueducts in the machine explorer.",
  },
  {
    id: "census",
    kind: "federal",
    cite: "U.S. Census Bureau, city population estimates (SUB-EST2024) and TIGERweb.",
    url: "https://tigerweb.geo.census.gov/",
    used: "City populations and locations; county boundaries.",
  },
  {
    id: "openet",
    kind: "federal",
    cite: "OpenET (NASA, USGS, USDA partnership), satellite evapotranspiration API.",
    url: "https://openet-api.org/",
    used: "Field-scale consumption points on the map — modeled from satellite, and badged as such.",
  },
  // ----------------------------------------------------------- state
  {
    id: "cdss",
    kind: "state",
    cite: "Colorado Division of Water Resources, Colorado's Decision Support Systems (CDSS) REST services.",
    url: "https://dwr.state.co.us/Rest/",
    used: "Daily canal diversions (Grand Valley); water-court transaction ledger (District 72); rights net-amounts.",
  },
  {
    id: "adwr",
    kind: "state",
    cite: "Arizona Department of Water Resources, public GIS feature services.",
    url: "https://services.arcgis.com/C34zQ7veRS0V1t04/arcgis/rest/services",
    used: "Arizona surface-water filings; groundwater-basin boundaries for the export-basin map.",
  },
  {
    id: "utdwri",
    kind: "state",
    cite: "Utah Division of Water Rights, change-application tracker.",
    url: "https://waterrights.utah.gov/applicationsrecords/chAppTracker.asp",
    used: "The live Utah change-application ledger on the rights instrument.",
  },
  {
    id: "swrcb",
    kind: "state",
    cite: "California State Water Resources Control Board, water-right change petitions.",
    url: "https://www.waterboards.ca.gov/waterrights/water_issues/programs/petitions/standard_change_petition.html",
    used: "California petitions on notice, and eWRIMS points of diversion.",
  },
  {
    id: "nmose",
    kind: "state",
    cite: "New Mexico Office of the State Engineer, points of diversion (WATERS database).",
    used: "New Mexico rights points (published without priority dates, shown as such).",
    note: "Bulk CSV export; no stable landing URL at add time.",
  },
  // -------------------------------------------------------- research
  {
    id: "richter2020",
    kind: "research",
    cite: "Richter, B.D., et al. (2020). Water scarcity and fish imperilment driven by beef production. Nature Sustainability 3, 319–328.",
    url: "https://doi.org/10.1038/s41893-020-0483-z",
    used: "The cattle-feed finding quoted in the Agriculture chapter.",
  },
  {
    id: "richter2024",
    kind: "research",
    cite: "Richter, B.D., et al. (2024). New water accounting reveals why the Colorado River no longer reaches the sea. Communications Earth & Environment 5.",
    url: "https://doi.org/10.1038/s43247-024-01291-0",
    used: "Sector shares of total basin consumption (a broader accounting than Reclamation's, never summed with it).",
  },
  {
    id: "milly2020",
    kind: "research",
    cite: "Milly, P.C.D. & Dunne, K.A. (2020). Colorado River flow dwindles as warming-driven loss of reflective snow energizes evaporation. Science 367, 1252–1255.",
    url: "https://doi.org/10.1126/science.aay9187",
    used: "The ~9.3% flow loss per °C of warming.",
  },
  {
    id: "williams2022",
    kind: "research",
    cite: "Williams, A.P., Cook, B.I. & Smerdon, J.E. (2022). Rapid intensification of the emerging southwestern North American megadrought. Nature Climate Change 12, 232–234.",
    url: "https://doi.org/10.1038/s41558-022-01290-z",
    used: "The driest-22-years-since-800-CE finding and its anthropogenic attribution.",
  },
  {
    id: "meko2007",
    kind: "research",
    cite: "Meko, D.M., et al. (2007). Medieval drought in the upper Colorado River Basin. Geophysical Research Letters 34, L10705.",
    url: "https://doi.org/10.1029/2007GL029988",
    used: "Tree-ring reconstruction of long-term mean flow (762–2005 CE).",
  },
  {
    id: "woodhouse2006",
    kind: "research",
    cite: "Woodhouse, C.A., Gray, S.T. & Meko, D.M. (2006). Updated streamflow reconstructions for the Upper Colorado River Basin. Water Resources Research 42, W05415.",
    url: "https://doi.org/10.1029/2005WR004455",
    used: "Independent reconstruction corroborating the long-term mean.",
  },
  // ------------------------------------------------------------- geo
  {
    id: "naturalearth",
    kind: "geo",
    cite: "Natural Earth, public-domain map data (river centerlines).",
    url: "https://www.naturalearthdata.com/",
    used: "River geometry on the story map.",
    note: "A community compilation, not an agency of record; migration to USGS NHD is queued.",
  },
  {
    id: "usatlas",
    kind: "geo",
    cite: "us-atlas TopoJSON (derived from U.S. Census Bureau cartographic boundaries).",
    url: "https://github.com/topojson/us-atlas",
    used: "State boundaries on the maps.",
    note: "Derived distribution; migration to Census TIGER direct is queued.",
  },
  {
    id: "wbd",
    kind: "geo",
    cite: "U.S. Geological Survey, Watershed Boundary Dataset (HUC-2: Upper and Lower Colorado regions).",
    used: "The watershed outline on every map.",
  },
];
