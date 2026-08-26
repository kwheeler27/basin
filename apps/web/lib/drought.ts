/**
 * U.S. Drought Monitor data service — basin drought coverage by HUC-2.
 *
 * The USDM is the drought product of record, produced jointly by NDMC
 * (UNL), USDA, and NOAA; federal drought programs key off its categories.
 * Weekly maps (Tuesday map date, published Thursdays). "Traditional"
 * statistics are CUMULATIVE: d0 = percent of area in D0 *or worse*, so
 * d0 ≥ d1 ≥ d2 ≥ d3 ≥ d4, and none + d0 = 100.
 *
 * Same transport doctrine as lib/rise.ts: no-store + AbortSignal timeout so
 * an outage degrades to the page's honest unavailable state; freshness via
 * page-level ISR.
 */

import "server-only";

const BASE = "https://usdmdataservices.unl.edu/api/HUCStatistics";

export interface DroughtWeek {
  /** Tuesday map date, YYYY-MM-DD. */
  readonly mapDate: string;
  readonly none: number;
  readonly d0: number;
  readonly d1: number;
  readonly d2: number;
  readonly d3: number;
  readonly d4: number;
}

export interface DroughtSeries {
  readonly huc: "14" | "15";
  readonly name: string;
  /** Chronological (oldest first). Empty on outage — render a gap. */
  readonly weeks: readonly DroughtWeek[];
  readonly error?: string;
}

interface UsdmRow {
  mapDate?: string;
  huc?: string;
  none?: number;
  d0?: number;
  d1?: number;
  d2?: number;
  d3?: number;
  d4?: number;
}

const fmt = (d: Date) =>
  `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;

export async function fetchDroughtSeries(
  huc: "14" | "15",
  years = 2,
): Promise<DroughtSeries> {
  const end = new Date();
  const start = new Date(end.getTime() - years * 365.25 * 86_400_000);
  const url =
    `${BASE}/GetDroughtSeverityStatisticsByAreaPercent?aoi=${huc}` +
    `&hucLevel=2&startdate=${fmt(start)}&enddate=${fmt(end)}&statisticsType=1`;
  const name = huc === "14" ? "Upper Colorado" : "Lower Colorado";
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "basin/0.1" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`USDM ${res.status} for HUC ${huc}`);
    const rows = (await res.json()) as UsdmRow[];
    const weeks: DroughtWeek[] = rows
      .filter((r) => r.mapDate)
      .map((r) => ({
        mapDate: r.mapDate!.slice(0, 10),
        none: r.none ?? 0,
        d0: r.d0 ?? 0,
        d1: r.d1 ?? 0,
        d2: r.d2 ?? 0,
        d3: r.d3 ?? 0,
        d4: r.d4 ?? 0,
      }))
      .sort((a, b) => a.mapDate.localeCompare(b.mapDate));
    return { huc, name, weeks };
  } catch (err) {
    // Outage renders as a visible gap, never a plausible zero.
    return {
      huc,
      name,
      weeks: [],
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}
