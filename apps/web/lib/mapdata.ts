/**
 * Map annotation data: reservoirs, engineered conveyance, demand centers.
 *
 * Rivers come from Natural Earth centerlines (real geometry). Everything in
 * THIS file is hand-placed: point locations are real lat/lons, but aqueduct
 * PATHS are schematic straight-line runs between real endpoints — labeled as
 * schematic in the UI. Volumes appear only where a source exists; unsourced
 * flows get a name and role, never an invented number.
 *
 * Palette (validated with the dataviz six-checks validator, light + dark):
 *   natural water  #2b7fb8 / #4a90c2
 *   engineered     #b4560f / #c9773a   (also dashed — secondary encoding)
 *   accent         #0c8f6b / #2e9d85
 *   spare          #7b5ea7 / #9678cf
 */

export interface MapReservoir {
  readonly id: string;
  readonly name: string;
  readonly lon: number;
  readonly lat: number;
  readonly capacityAf: number;
  /** RISE item for live storage, when wired. */
  readonly riseStorageItem?: number;
  /** Why no live feed exists (non-Reclamation operators). */
  readonly noLiveReason?: string;
  readonly note?: string;
}

export const MAP_RESERVOIRS: readonly MapReservoir[] = [
  {
    id: "powell",
    name: "Lake Powell",
    lon: -111.35,
    lat: 37.05,
    capacityAf: 24_322_000,
    riseStorageItem: 509,
    note: "Second-largest US reservoir. Glen Canyon Dam, 1963.",
  },
  {
    id: "mead",
    name: "Lake Mead",
    lon: -114.41,
    lat: 36.25,
    capacityAf: 26_120_000,
    riseStorageItem: 6124,
    note: "Largest US reservoir. Hoover Dam, 1935.",
  },
  {
    id: "flaming_gorge",
    name: "Flaming Gorge",
    lon: -109.53,
    lat: 41.11,
    capacityAf: 3_749_000,
    riseStorageItem: 337,
    note: "Green River. Upstream regulation for Powell.",
  },
  {
    id: "navajo",
    name: "Navajo",
    lon: -107.61,
    lat: 36.8,
    capacityAf: 1_696_000,
    riseStorageItem: 613,
    note: "San Juan River.",
  },
  {
    id: "blue_mesa",
    name: "Blue Mesa",
    lon: -107.34,
    lat: 38.45,
    capacityAf: 829_500,
    riseStorageItem: 76,
    note: "Gunnison River, Colorado.",
  },
  {
    id: "mohave",
    name: "Lake Mohave",
    lon: -114.6,
    lat: 35.4,
    capacityAf: 1_810_000,
    riseStorageItem: 6134,
    note: "Davis Dam — re-regulates Hoover releases and delivers to downstream diverters.",
  },
  {
    id: "havasu",
    name: "Lake Havasu",
    lon: -114.35,
    lat: 34.45,
    capacityAf: 648_000,
    riseStorageItem: 6129,
    note: "Parker Dam — the intake pool for BOTH the CAP and the Colorado River Aqueduct.",
  },
  {
    id: "roosevelt",
    name: "Theodore Roosevelt",
    lon: -111.16,
    lat: 33.67,
    capacityAf: 1_600_000,
    noLiveReason: "Operated by Salt River Project, not Reclamation — no federal live feed.",
    note: "Salt River Project — the Gila/Salt system that Phoenix blends with CAP water.",
  },
  {
    id: "strawberry",
    name: "Strawberry",
    lon: -111.13,
    lat: 40.17,
    capacityAf: 1_100_000,
    riseStorageItem: 779,
    note: "Central Utah Project — stores Colorado basin water bound for the Wasatch Front.",
  },
  {
    id: "fontenelle",
    name: "Fontenelle",
    lon: -110.06,
    lat: 42.03,
    capacityAf: 345_000,
    riseStorageItem: 347,
    note: "Green River headwaters, Wyoming.",
  },
  {
    id: "granby",
    name: "Lake Granby",
    lon: -105.85,
    lat: 40.15,
    capacityAf: 540_000,
    riseStorageItem: 383,
    note: "Colorado-Big Thompson collection pool — where Front Range transbasin water starts.",
  },
  {
    id: "mcphee",
    name: "McPhee",
    lon: -108.55,
    lat: 37.58,
    capacityAf: 381_000,
    riseStorageItem: 569,
    note: "Dolores Project, southwest Colorado.",
  },
  {
    id: "dillon",
    name: "Dillon",
    lon: -106.06,
    lat: 39.62,
    capacityAf: 257_000,
    noLiveReason: "Denver Water reservoir — publishes readings as PDFs only, no API.",
    note: "Denver Water's largest reservoir — feeds the Roberts Tunnel under the Divide.",
  },
];

export interface MapConveyance {
  readonly id: string;
  readonly name: string;
  /** [lon, lat] waypoints — SCHEMATIC path between real endpoints. */
  readonly path: readonly (readonly [number, number])[];
  readonly role: string;
  /** Sourced volume only; omit rather than invent. */
  readonly approxAfPerYear?: number;
  readonly volumeSource?: string;
}

export const MAP_CONVEYANCE: readonly MapConveyance[] = [
  {
    id: "transbasin",
    name: "Transbasin diversions to the Front Range",
    path: [
      [-105.82, 40.24],
      [-105.5, 40.05],
      [-105.08, 39.9],
      [-104.99, 39.74],
    ],
    role: "Adams, Moffat & Roberts tunnels under the Continental Divide — water that leaves the basin permanently",
    approxAfPerYear: 432_000,
    volumeSource: "Aggregated project-level reporting (C-BT ~230k, Denver Water ~150k, Fry-Ark ~52k)",
  },
  {
    id: "cap",
    name: "Central Arizona Project",
    path: [
      [-114.14, 34.3],
      [-113.2, 33.85],
      [-112.07, 33.45],
      [-110.97, 32.25],
    ],
    role: "336-mile aqueduct lifting Colorado River water 2,900 ft to Phoenix and Tucson",
  },
  {
    id: "cra",
    name: "Colorado River Aqueduct",
    path: [
      [-114.14, 34.3],
      [-115.4, 33.9],
      [-116.5, 33.85],
      [-117.2, 33.95],
    ],
    role: "Metropolitan Water District's 242-mile aqueduct to coastal Southern California",
  },
  {
    id: "snwa",
    name: "Las Vegas intakes",
    path: [
      [-114.41, 36.25],
      [-115.14, 36.17],
    ],
    role: "Southern Nevada draws nearly all its water from Lake Mead",
  },
  {
    id: "aac",
    name: "All-American Canal",
    path: [
      [-114.47, 32.88],
      [-115.0, 32.72],
      [-115.5, 32.8],
    ],
    role: "Delivers the Imperial Irrigation District's ~3.1 MAF entitlement — the single largest on the river, ~97% agricultural",
    approxAfPerYear: 3_100_000,
    volumeSource: "IID QSA reporting",
  },
  {
    id: "mexico",
    name: "Delivery to Mexico",
    path: [
      [-114.72, 32.72],
      [-115.0, 32.3],
    ],
    role: "1944 Treaty delivery at Morelos Dam — 1.5 MAF obligation, reduced under shortage",
    approxAfPerYear: 1_352_595,
    volumeSource: "IBWC 2026 initial allocation under Minute 323/330",
  },
];

export interface MapCity {
  readonly name: string;
  readonly lon: number;
  readonly lat: number;
  readonly note: string;
}

export const MAP_CITIES: readonly MapCity[] = [
  { name: "Denver", lon: -104.99, lat: 39.74, note: "Front Range — outside the basin, supplied through the Divide" },
  { name: "Las Vegas", lon: -115.14, lat: 36.17, note: "~90% dependent on Lake Mead" },
  { name: "Phoenix", lon: -112.07, lat: 33.45, note: "CAP terminus" },
  { name: "Los Angeles", lon: -118.24, lat: 34.05, note: "Colorado River Aqueduct" },
  { name: "Salt Lake City", lon: -111.89, lat: 40.76, note: "Upper Basin municipal use" },
  { name: "Albuquerque", lon: -106.65, lat: 35.08, note: "San Juan–Chama transbasin supply" },
];

/** Lees Ferry — the Compact point dividing Upper and Lower Basins. */
export const LEES_FERRY = { lon: -111.59, lat: 36.86 };

/** FIPS ids of the seven basin states, for emphasis. */
export const BASIN_STATE_FIPS = new Set([
  "04", // AZ
  "06", // CA
  "08", // CO
  "32", // NV
  "35", // NM
  "49", // UT
  "56", // WY
]);

/* ------------------------------------------------------------------ people
 * Where the ~40 million people are. Figures are provider-published service
 * populations (approx); the basin-states total exceeds this list because it
 * also counts in-basin communities and tribes not itemized here.
 */

export interface MapPopulation {
  readonly id: string;
  readonly name: string;
  readonly lon: number;
  readonly lat: number;
  readonly people: number;
  readonly source: string;
  readonly note: string;
  readonly confidence: "high" | "medium";
}

export const MAP_POPULATION: readonly MapPopulation[] = [
  {
    id: "socal",
    name: "Coastal Southern California",
    lon: -117.9,
    lat: 33.95,
    people: 19_000_000,
    source: "Metropolitan Water District service population",
    note: "MWD's 26 member agencies, LA to San Diego. The Colorado River Aqueduct supplies roughly a quarter to a third of the region's water.",
    confidence: "high",
  },
  {
    id: "phoenix",
    name: "Phoenix metro",
    lon: -112.0,
    lat: 33.55,
    people: 5_000_000,
    source: "Census metro estimate; CAP + Salt/Verde (SRP) + groundwater",
    note: "CAP lifts Colorado River water 2,900 ft over 336 miles; the metro blends it with Salt River Project supplies.",
    confidence: "medium",
  },
  {
    id: "tucson",
    name: "Tucson metro",
    lon: -110.97,
    lat: 32.25,
    people: 1_000_000,
    source: "Census metro estimate; Tucson Water",
    note: "Once all-groundwater; now predominantly CAP Colorado River water recharged into the aquifer.",
    confidence: "medium",
  },
  {
    id: "colorado_springs",
    name: "Colorado Springs",
    lon: -104.82,
    lat: 38.83,
    people: 750_000,
    source: "Colorado Springs Utilities",
    note: "Outside the basin; roughly 70% of supply is transbasin Colorado River water (Homestake, Fry-Ark, Blue River).",
    confidence: "medium",
  },
  {
    id: "st_george",
    name: "St. George / Washington Co.",
    lon: -113.58,
    lat: 37.1,
    people: 200_000,
    source: "Census; Washington Co. Water Conservancy District",
    note: "Among the fastest-growing US metros — supplied by the Virgin River, a Colorado tributary.",
    confidence: "medium",
  },
  {
    id: "grand_junction",
    name: "Grand Junction",
    lon: -108.55,
    lat: 39.07,
    people: 160_000,
    source: "Census metro estimate",
    note: "Largest city inside the Upper Basin — at the Colorado–Gunnison confluence.",
    confidence: "medium",
  },
  {
    id: "santa_fe",
    name: "Santa Fe",
    lon: -105.94,
    lat: 35.69,
    people: 130_000,
    source: "City of Santa Fe; San Juan–Chama Project",
    note: "Rio Grande city partly supplied by San Juan basin water through the divide.",
    confidence: "medium",
  },
  {
    id: "yuma_city",
    name: "Yuma",
    lon: -114.63,
    lat: 32.69,
    people: 100_000,
    source: "Census",
    note: "In-basin city amid the winter-vegetable district; senior-priority water.",
    confidence: "medium",
  },
  {
    id: "flagstaff",
    name: "Flagstaff",
    lon: -111.65,
    lat: 35.2,
    people: 80_000,
    source: "Census",
    note: "In-basin; local surface water and groundwater rather than mainstem deliveries.",
    confidence: "medium",
  },
  {
    id: "vegas",
    name: "Las Vegas Valley",
    lon: -115.14,
    lat: 36.05,
    people: 2_300_000,
    source: "Southern Nevada Water Authority",
    note: "About 90% of supply comes from Lake Mead.",
    confidence: "high",
  },
  {
    id: "front_range",
    name: "Colorado Front Range",
    lon: -104.95,
    lat: 39.85,
    people: 2_500_000,
    source: "Denver Water (~1.5M) + Northern Water C-BT (~1M)",
    note: "Outside the basin — supplied through tunnels under the Continental Divide.",
    confidence: "medium",
  },
  {
    id: "baja",
    name: "Mexicali · Tijuana · San Luis",
    lon: -115.3,
    lat: 32.35,
    people: 3_000_000,
    source: "Aggregated Mexican municipal estimates",
    note: "Mexico's 1.5 MAF treaty share supplies border cities and the Mexicali Valley.",
    confidence: "medium",
  },
  {
    id: "wasatch",
    name: "Wasatch Front",
    lon: -111.75,
    lat: 40.4,
    people: 1_500_000,
    source: "Central Utah Project service estimates",
    note: "Bonneville Unit moves Colorado River basin water to the Provo–Salt Lake corridor.",
    confidence: "medium",
  },
  {
    id: "abq",
    name: "Albuquerque",
    lon: -106.65,
    lat: 35.08,
    people: 700_000,
    source: "ABCWUA — San Juan–Chama Project",
    note: "Rio Grande city drinking San Juan basin water via transbasin diversion.",
    confidence: "medium",
  },
];

/* -------------------------------------------------------------- agriculture
 * Where the irrigated acres are, and what they grow. Volumes only where a
 * source exists; districts without one get a marker and a story, not a number.
 */

export interface MapAgriculture {
  readonly id: string;
  readonly name: string;
  readonly lon: number;
  readonly lat: number;
  /** Sourced annual water volume, when known. */
  readonly afPerYear?: number;
  readonly volumeSource?: string;
  readonly crops: string;
  readonly note: string;
}

export const MAP_AGRICULTURE: readonly MapAgriculture[] = [
  {
    id: "imperial",
    name: "Imperial Valley",
    lon: -115.5,
    lat: 32.95,
    afPerYear: 3_100_000,
    volumeSource: "IID QSA reporting — the largest single entitlement on the river, ~97% agricultural",
    crops: "Winter vegetables, alfalfa, sudangrass, wheat",
    note: "With Yuma, grows most of America's winter vegetables.",
  },
  {
    id: "yuma",
    name: "Yuma County",
    lon: -114.35,
    lat: 32.62,
    crops: "Winter leafy greens (~90% of the US supply), alfalfa, wheat, citrus",
    note: "Senior priority rights — often the last cut in shortage.",
  },
  {
    id: "crit",
    name: "Colorado River Indian Tribes",
    lon: -114.35,
    lat: 33.95,
    afPerYear: 719_000,
    volumeSource: "Decreed right, Arizona v. California",
    crops: "Alfalfa, cotton, wheat",
    note: "First-priority decreed right; among the most senior on the lower river.",
  },
  {
    id: "palo_verde",
    name: "Palo Verde Valley",
    lon: -114.65,
    lat: 33.6,
    crops: "Alfalfa and other forage",
    note: "Rotational fallowing agreements with Metropolitan move water to cities in dry years.",
  },
  {
    id: "coachella",
    name: "Coachella Valley",
    lon: -116.1,
    lat: 33.6,
    crops: "Dates, table grapes, citrus, peppers",
    note: "High-value permanent crops on Colorado River water.",
  },
  {
    id: "grand_valley",
    name: "Grand Valley",
    lon: -108.55,
    lat: 39.1,
    crops: "Peaches, wine grapes, alfalfa, corn",
    note: "Senior pre-Compact rights around Grand Junction.",
  },
  {
    id: "ub_forage",
    name: "Upper Basin hay meadows",
    lon: -107.7,
    lat: 40.35,
    crops: "Alfalfa and grass hay — 90% of Upper Basin irrigation water grows cattle feed (Richter et al. 2024)",
    note: "Distributed across high mountain valleys in CO, UT, WY, NM — marker is representative, not a single site.",
  },
];
