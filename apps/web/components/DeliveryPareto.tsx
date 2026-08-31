"use client";

/**
 * Pareto of the CY2025 decree-accounted deliveries: bars are each system's
 * share of the accounted subtotal (largest first), the line is the running
 * cumulative share. ONE axis — both bars and line are percent of the same
 * subtotal; absolute volumes ride as direct labels, never a second scale.
 */

import { useState } from "react";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

export interface ParetoItem {
  readonly short: string;
  readonly name: string;
  readonly af: number;
  /** Optional caveat shown in the table (e.g. a disputed figure). */
  readonly flag?: string;
}

const fmtAf = (af: number) =>
  af >= 1_000_000
    ? `${(af / 1_000_000).toFixed(2)} MAF`
    : `${Math.round(af / 1000)} kAF`;

export function DeliveryPareto({
  items,
  axisContext = "share of the accounted subtotal",
  valueHeader = "CY2025 delivery",
}: {
  items: readonly ParetoItem[];
  /** Axis note prefix; the subtotal is appended. */
  axisContext?: string;
  valueHeader?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();

  if (width === 0) {
    return <div ref={ref} className="pareto" style={{ minHeight: 240 }} />;
  }

  const narrow = width < 600;
  const W = width;
  const H = narrow ? Math.round(W * 0.74) : Math.round(W * 0.33);
  const M = narrow
    ? { t: 26, r: 10, b: 54, l: 38 }
    : { t: 30, r: 16, b: 40, l: 44 };

  const sorted = [...items].sort((a, b) => b.af - a.af);
  const total = sorted.reduce((s, it) => s + it.af, 0);
  let running = 0;
  const rows = sorted.map((it) => {
    running += it.af;
    return { ...it, share: (it.af / total) * 100, cum: (running / total) * 100 };
  });

  const n = rows.length;
  const slot = (W - M.l - M.r) / n;
  const barW = Math.min(84, slot * 0.62);
  const cx = (i: number) => M.l + slot * i + slot / 2;
  const y = (pct: number) => H - M.b - (pct / 100) * (H - M.t - M.b);

  // Rounded top, square base — data-end treatment on the value end only.
  const bar = (i: number, pct: number) => {
    const xL = cx(i) - barW / 2;
    const top = y(pct);
    const base = y(0);
    const r = Math.min(4, (base - top) / 2);
    return `M${xL},${base} L${xL},${top + r} Q${xL},${top} ${xL + r},${top} L${xL + barW - r},${top} Q${xL + barW},${top} ${xL + barW},${top + r} L${xL + barW},${base} Z`;
  };

  const cumPath = rows
    .map((r, i) => `${i === 0 ? "M" : "L"}${cx(i).toFixed(1)},${y(r.cum).toFixed(1)}`)
    .join(" ");

  return (
    <div ref={ref} className="pareto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="CY2025 accounted deliveries by system, largest first, with cumulative share"
        onMouseLeave={() => setHover(null)}>
        {[25, 50, 75, 100].map((p) => (
          <g key={p}>
            <line x1={M.l} x2={W - M.r} y1={y(p)} y2={y(p)} className="cc-grid" />
            <text x={M.l - 6} y={y(p) + 3.5} className="cc-tick">{p}%</text>
          </g>
        ))}
        <text x={M.l - 4} y={M.t - 12} className="cc-tick unit" style={{ textAnchor: "start" }}>
          {axisContext} ({fmtAf(total)})
        </text>

        {rows.map((r, i) => (
          <g key={r.short}
            onMouseEnter={() => setHover(i)}
            onMouseMove={() => setHover(i)}>
            <rect x={cx(i) - slot / 2} y={M.t} width={slot} height={H - M.t - M.b}
              fill="transparent" />
            <path d={bar(i, r.share)} className={`pt-bar${hover === i ? " on" : ""}`} />
            <text x={cx(i)} y={y(r.share) - 6} className="pt-val"
              style={narrow ? { fontSize: 10 } : undefined}>
              {fmtAf(r.af)}
            </text>
            {narrow ? (
              <text x={cx(i)} y={H - M.b + 14} className="pt-name"
                style={{ fontSize: 10.5, textAnchor: "end" }}
                transform={`rotate(-32 ${cx(i)} ${H - M.b + 14})`}>
                {r.short}
              </text>
            ) : (
              <text x={cx(i)} y={H - M.b + 16} className="pt-name">
                {r.short}
              </text>
            )}
          </g>
        ))}

        <path d={cumPath} className="pt-cum" />
        {rows.map((r, i) => (
          <g key={`c-${r.short}`}>
            <circle cx={cx(i)} cy={y(r.cum)} r={3} className="pt-cumdot" />
            {i > 0 && (
              <text x={cx(i)} y={y(r.cum) - 8} className="pt-cumlabel">
                {Math.round(r.cum)}%
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="cc-readout" aria-live="polite">
        {hover !== null
          ? `${rows[hover]!.name} — ${fmtAf(rows[hover]!.af)} · ${rows[hover]!.share.toFixed(0)}% of the accounted subtotal · top ${hover + 1} cumulative ${rows[hover]!.cum.toFixed(0)}%`
          : "Hover a bar for the full name and volumes"}
      </div>
      <details className="ag-table">
        <summary>Table view</summary>
        <div className="table-scroll" style={{ marginTop: 8 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>System</th>
                <th>{valueHeader}</th>
                <th>Share</th>
                <th>Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.short}>
                  <td>
                    {r.name}
                    {r.flag && (
                      <span className="badge badge-med" style={{ marginLeft: 8 }}>
                        {r.flag}
                      </span>
                    )}
                  </td>
                  <td>{r.af.toLocaleString()} AF</td>
                  <td>{r.share.toFixed(1)}%</td>
                  <td>{r.cum.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
