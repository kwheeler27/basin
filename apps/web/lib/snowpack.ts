/**
 * Upper Colorado basin snowpack — % of median snow-water equivalent from
 * NRCS SNOTEL stations (registry: colorado.snow.upper_basin.swe_pct_median).
 *
 * Basin index per NRCS convention: sum of station SWE over sum of station
 * medians for the date — never an average of station percentages. Off
 * season the medians are zero or absent, so the index is undefined; that
 * is a fact the tile states, never a number it invents.
 *
 * Transport doctrine as lib/rise.ts: no-store + timeout; outages degrade
 * to the honest unavailable state.
 */

import "server-only";

import roster from "@/public/geo/snotel_huc14.json";

const BASE = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1/data";

/** The index is shown only when enough of the median base exists. */
const MIN_STATIONS = 60;
const MIN_TOTAL_MEDIAN_IN = 200;

export interface SnowpackReading {
  readonly date: string;
  readonly pctOfMedian: number | null;
  readonly stationsUsed: number;
  readonly stationsTotal: number;
  /** False when medians are too thin to divide by (off season). */
  readonly inSeason: boolean;
  readonly error?: string;
}

interface AwdbValue {
  date?: string;
  value?: number | null;
  median?: number | null;
}
interface AwdbStation {
  data?: { values?: AwdbValue[] }[];
}

async function fetchIndex(date: string): Promise<SnowpackReading> {
  const triplets = (roster as { triplets: string[] }).triplets;
  const url =
    `${BASE}?stationTriplets=${triplets.join(",")}` +
    `&elements=WTEQ&duration=DAILY&beginDate=${date}&endDate=${date}` +
    `&centralTendencyType=MEDIAN`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "basin/0.1" },
      cache: "no-store",
      // 137-station queries take AWDB 15-20s; regeneration is background
      // (force-static + ISR), so a generous timeout costs users nothing.
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) throw new Error(`AWDB ${res.status}`);
    const stations = (await res.json()) as AwdbStation[];
    let swe = 0;
    let med = 0;
    let used = 0;
    for (const s of stations) {
      for (const el of s.data ?? []) {
        for (const v of el.values ?? []) {
          if (v.value != null && v.median != null && v.median > 0) {
            swe += v.value;
            med += v.median;
            used += 1;
          }
        }
      }
    }
    const inSeason = used >= MIN_STATIONS && med >= MIN_TOTAL_MEDIAN_IN;
    return {
      date,
      pctOfMedian: inSeason ? (100 * swe) / med : null,
      stationsUsed: used,
      stationsTotal: triplets.length,
      inSeason,
    };
  } catch (err) {
    return {
      date,
      pctOfMedian: null,
      stationsUsed: 0,
      stationsTotal: triplets.length,
      inSeason: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

export interface SnowpackTileData {
  readonly today: SnowpackReading;
  /** April 1 of the last completed snow season, for off-season context. */
  readonly lastApril: SnowpackReading;
}

export async function fetchSnowpack(): Promise<SnowpackTileData> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  // Yesterday is safer than today: stations report on a lag.
  const asOf = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  const aprilYear =
    Number(today.slice(5, 7)) >= 4
      ? Number(today.slice(0, 4))
      : Number(today.slice(0, 4)) - 1;
  const [t, a] = await Promise.all([
    fetchIndex(asOf),
    fetchIndex(`${aprilYear}-04-01`),
  ]);
  return { today: t, lastApril: a };
}
