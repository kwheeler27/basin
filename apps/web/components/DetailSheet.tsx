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

export type DataClock = "live" | "annual" | "census";

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
}

const CLOCK_STYLE: Record<DataClock, string> = {
  live: "clock-live",
  annual: "clock-annual",
  census: "clock-census",
};

export function DetailSheet({
  data,
  onClose,
}: {
  data: SheetData | null;
  onClose: () => void;
}) {
  const [openTerm, setOpenTerm] = useState<string | null>(null);
  if (!data) return null;

  return (
    <div className="sheet" role="dialog" aria-label={data.title}>
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
