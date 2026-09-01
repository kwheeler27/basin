"use client";

/**
 * Ranked horizontal bars: largest first, each bar carrying its value and
 * percent share as one label at the bar's end. Tapping a bar opens the
 * house teach-on-tap sheet (DetailSheet) with the plain-English story,
 * comparisons, and source — same pattern as the maps. Where a real
 * time-series exists it rides along; where none exists the sheet says so
 * instead of inventing one.
 */

import { useEffect, useState } from "react";
import { acreFeet } from "@/lib/format";
import { DetailSheet, type SheetData } from "./DetailSheet";

export interface RankedBarItem {
  readonly short: string;
  readonly name: string;
  readonly af: number;
  readonly flag?: string;
  /** Teach-on-tap card; bars without one render non-interactive. */
  readonly sheet?: SheetData;
}

export function RankedBars({ items }: { items: readonly RankedBarItem[] }) {
  const [sheet, setSheet] = useState<SheetData | null>(null);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheet(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  const sorted = [...items].sort((a, b) => b.af - a.af);
  const total = sorted.reduce((s, it) => s + it.af, 0);
  const max = sorted[0]!.af;
  const interactive = sorted.some((it) => it.sheet);

  return (
    <div className="demand-breakdown">
      {sorted.map((it) => {
        const row = (
          <>
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
          </>
        );
        return it.sheet ? (
          <button
            key={it.short}
            type="button"
            className="db-row db-tappable"
            onClick={() => setSheet(it.sheet!)}
            aria-label={`${it.name} — details and source`}
          >
            {row}
          </button>
        ) : (
          <div key={it.short} className="db-row">
            {row}
          </div>
        );
      })}
      {interactive && (
        <div className="cc-readout" style={{ marginTop: 6 }}>
          Tap a bar for the plain-English story, comparisons, and source.
        </div>
      )}
      <DetailSheet data={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}
