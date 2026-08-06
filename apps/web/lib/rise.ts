/**
 * Server-side RISE client.
 *
 * Phase 1 reads live from RISE rather than from Postgres so the site can ship
 * before the ingestion pipeline is wired to Neon. The measure registry still
 * governs every label, unit, and citation — this is a different transport,
 * not a different source of truth.
 *
 * Verified behavior (STEP-0 gate G3, 2026-08-01):
 *   - `Accept: application/vnd.api+json` is REQUIRED; application/json → 406
 *   - all values provisional; `updateDate` marks revisions
 *   - 250 items/page maximum
 */

import "server-only";

const RISE_BASE = "https://data.usbr.gov/rise/api";
const ACCEPT = "application/vnd.api+json";
const PAGE_SIZE = 250;

/** RISE updates daily; hourly revalidation is comfortably fresh. */
export const REVALIDATE_SECONDS = 3600;

export interface Point {
  readonly date: string; // YYYY-MM-DD
  readonly value: number;
}

export interface Series {
  readonly itemId: number;
  readonly points: readonly Point[];
  /** Most recent non-null point. */
  readonly latest: Point | null;
  /** Closest point to 365 days before `latest`, for year-over-year change. */
  readonly yearAgo: Point | null;
  readonly min: number | null;
  readonly max: number | null;
  /** True when any row in the window carried an upstream revision stamp. */
  readonly hasRevisions: boolean;
  readonly fetchedAt: string;
  readonly error?: string;
}

interface RiseRow {
  attributes?: {
    dateTime?: string;
    result?: number | null;
    updateDate?: string | null;
    createDate?: string | null;
  };
}

export async function fetchSeries(itemId: number, days = 400): Promise<Series> {
  const after = new Date(Date.now() - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const fetchedAt = new Date().toISOString();

  try {
    const rows: RiseRow[] = [];
    for (let page = 1; page <= 4; page++) {
      const url =
        `${RISE_BASE}/result?itemId=${itemId}&itemsPerPage=${PAGE_SIZE}` +
        `&dateTime%5Bafter%5D=${after}&page=${page}`;
      // RISE outages must degrade to the pages' honest "unavailable"
      // states, never hang a build or a request (static-first doctrine).
      // Freshness comes from PAGE-level ISR (export const revalidate), not
      // the fetch cache: with next.revalidate, Next both ignores the abort
      // signal and keeps the export waiting on the hung request. no-store
      // restores real timeouts; the page still revalidates hourly.
      const res = await fetch(url, {
        headers: { Accept: ACCEPT, "User-Agent": "basin/0.1" },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) throw new Error(`RISE ${res.status} for item ${itemId}`);
      const body = (await res.json()) as { data?: RiseRow[] };
      const batch = body.data ?? [];
      rows.push(...batch);
      if (batch.length < PAGE_SIZE) break;
    }
    return toSeries(itemId, rows, fetchedAt);
  } catch (err) {
    // A source outage must surface as a visible gap, never as a plausible zero.
    return {
      itemId,
      points: [],
      latest: null,
      yearAgo: null,
      min: null,
      max: null,
      hasRevisions: false,
      fetchedAt,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

function toSeries(itemId: number, rows: RiseRow[], fetchedAt: string): Series {
  const points: Point[] = [];
  let hasRevisions = false;

  for (const row of rows) {
    const a = row.attributes;
    if (!a?.dateTime) continue;
    if (a.updateDate) hasRevisions = true;
    // null result means genuinely missing — omitted from the series so it
    // renders as a gap rather than being interpolated or zeroed.
    if (a.result === null || a.result === undefined) continue;
    points.push({ date: a.dateTime.slice(0, 10), value: Number(a.result) });
  }

  points.sort((x, y) => x.date.localeCompare(y.date));

  const latest = points.length ? points[points.length - 1]! : null;
  let yearAgo: Point | null = null;
  if (latest) {
    const target = new Date(`${latest.date}T00:00:00Z`);
    target.setUTCFullYear(target.getUTCFullYear() - 1);
    const targetStr = target.toISOString().slice(0, 10);
    // Nearest available point to one year back; the series can have gaps.
    let best: Point | null = null;
    let bestDelta = Infinity;
    for (const p of points) {
      const delta = Math.abs(
        (Date.parse(p.date) - Date.parse(targetStr)) / 86_400_000,
      );
      if (delta < bestDelta) {
        bestDelta = delta;
        best = p;
      }
    }
    // Only claim a year-over-year comparison if we're within two weeks of it.
    yearAgo = bestDelta <= 14 ? best : null;
  }

  const values = points.map((p) => p.value);
  return {
    itemId,
    points,
    latest,
    yearAgo,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    hasRevisions,
    fetchedAt,
  };
}
