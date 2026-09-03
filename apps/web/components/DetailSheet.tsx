"use client";

/**
 * Teach-on-tap: tapping any mark opens this sheet (bottom sheet on phones,
 * floating card on desktop). Three zones per docs/MAP_DESIGN.md #3/#18 —
 * essentials must never live only in hover UI:
 *
 *   1. the number in plain English (with a household anchor where honest)
 *   2. tappable term chips → plain-language definitions (lib/glossary.ts)
 *   3. how it compares (rank / share), then source + data-clock badge
 */

import { useState } from "react";
import { GLOSSARY } from "@/lib/glossary";
import { MiniSeries, type MiniSeriesData } from "./MiniSeries";

export type DataClock = "live" | "annual" | "census" | "model";

/**
 * Viewport rect of the tapped element (from getBoundingClientRect at click
 * time). When given, the sheet renders fixed next to that element instead of
 * the default corner-of-container placement — callers whose container isn't
 * position:relative (e.g. ranked bars in page flow) must pass it, or the
 * sheet resolves against the initial containing block and lands at the
 * top-right of the document.
 */
export interface SheetAnchor {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
}

function anchoredStyle(anchor: SheetAnchor): React.CSSProperties | undefined {
  if (typeof window === "undefined" || window.innerWidth <= 720) {
    return undefined; // phones keep the bottom-sheet CSS
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(400, vw - 24);
  const left = Math.min(Math.max(anchor.left, 12), vw - width - 12);
  const below = vh - anchor.bottom;
  return below >= 300 || below >= anchor.top
    ? {
        position: "fixed",
        top: anchor.bottom + 8,
        bottom: "auto",
        left,
        right: "auto",
        width,
        maxHeight: Math.max(below - 20, 180),
      }
    : {
        position: "fixed",
        top: "auto",
        bottom: vh - anchor.top + 8,
        left,
        right: "auto",
        width,
        maxHeight: Math.max(anchor.top - 20, 180),
      };
}

export interface SheetData {
  readonly kicker: string;
  readonly title: string;
  /** The headline fact, written for a reader — not a unit dump. */
  readonly fact: string;
  readonly detail?: string;
  readonly chips: readonly string[];
  readonly compare?: readonly string[];
  readonly source: string;
  readonly clock: DataClock;
  readonly clockLabel: string;
  readonly series?: MiniSeriesData;
}

const CLOCK_STYLE: Record<DataClock, string> = {
  live: "clock-live",
  annual: "clock-annual",
  census: "clock-census",
  model: "clock-model",
};

export function DetailSheet({
  data,
  onClose,
  anchor,
  onPointerEnter,
  onPointerLeave,
}: {
  data: SheetData | null;
  onClose: () => void;
  anchor?: SheetAnchor | null;
  /** Hover-opened callers keep the sheet alive while the pointer is on it. */
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  const [openTerm, setOpenTerm] = useState<string | null>(null);
  if (!data) return null;

  return (
    <div
      className="sheet"
      style={anchor ? anchoredStyle(anchor) : undefined}
      role="dialog"
      aria-label={data.title}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="sheet-head">
        <div>
          <div className="sheet-kicker">{data.kicker}</div>
          <h4 className="sheet-title">{data.title}</h4>
        </div>
        <button className="sheet-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <p className="sheet-fact">{data.fact}</p>
      {data.series && <MiniSeries data={data.series} />}
      {data.detail && <p className="sheet-detail">{data.detail}</p>}

      {data.chips.length > 0 && (
        <div className="sheet-chips">
          {data.chips.map((id) => {
            const term = GLOSSARY[id];
            if (!term) return null;
            const open = openTerm === id;
            return (
              <button
                key={id}
                className={`term-chip${open ? " open" : ""}`}
                aria-expanded={open}
                onClick={() => setOpenTerm(open ? null : id)}
              >
                {term.label}
              </button>
            );
          })}
        </div>
      )}
      {openTerm && GLOSSARY[openTerm] && (
        <p className="sheet-term-def">{GLOSSARY[openTerm]!.short}</p>
      )}

      {data.compare && data.compare.length > 0 && (
        <ul className="sheet-compare">
          {data.compare.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}

      <div className="sheet-source">
        <span className={`clock-badge ${CLOCK_STYLE[data.clock]}`}>
          {data.clockLabel}
        </span>
        <span>{data.source}</span>
      </div>
    </div>
  );
}
