/**
 * Ranked horizontal bars: largest first, each bar carrying its value and
 * percent share as one label at the bar's end. For small component
 * breakdowns where a cumulative line would be noise. Server-rendered;
 * every number is visible, so no hover layer or table fallback is needed.
 */

import { acreFeet } from "@/lib/format";

export interface RankedBarItem {
  readonly short: string;
  readonly name: string;
  readonly af: number;
  readonly flag?: string;
}

export function RankedBars({ items }: { items: readonly RankedBarItem[] }) {
  const sorted = [...items].sort((a, b) => b.af - a.af);
  const total = sorted.reduce((s, it) => s + it.af, 0);
  const max = sorted[0]!.af;

  return (
    <div className="demand-breakdown">
      {sorted.map((it) => (
        <div key={it.short} className="db-row">
          <div className="db-label" title={it.name}>
            {it.short}
            {it.flag && (
              <span className="badge badge-med" title={it.name}>
                {it.flag}
              </span>
            )}
          </div>
          <div className="uve-line">
            <div
              className="db-track"
              style={{ width: `${(it.af / max) * 70}%` }}
            >
              <div className="db-fill" style={{ width: "100%" }} />
            </div>
            <span className="uve-num">
              {acreFeet(it.af)} · {Math.round((it.af / total) * 100)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
