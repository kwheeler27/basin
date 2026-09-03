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
import { DetailSheet, type SheetAnchor, type SheetData } from "./DetailSheet";

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
  // The bars sit in normal page flow (no position:relative ancestor), so the
  // sheet must anchor to the tapped row or it lands at the document corner.
  const [anchor, setAnchor] = useState<SheetAnchor | null>(null);

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
    <div className="rankedbars">
      {sorted.map((it) => {
        const row = (
          <>
            <div className="rb-label" title={it.name}>
              <span className="rb-name">{it.short}</span>
              {it.flag && (
                <span className="badge badge-med rb-flag" title={it.name}>
                  {it.flag}
                </span>
              )}
            </div>
            <div className="rb-trackarea">
              <div
                className="db-track rb-track"
                style={{ width: `${(it.af / max) * 100}%` }}
              >
                <div className="db-fill" style={{ width: "100%" }} />
              </div>
            </div>
            <span className="rb-num">
              {acreFeet(it.af)} <span className="rb-pct">{Math.round((it.af / total) * 100)}%</span>
            </span>
          </>
        );
        return it.sheet ? (
          <button
            key={it.short}
            type="button"
            className="rb-row db-tappable"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setAnchor({ top: r.top, bottom: r.bottom, left: r.left });
              setSheet(it.sheet!);
            }}
            aria-label={`${it.name} — details and source`}
          >
            {row}
          </button>
        ) : (
          <div key={it.short} className="rb-row">
            {row}
          </div>
        );
      })}
      {interactive && (
        <div className="cc-readout" style={{ marginTop: 6 }}>
          Tap a bar for the plain-English story, comparisons, and source.
        </div>
      )}
      <DetailSheet data={sheet} anchor={anchor} onClose={() => setSheet(null)} />
    </div>
  );
}
