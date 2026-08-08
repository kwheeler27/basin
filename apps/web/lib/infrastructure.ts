/**
 * The machine behind the deliveries — curated, per-figure-sourced facility
 * data for the Infrastructure tab. Rules of this file: every number carries
 * its source; derived numbers say so; schematic positions say so. Omit
 * rather than invent (facilities whose specs we could not verify are named
 * without numbers or absent).
 */

export interface ProfilePoint {
  readonly name: string;
  /** Miles along the route from the intake. */
  readonly mile: number;
  readonly kind: "intake" | "pump" | "landmark" | "terminus";
  /** Lift in feet at this facility (pumps). */
  readonly liftFt?: number;
  /** Elevation AFTER this point, feet above sea level (absolute profiles). */
  readonly toElevFt?: number;
  readonly note?: string;
  /** True when the position/lift is schematic rather than published. */
  readonly schematic?: boolean;
}

/** Fraction [0..1] along the system's drawn route for map placement —
 *  derived from published mileposts (or schematic ones, flagged upstream). */
export function routeFraction(p: ProfilePoint, miles: number): number {
  return Math.max(0, Math.min(1, p.mile / miles));
}

export interface SystemProfile {
  readonly id: string;
  readonly name: string;
  readonly operator: string;
  readonly miles: number;
  readonly totalLiftFt: number;
  readonly totalLiftApprox?: boolean;
  /** Absolute elevations available (CRA) vs cumulative-lift schematic (CAP). */
  readonly profileKind: "absolute" | "cumulative-schematic";
  readonly startElevFt?: number;
  readonly points: readonly ProfilePoint[];
  readonly narrative: string;
  readonly powerNote?: string;
  readonly source: string;
}

export const SYSTEM_PROFILES: readonly SystemProfile[] = [
  {
    id: "cra",
    name: "Colorado River Aqueduct",
    operator: "Metropolitan Water District of Southern California",
    miles: 242,
    totalLiftFt: 1614,
    profileKind: "absolute",
    startElevFt: 450,
    points: [
      { name: "Whitsett Intake (Lake Havasu)", mile: 0, kind: "intake", liftFt: 291, toElevFt: 741, note: "Nine pumps; the aqueduct's starting point" },
      { name: "Gene", mile: 2, kind: "pump", liftFt: 303, toElevFt: 1037, note: "Pumps from Gene Wash Reservoir" },
      { name: "Iron Mountain", mile: 72, kind: "pump", liftFt: 144, toElevFt: 1181, note: "Lift derived from MWD's published 1,614 ft total (joint with Eagle Mountain: 579 ft)", schematic: true },
      { name: "Eagle Mountain", mile: 110, kind: "pump", liftFt: 435, toElevFt: 1616, note: "Lift derived from MWD's published 1,614 ft total (joint with Iron Mountain: 579 ft)", schematic: true },
      { name: "Julian Hinds", mile: 126, kind: "pump", liftFt: 441, toElevFt: 1807, note: "The highest lift on the aqueduct — 441 ft to 1,807 ft" },
      { name: "Lake Mathews (terminus)", mile: 242, kind: "terminus", note: "From Hinds, the water runs by gravity — through 16 hydroelectric recovery plants across the distribution system" },
    ],
    narrative:
      "Five pumping plants lift Colorado River water 1,614 vertical feet across the Mojave — then it falls the rest of the way to coastal Southern California, giving some of the energy back through recovery turbines.",
    powerNote: "MWD maintains 16 hydroelectric power recovery plants in the distribution system.",
    source: "Metropolitan Water District, pumping-plants facility pages (per-plant lifts and elevations as published; Iron/Eagle split derived from MWD's 1,614 ft total)",
  },
  {
    id: "cap",
    name: "Central Arizona Project",
    operator: "Central Arizona Water Conservation District",
    miles: 336,
    totalLiftFt: 3000,
    totalLiftApprox: true,
    profileKind: "cumulative-schematic",
    points: [
      { name: "Mark Wilmer (Lake Havasu intake)", mile: 0, kind: "intake", note: "Where the river enters the canal" },
      { name: "Bouse Hills", mile: 24, kind: "pump", schematic: true },
      { name: "Little Harquahala", mile: 58, kind: "pump", schematic: true },
      { name: "Hassayampa", mile: 100, kind: "pump", schematic: true },
      { name: "Waddell", mile: 150, kind: "pump", schematic: true, note: "Pairs with New Waddell Dam — CAP's own storage on Lake Pleasant" },
      { name: "Salt Gila", mile: 190, kind: "pump", schematic: true },
      { name: "Brady", mile: 220, kind: "pump", schematic: true },
      { name: "Picacho", mile: 245, kind: "pump", schematic: true },
      { name: "Red Rock", mile: 265, kind: "pump", schematic: true },
      { name: "Twin Peaks", mile: 285, kind: "pump", schematic: true },
      { name: "Sandario", mile: 300, kind: "pump", schematic: true },
      { name: "Brawley", mile: 312, kind: "pump", schematic: true },
      { name: "San Xavier", mile: 326, kind: "pump", schematic: true },
      { name: "Snyder Hill (terminus reach)", mile: 336, kind: "terminus", note: "South of Tucson" },
    ],
    narrative:
      "Fourteen pumping plants stage Colorado River water roughly 3,000 vertical feet over 336 miles from Lake Havasu to south of Tucson. Mileposts here are schematic — CAP publishes the plant sequence, not per-plant lifts — but the total climb and the order of the machines are the operator's own.",
    powerNote: "CAP is the largest single power user in Arizona (CAP, system pages).",
    source: "Central Arizona Project system map (plant roster, in order) and CAP system pages (336 miles; ~3,000 ft total lift; largest single power user in Arizona)",
  },
];

/** One-line infrastructure notes for systems without a v1 elevation profile. */
export const SYSTEM_NOTES: Record<string, string> = {
  aac: "Gravity system: Imperial Dam raises the river ~23 ft; the canal falls to the Imperial Valley (below sea level), shedding energy through drop structures.",
  coachella: "Gravity branch of the All-American system along the Salton Sea trough.",
  snwa: "Intakes tunneled beneath Lake Mead — the deepest was bored under the lakebed so Las Vegas keeps drawing as the reservoir drops; a dedicated low-lake pumping station backs it.",
  transbasin: "Tunnels driven through the Continental Divide — including the 13-mile Adams Tunnel — deliver West Slope water to the Front Range by gravity.",
  mexico: "Morelos Dam, on the border reach, is the last diversion structure on the river.",
};
