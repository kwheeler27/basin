"use client";

/**
 * What the biggest irrigation counties actually grow — one 100%-stacked
 * composition bar per county from the Cropland Data Layer, category colors
 * fixed across counties (never re-assigned by rank). Hover any segment for
 * the class detail behind it; the full numbers live in the table below.
 */

import { useRef, useState } from "react";
import { CROP_CATEGORIES, countyMixes, categorize, type CategoryKey } from "@/lib/agriculture";

const ac = (n: number) => `${Math.round(n).toLocaleString()} ac`;

export function CropMix() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; title: string; lines: string[] } | null>(null);
  const mixes = countyMixes();

  const showTip = (e: React.MouseEvent, title: string, lines: string[]) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, title, lines });
  };

  return (
    <div className="cropmix" ref={wrapRef}>
      <div className="ag-legend" role="list" aria-label="Crop categories">
        {CROP_CATEGORIES.map((c) => (
          <span key={c.key} role="listitem" className="ag-legend-item">
            <i style={{ background: c.color }} /> {c.label}
          </span>
        ))}
      </div>

      {mixes.map(({ county, byCategory, feedSharePct }) => (
        <div className="ag-row" key={county.fips}>
          <div className="ag-rowhead">
            <strong>{county.county}, {county.st}</strong>
            <span>
              {ac(county.croplandAcres)} mapped cropland · <b>{feedSharePct.toFixed(0)}%</b>{" "}alfalfa &amp; hay
            </span>
          </div>
          <div className="ag-bar" role="img"
            aria-label={`${county.county}, ${county.st}: ${feedSharePct.toFixed(0)} percent of mapped cropland in alfalfa and hay`}>
            {CROP_CATEGORIES.map((cat) => {
              const acres = byCategory[cat.key as CategoryKey];
              if (acres <= 0) return null;
              const pct = (100 * acres) / county.croplandAcres;
              const classes = county.crops
                .filter((cr) => categorize(cr.name) === cat.key)
                .map((cr) => `${cr.name}: ${ac(cr.acres)}`);
              return (
                <div key={cat.key} className="ag-seg" style={{ width: `${pct}%`, background: cat.color }}
                  onMouseMove={(e) => showTip(e, `${county.county} — ${cat.label}`, [
                    `${ac(acres)} · ${pct.toFixed(1)}% of mapped cropland`,
                    ...(classes.length ? classes : cat.key === "other" ? ["Classes outside this county's top 8"] : []),
                  ])}
                  onMouseLeave={() => setTip(null)}
                />
              );
            })}
          </div>
        </div>
      ))}

      {tip && (
        <div className="story-tip" style={{ left: Math.min(tip.x + 14, 560), top: tip.y + 16 }}>
          <strong>{tip.title}</strong>
          {tip.lines.map((l) => <div key={l}>{l}</div>)}
        </div>
      )}

      <details className="ag-table">
        <summary>All the numbers (table view)</summary>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>County</th>
                <th>Mapped cropland</th>
                <th>Alfalfa &amp; hay</th>
                {CROP_CATEGORIES.map((c) => <th key={c.key}>{c.label}</th>)}
                <th>Irrigation withdrawals*</th>
              </tr>
            </thead>
            <tbody>
              {mixes.map(({ county, byCategory, feedSharePct }) => (
                <tr key={county.fips}>
                  <td><strong>{county.county}, {county.st}</strong></td>
                  <td>{ac(county.croplandAcres)}</td>
                  <td>{feedSharePct.toFixed(0)}%</td>
                  {CROP_CATEGORIES.map((c) => (
                    <td key={c.key}>{byCategory[c.key as CategoryKey] > 0 ? ac(byCategory[c.key as CategoryKey]) : "—"}</td>
                  ))}
                  <td>{county.irrigationMgd.toLocaleString()} Mgal/d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="chain-caveat" style={{ marginTop: 6 }}>
          *Irrigation withdrawals are USGS county water-use accounting — a
          separate measurement from CDL acreage; the two are shown side by
          side, not combined.
        </div>
      </details>
    </div>
  );
}
