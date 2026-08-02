/**
 * System-scale figures for supply, demand, and allocation.
 *
 * These are NOT live-fetched — they come from periodic federal reports and
 * peer-reviewed studies. Every figure carries its source, period, epistemic
 * class, and confidence, because this is exactly where the definitional traps
 * live (see docs/DESIGN_PRINCIPLES.md §5).
 *
 * CRITICAL: two different accounting universes appear below and must never be
 * blended into one total:
 *
 *   RECLAMATION accounting (Post-2026 FEIS, 2020–2024) counts Upper Basin +
 *   Lower Basin consumptive use, reservoir evaporation, and the Mexico
 *   delivery. ~13.2 MAF/yr.
 *
 *   RICHTER et al. 2024 (Comms Earth & Env, 2000–2019) counts all basin
 *   consumption INCLUDING natural riparian vegetation ET, which is not a human
 *   use and is absent from Compact accounting. ~19.3 MAF/yr.
 *
 * The balance narrative uses Reclamation's framing; the sector breakdown uses
 * Richter's. Each is labeled on screen with its own total.
 */

export type Confidence = "high" | "medium" | "low";
export type EpistemicClass =
  | "observed"
  | "estimated"
  | "reconstructed"
  | "administrative"
  | "forecast";

export interface Sourced {
  readonly id: string;
  readonly label: string;
  /** Acre-feet per year unless noted. */
  readonly acreFeet: number;
  readonly source: string;
  readonly period: string;
  readonly epistemic: EpistemicClass;
  readonly confidence: Confidence;
  readonly note?: string;
}

// ------------------------------------------------------------------ supply

export const SUPPLY = {
  compactAssumption: {
    id: "supply.compact_assumption",
    label: "Assumed at the 1922 Compact",
    acreFeet: 16_400_000,
    source: "Widely corroborated secondary consensus on the 1916–22 gauge record",
    period: "measured c. 1905–1922",
    epistemic: "administrative",
    confidence: "high",
    note:
      "The Compact was negotiated on measurements from one of the wettest " +
      "periods in roughly 1,200 years. This single number is the origin of " +
      "the structural deficit.",
  },
  reconstructedMean: {
    id: "supply.reconstructed_mean",
    label: "Tree-ring reconstructed long-term mean",
    acreFeet: 14_660_000,
    source: "Meko et al. 2007 (14.655 MAF, 762–2005 CE); Woodhouse et al. 2006 (14.669 MAF)",
    period: "762–2005 CE",
    epistemic: "reconstructed",
    confidence: "high",
    note:
      "Two independent reconstructions agree closely. Reconstructed, not " +
      "measured — inferred from tree-ring width, with method differences " +
      "worth footnoting.",
  },
  observedMean: {
    id: "supply.observed_mean",
    label: "Observed long-term natural flow",
    acreFeet: 14_600_000,
    source: "Reclamation naturalized flow record at Lees Ferry",
    period: "1906–2024",
    epistemic: "estimated",
    confidence: "medium",
    note:
      "'Natural' flow is reconstructed by adding back upstream consumptive " +
      "use — a computed quantity, not a gauge reading. Reclamation's dataset " +
      "is currently stale at a September 2024 vintage.",
  },
  modernMean: {
    id: "supply.modern_mean",
    label: "Modern natural flow",
    acreFeet: 12_400_000,
    source: "Reported average of the Reclamation naturalized flow record",
    period: "≈2000–2025",
    epistemic: "estimated",
    confidence: "medium",
    note:
      "Roughly 15% below the long-term mean and 24% below the Compact " +
      "assumption. Not yet verified against Reclamation's own dataset.",
  },
} as const satisfies Record<string, Sourced>;

/** Warming's effect on flow — the mechanism behind the decline. */
export const TEMPERATURE_SENSITIVITY = {
  percentPerDegreeC: 9.3,
  source: "Milly & Dunne 2020, Science 367:1252 (doi:10.1126/science.aay9187)",
  mechanism:
    "Snow-albedo loss increases absorbed solar radiation, which energizes " +
    "evapotranspiration — the decline is driven by heat, not only by less " +
    "precipitation.",
  confidence: "high" as Confidence,
};

export const MEGADROUGHT = {
  label: "Driest 22-year period since at least 800 CE",
  attributionPercent: 40,
  source:
    "Williams et al. 2022, Nature Climate Change 12:232 " +
    "(doi:10.1038/s41558-022-01290-z)",
  note:
    "Roughly 40% of the drought's severity is attributed to anthropogenic " +
    "climate change.",
  confidence: "high" as Confidence,
};

// ------------------------------------------------- demand: Reclamation view

/** Reclamation accounting. Percentages are of the ~13.2 MAF total. */
export const DEMAND_RECLAMATION: readonly Sourced[] = [
  {
    id: "demand.lower_basin",
    label: "Lower Basin consumptive use",
    acreFeet: 6_500_000,
    source: "Post-2026 Final EIS (published 2026-07-31)",
    period: "2020–2024 average",
    epistemic: "estimated",
    confidence: "high",
    note: "California, Arizona, and Nevada. 49% of the accounted total.",
  },
  {
    id: "demand.upper_basin",
    label: "Upper Basin consumptive use",
    acreFeet: 3_800_000,
    source: "Post-2026 Final EIS (published 2026-07-31)",
    period: "2020–2024 average",
    epistemic: "estimated",
    confidence: "medium",
    note:
      "DISPUTED: Reclamation's own Consumptive Uses & Losses report gives " +
      "4.3 MAF for 2021–2025. The gap appears to be whether Upper Basin " +
      "reservoir evaporation is bucketed here or counted separately. Both " +
      "figures are federal; neither is wrong, they answer different questions.",
  },
  {
    id: "demand.mexico",
    label: "Delivery to Mexico",
    acreFeet: 1_450_000,
    source: "1944 Treaty (1.5 MAF); 2026 initial allocation 1,352,595 AF after Minute 323/330 reductions",
    period: "2026",
    epistemic: "administrative",
    confidence: "medium",
    note:
      "Treaty obligation is 1.5 MAF; actual scheduled delivery is reduced " +
      "under shortage. Minute 323 expires 2026-12-31 with no successor yet.",
  },
  {
    id: "demand.evaporation",
    label: "Reservoir evaporation & system losses",
    acreFeet: 1_400_000,
    source: "Post-2026 Final EIS",
    period: "recent average",
    epistemic: "estimated",
    confidence: "medium",
    note:
      "Method-dependent: Lake Mead alone is estimated anywhere from 600,000 " +
      "to 875,000 AF/yr depending on measurement approach. Who bears this " +
      "loss is legally unsettled — California has formally rejected charging " +
      "it to Lower Basin contractors.",
  },
];

export const DEMAND_RECLAMATION_TOTAL = DEMAND_RECLAMATION.reduce(
  (s, d) => s + d.acreFeet,
  0,
);

/** The structural deficit: accounted demand minus modern supply. */
export const STRUCTURAL_DEFICIT =
  DEMAND_RECLAMATION_TOTAL - SUPPLY.modernMean.acreFeet;

// ----------------------------------------------------- demand: sector view

/**
 * Richter et al. 2024 — a DIFFERENT accounting universe. Its 19.3 MAF total
 * includes natural riparian vegetation ET, which Compact accounting excludes.
 * Never add these to the Reclamation figures.
 */
export const RICHTER = {
  totalAcreFeet: 19_300_000,
  period: "2000–2019 average",
  source:
    "Richter et al. 2024, Communications Earth & Environment " +
    "(doi:10.1038/s43247-024-01291-0)",
  confidence: "high" as Confidence,
  sectors: [
    {
      id: "sector.agriculture",
      label: "Agriculture",
      percent: 52,
      note: "The dominant consumptive use, by a wide margin.",
    },
    {
      id: "sector.natural_vegetation",
      label: "Natural vegetation ET",
      percent: 19,
      note:
        "Riparian and wetland evapotranspiration. NOT a human use — this is " +
        "why the Richter total exceeds Compact-style accounting.",
    },
    {
      id: "sector.municipal",
      label: "Municipal, commercial & industrial",
      percent: 18,
      note: "Every city in the basin combined — under a fifth of the total.",
    },
    {
      id: "sector.reservoir_evaporation",
      label: "Reservoir evaporation",
      percent: 11,
      note: "Water lost from reservoir surfaces before anyone uses it.",
    },
  ],
} as const;

/** Within agriculture — where the water actually goes. */
export const CROPS = {
  source: RICHTER.source,
  period: RICHTER.period,
  confidence: "high" as Confidence,
  cattleFeedShareOfBasin: 32,
  cattleFeedShareOfAgriculture: 62,
  alfalfaAcreFeet: 5_000_000,
  alfalfaShareOfBasin: 26,
  upperBasinAgToCattleFeed: 90,
  note:
    "Alfalfa and other cattle-feed crops are the single largest use of " +
    "Colorado River water. Alfalfa persists because it is high-yielding, " +
    "nutrient-dense, perennial, nitrogen-fixing, marketable, and well suited " +
    "to livestock systems — not because anyone is being wasteful.",
};

// ------------------------------------------------------------ allocations

/** Legal entitlements. ADMINISTRATIVE — not measurements of anything. */
export const APPORTIONMENTS: readonly Sourced[] = [
  {
    id: "alloc.california",
    label: "California",
    acreFeet: 4_400_000,
    source: "Boulder Canyon Project Act; Consolidated Decree, Arizona v. California",
    period: "since 1928/1964",
    epistemic: "administrative",
    confidence: "high",
  },
  {
    id: "alloc.arizona",
    label: "Arizona",
    acreFeet: 2_800_000,
    source: "Boulder Canyon Project Act; Consolidated Decree, Arizona v. California",
    period: "since 1928/1964",
    epistemic: "administrative",
    confidence: "high",
  },
  {
    id: "alloc.nevada",
    label: "Nevada",
    acreFeet: 300_000,
    source: "Boulder Canyon Project Act; Consolidated Decree, Arizona v. California",
    period: "since 1928/1964",
    epistemic: "administrative",
    confidence: "high",
  },
];

export const UPPER_BASIN_SHARES = {
  totalAcreFeet: 7_500_000,
  note:
    "The Upper Basin's 7.5 MAF apportionment is divided by PERCENTAGE, not " +
    "fixed volume — so Upper Basin states absorb hydrologic shortfall " +
    "automatically, while Lower Basin entitlements are fixed volumes. That " +
    "asymmetry is central to the current interstate conflict.",
  source: "1948 Upper Colorado River Basin Compact",
  confidence: "high" as Confidence,
  shares: [
    { label: "Colorado", percent: 51.75 },
    { label: "Utah", percent: 23.0 },
    { label: "Wyoming", percent: 14.0 },
    { label: "New Mexico", percent: 11.25 },
  ],
};

/** Total legal commitments vs. what the river actually produces. */
export const TOTAL_APPORTIONED =
  7_500_000 + // Lower Basin
  7_500_000 + // Upper Basin
  1_500_000;  // Mexico, 1944 Treaty

// -------------------------------------------------------- Colorado / local

export const COLORADO_TRANSBASIN: readonly Sourced[] = [
  {
    id: "transbasin.cbt",
    label: "Colorado-Big Thompson (Adams Tunnel)",
    acreFeet: 230_000,
    source: "Northern Water; aggregated secondary sources",
    period: "recent average",
    epistemic: "estimated",
    confidence: "medium",
    note: "Serves Front Range cities and farms; authorized up to 300,000 AF.",
  },
  {
    id: "transbasin.denver",
    label: "Denver Water (Moffat & Roberts Tunnels)",
    acreFeet: 150_000,
    source: "Denver Water; aggregated secondary sources",
    period: "recent average",
    epistemic: "estimated",
    confidence: "medium",
    note: "Denver Water publishes daily diversion readings, but only as PDFs.",
  },
  {
    id: "transbasin.fryark",
    label: "Fryingpan-Arkansas Project",
    acreFeet: 52_000,
    source: "Reclamation; Southeastern Colorado Water Conservancy District",
    period: "recent average",
    epistemic: "estimated",
    confidence: "medium",
  },
];

export const COLORADO_TRANSBASIN_TOTAL = COLORADO_TRANSBASIN.reduce(
  (s, d) => s + d.acreFeet,
  0,
);

export const TRANSBASIN_NOTE =
  "Water diverted UNDER the Continental Divide from the Colorado River's " +
  "headwaters to the Front Range — where most of Colorado's population lives. " +
  "It leaves the basin entirely and never returns. No single canonical source " +
  "publishes the combined total; this is an aggregate of project-level figures.";
