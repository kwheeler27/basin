/**
 * Reservoir reference constants and operating thresholds.
 *
 * Capacities are NOMINAL full-pool figures. Sedimentation shifts the real
 * area-capacity curve over decades and re-surveys disagree — these are the
 * values consistent with Reclamation's own published percent-full reporting
 * (verified 2026-08-01: our computed 22% Powell / 27% Mead using these
 * constants matched Reclamation's reported figures).
 *
 * Thresholds carry the confidence ratings from docs/OPERATING_RULES.md.
 * Anything below HIGH is labeled in the UI rather than presented as fact.
 */

export type Confidence = "high" | "medium";

export interface Threshold {
  readonly elevation: number;
  readonly label: string;
  readonly short: string;
  readonly kind: "tier" | "power" | "dead" | "full";
  readonly confidence: Confidence;
  readonly note?: string;
}

export interface ReservoirRef {
  readonly id: string;
  readonly name: string;
  readonly dam: string;
  readonly capacityAcreFeet: number;
  readonly capacityBasis: string;
  readonly fullPoolElevation: number;
  readonly elevationMeasureId: string;
  readonly storageMeasureId: string;
  readonly riseElevationItem: number;
  readonly riseStorageItem: number;
  readonly thresholds: readonly Threshold[];
}

export const POWELL: ReservoirRef = {
  id: "usbr.lake_powell",
  name: "Lake Powell",
  dam: "Glen Canyon Dam",
  capacityAcreFeet: 24_322_000,
  capacityBasis: "nominal full-pool capacity at elevation 3,700 ft",
  fullPoolElevation: 3700,
  elevationMeasureId: "colorado.reservoir.powell.elevation",
  storageMeasureId: "colorado.reservoir.powell.storage",
  riseElevationItem: 508,
  riseStorageItem: 509,
  thresholds: [
    {
      elevation: 3575,
      label: "Upper Elevation Balancing Tier boundary",
      short: "3,575 — tier boundary",
      kind: "tier",
      confidence: "high",
      note: "At or above 3,575 ft: 8.23 MAF release (balancing if Mead < 1,075 ft).",
    },
    {
      elevation: 3525,
      label: "Mid-Elevation Release Tier boundary",
      short: "3,525 — tier boundary",
      kind: "tier",
      confidence: "high",
      note: "Below 3,525 ft the Lower Elevation Balancing Tier applies (7.0–9.5 MAF).",
    },
    {
      elevation: 3490,
      label: "Minimum power pool",
      short: "3,490 — minimum power pool",
      kind: "power",
      confidence: "medium",
      note: "Glen Canyon Dam stops generating. Convergent secondary sources; not confirmed in a primary Reclamation document.",
    },
    {
      elevation: 3370,
      label: "Dead pool",
      short: "3,370 — dead pool",
      kind: "dead",
      confidence: "high",
      note: "Zero active storage; no gravity release possible. Stated in Reclamation's own tier table.",
    },
  ],
};

export const MEAD: ReservoirRef = {
  id: "usbr.lake_mead",
  name: "Lake Mead",
  dam: "Hoover Dam",
  capacityAcreFeet: 26_120_000,
  capacityBasis: "nominal full-pool capacity at elevation 1,229 ft",
  fullPoolElevation: 1229,
  elevationMeasureId: "colorado.reservoir.mead.elevation",
  storageMeasureId: "colorado.reservoir.mead.storage",
  riseElevationItem: 6123,
  riseStorageItem: 6124,
  thresholds: [
    {
      elevation: 1090,
      label: "DCP contributions begin",
      short: "1,090 — DCP contributions",
      kind: "tier",
      confidence: "high",
      note: "At or below 1,090 ft: Arizona 192 kaf, Nevada 8 kaf, Mexico 41 kaf.",
    },
    {
      elevation: 1075,
      label: "Tier 1 shortage",
      short: "1,075 — Tier 1 shortage",
      kind: "tier",
      confidence: "high",
      note: "Combined reductions of 613 kaf (AZ 512, NV 21, Mexico 80).",
    },
    {
      elevation: 1050,
      label: "Tier 2 shortage",
      short: "1,050 — Tier 2 shortage",
      kind: "tier",
      confidence: "high",
      note: "Combined reductions of 721 kaf. California still contributes nothing above 1,045 ft.",
    },
    {
      elevation: 1025,
      label: "Tier 3 shortage",
      short: "1,025 — Tier 3 shortage",
      kind: "tier",
      confidence: "high",
      note: "Maximum tier: 1,375 kaf combined (AZ 720, NV 30, CA 350, Mexico 275).",
    },
    {
      elevation: 950,
      label: "Minimum power pool",
      short: "950 — minimum power pool",
      kind: "power",
      confidence: "medium",
      note: "Hoover Dam stops generating. Convergent sources; not read in a primary Reclamation document.",
    },
    {
      elevation: 895,
      label: "Dead pool",
      short: "895 — dead pool",
      kind: "dead",
      confidence: "medium",
      note: "No gravity release possible. Consistent across sources but not primary-verified.",
    },
  ],
};

export const RESERVOIRS = [POWELL, MEAD] as const;

export const COMBINED_CAPACITY_ACRE_FEET =
  POWELL.capacityAcreFeet + MEAD.capacityAcreFeet;

/**
 * Reference flow for scale comparison.
 *
 * MEDIUM confidence: reported as the ~2000–2025 average natural (naturalized)
 * flow at Lees Ferry, sourced secondhand and not yet confirmed against
 * Reclamation's own naturalized-flow dataset (which is itself stale at a
 * September 2024 vintage — see docs/DATA_SOURCES.md). Labeled as approximate
 * wherever it appears.
 */
export const MODERN_ANNUAL_FLOW_ACRE_FEET = 12_400_000;
export const MODERN_FLOW_BASIS = "≈2000–2025 average natural flow at Lees Ferry";

/** Operating rules currently in force. See docs/OPERATING_RULES.md. */
export const RULEBOOK = {
  version: "v2007-ig-dcp",
  label: "2007 Interim Guidelines + 2019 DCP",
  expires: "2026-09-30",
  successorStatus:
    "Post-2026 Record of Decision issued 2026-08-21 — it adopts the Decision Framework (2027–2036), and the 2027–2028 Operating Guidelines are issued.",
  currentTier: "Tier 1 shortage (CY2026)",
  tierBasis:
    "Declared from the August 2025 24-Month Study on a projected 2026-01-01 Mead elevation of 1,055.88 ft.",
} as const;
