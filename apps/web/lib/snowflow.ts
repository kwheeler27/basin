/**
 * The snow→flow pairing behind the runoff-efficiency instrument: each
 * water year's April-1 basin snowpack index (NRCS % of station median)
 * against the river that year actually produced (Reclamation naturalized
 * flow at Lees Ferry). One module computes the points, the per-era
 * straight-line fits, and the chapter's finding, so the heading can never
 * drift from the figure (DESIGN_PRINCIPLES §12).
 *
 * Two accountings meet here — an index (%) and a volume (acre-feet) —
 * and they are only ever PAIRED, never summed. Flow years past the final
 * record come from Reclamation's provisional workbook and stay flagged.
 */

import nf from "@/public/geo/natural_flow_wy.json";
import sp from "@/public/geo/snow_precip_history.json";

export interface SnowFlowPoint {
  wy: number;
  swePct: number;
  flowAf: number;
  provisional: boolean;
}

/** Straight-line least-squares fit — a reading aid, not a hydrology model. */
export interface EraFit {
  n: number;
  intercept: number;
  slope: number;
  minSwe: number;
  maxSwe: number;
  /** Fitted flow at a 100%-of-median snowpack, af. */
  atMedianAf: number;
}

export const ERA_SPLIT = 2000;

const FLOW_FINAL = (nf as { wy: Record<string, number> }).wy;
const FLOW_PROV = (nf as { provisionalWy?: Record<string, number> })
  .provisionalWy ?? {};
const SWE = (
  sp as { aprilSwePctMedian: Record<string, { pct: number | null }> }
).aprilSwePctMedian;

function pair(): SnowFlowPoint[] {
  const points: SnowFlowPoint[] = [];
  for (const [k, v] of Object.entries(SWE)) {
    const wy = Number(k);
    if (v.pct === null) continue;
    const final = FLOW_FINAL[k];
    const prov = FLOW_PROV[k];
    if (final !== undefined) {
      points.push({ wy, swePct: v.pct, flowAf: final, provisional: false });
    } else if (prov !== undefined) {
      points.push({ wy, swePct: v.pct, flowAf: prov, provisional: true });
    }
    // A year with snow but no published flow yet is simply absent — the
    // caption says so rather than the chart inventing a point.
  }
  return points.sort((a, b) => a.wy - b.wy);
}

export const SNOW_FLOW_POINTS: readonly SnowFlowPoint[] = pair();

function fit(points: SnowFlowPoint[]): EraFit | null {
  const n = points.length;
  if (n < 8) return null; // too few years for even a reading-aid line
  const mx = points.reduce((s, p) => s + p.swePct, 0) / n;
  const my = points.reduce((s, p) => s + p.flowAf, 0) / n;
  const sxx = points.reduce((s, p) => s + (p.swePct - mx) ** 2, 0);
  if (sxx === 0) return null;
  const slope =
    points.reduce((s, p) => s + (p.swePct - mx) * (p.flowAf - my), 0) / sxx;
  const intercept = my - slope * mx;
  return {
    n,
    intercept,
    slope,
    minSwe: Math.min(...points.map((p) => p.swePct)),
    maxSwe: Math.max(...points.map((p) => p.swePct)),
    atMedianAf: intercept + slope * 100,
  };
}

export const PRE_FIT: EraFit | null = fit(
  SNOW_FLOW_POINTS.filter((p) => p.wy < ERA_SPLIT),
);
export const POST_FIT: EraFit | null = fit(
  SNOW_FLOW_POINTS.filter((p) => p.wy >= ERA_SPLIT),
);

const post = SNOW_FLOW_POINTS.filter((p) => p.wy >= ERA_SPLIT);

/** How many since-2000 years fall below the pre-2000 snow→flow line. */
export const POST_BELOW_PRE = PRE_FIT
  ? {
      count: post.filter(
        (p) => p.flowAf < PRE_FIT.intercept + PRE_FIT.slope * p.swePct,
      ).length,
      total: post.length,
    }
  : null;

/** The fitted-flow gap at a median snowpack, af (positive = less river now). */
export const GAP_AT_MEDIAN_AF =
  PRE_FIT && POST_FIT ? PRE_FIT.atMedianAf - POST_FIT.atMedianAf : null;

/**
 * The §12 gate: the finding-heading renders only while the data supports
 * it — a clear majority of recent years under the old line AND a positive
 * gap at median snow. Otherwise the section falls back to a neutral head.
 */
export const SAME_SNOW_LESS_RIVER =
  GAP_AT_MEDIAN_AF !== null &&
  GAP_AT_MEDIAN_AF > 0 &&
  POST_BELOW_PRE !== null &&
  POST_BELOW_PRE.count * 2 > POST_BELOW_PRE.total;

export const FLOW_PROV_META = {
  url: (nf as { provisionalUrl?: string }).provisionalUrl ?? null,
  vintage: (nf as { provisionalVintage?: string }).provisionalVintage ?? null,
};

/** Snow-index years still waiting on a published flow value. */
export const AWAITING_FLOW: readonly number[] = Object.entries(SWE)
  .filter(
    ([k, v]) =>
      v.pct !== null &&
      FLOW_FINAL[k] === undefined &&
      FLOW_PROV[k] === undefined,
  )
  .map(([k]) => Number(k))
  .sort((a, b) => a - b);
