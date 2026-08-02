/**
 * TypeScript rulebook evaluator.
 *
 * The rulebook DATA is generated from the Python model (rulebook.gen.ts);
 * this file only evaluates it. Band-containment is deliberately trivial, and
 * `verify-rules.ts` replays every Python-computed vector through it, so the
 * two implementations cannot drift silently.
 */

import { RULEBOOK_DATA } from "./rulebook.gen";

export type Party = "arizona" | "nevada" | "california" | "mexico";
export type ReductionKind =
  | "ig_shortage"
  | "dcp_contribution"
  | "treaty_reduction"
  | "treaty_savings";

export interface BandData {
  readonly upper: number | null;
  readonly lower: number | null;
  readonly upperInclusive: boolean;
  readonly lowerInclusive: boolean;
  readonly wording: string;
}

export const RULEBOOK = RULEBOOK_DATA.rulebook;
export const RULE_VECTORS = RULEBOOK_DATA.vectors;

export function bandContains(band: BandData, elevation: number): boolean {
  if (band.upper !== null) {
    if (elevation > band.upper) return false;
    if (elevation === band.upper && !band.upperInclusive) return false;
  }
  if (band.lower !== null) {
    if (elevation < band.lower) return false;
    if (elevation === band.lower && !band.lowerInclusive) return false;
  }
  return true;
}

export interface MeadDetermination {
  readonly elevation: number;
  readonly tierLabel: string;
  readonly arizona: number;
  readonly nevada: number;
  readonly california: number;
  /** Minute 323 §III.A — unrecoverable. */
  readonly mexicoReduction: number;
  /** Minute 323 §IV — recoverable when Mead is projected ≥ 1,110 ft. */
  readonly mexicoSavings: number;
  readonly usLowerBasin: number;
  readonly totalIncludingSavings: number;
  readonly applicableBands: readonly string[];
}

export function meadTierLabel(elevation: number): string {
  if (elevation > 1090) return "Normal / surplus condition";
  if (elevation > 1075) return "Tier 0 (DCP contributions)";
  if (elevation >= 1050) return "Tier 1 shortage";
  if (elevation >= 1025) return "Tier 2 shortage";
  return "Tier 3 shortage";
}

export function determineMead(elevation: number): MeadDetermination {
  let arizona = 0;
  let nevada = 0;
  let california = 0;
  let mexicoReduction = 0;
  let mexicoSavings = 0;
  const applicableBands: string[] = [];

  for (const r of RULEBOOK.meadReductions) {
    if (!bandContains(r.band, elevation)) continue;
    applicableBands.push(`${r.party}/${r.kind}: ${r.band.wording}`);
    switch (r.party as Party) {
      case "arizona":
        arizona += r.acreFeet;
        break;
      case "nevada":
        nevada += r.acreFeet;
        break;
      case "california":
        california += r.acreFeet;
        break;
      case "mexico":
        if (r.kind === "treaty_savings") mexicoSavings += r.acreFeet;
        else mexicoReduction += r.acreFeet;
        break;
    }
  }

  const usLowerBasin = arizona + nevada + california;
  return {
    elevation,
    tierLabel: meadTierLabel(elevation),
    arizona,
    nevada,
    california,
    mexicoReduction,
    mexicoSavings,
    usLowerBasin,
    totalIncludingSavings: usLowerBasin + mexicoReduction + mexicoSavings,
    applicableBands,
  };
}

export interface PowellDetermination {
  readonly tier: string;
  readonly releaseAf: number | null;
  readonly balancingRange: readonly [number, number] | null;
  readonly meadOverrideApplied: boolean;
  readonly releaseOrMidpoint: number;
  readonly note: string;
}

export function determinePowell(
  powellElevation: number,
  meadElevation: number,
): PowellDetermination {
  const tier = RULEBOOK.powellTiers.find((t) =>
    bandContains(t.band, powellElevation),
  );
  if (!tier) {
    throw new Error(
      `no Powell tier matches elevation ${powellElevation} in ${RULEBOOK.version}`,
    );
  }

  let releaseAf: number | null = tier.releaseAf;
  let balancingRange = tier.balancingRange as readonly number[] | null;
  let meadOverrideApplied = false;

  if (tier.meadBelow !== null && meadElevation < tier.meadBelow) {
    meadOverrideApplied = true;
    if (tier.meadBelowReleaseAf !== null) {
      releaseAf = tier.meadBelowReleaseAf;
      balancingRange = null;
    } else if (tier.meadBelowBalancingRange !== null) {
      releaseAf = null;
      balancingRange = tier.meadBelowBalancingRange as readonly number[];
    }
  }

  const range = balancingRange
    ? ([balancingRange[0]!, balancingRange[1]!] as const)
    : null;

  return {
    tier: tier.name,
    releaseAf,
    balancingRange: range,
    meadOverrideApplied,
    // Balancing tiers have no single legal number; the midpoint is our
    // explicit modeling assumption, matching the Python engine.
    releaseOrMidpoint: releaseAf ?? (range![0] + range![1]) / 2,
    note: tier.note,
  };
}
