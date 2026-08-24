"use client";

/**
 * Per-reservoir elevation over the trailing 13 months, with the operating
 * thresholds that sit near the data drawn as labeled reference lines. Far
 * thresholds (e.g. dead pool ~150 ft down) stay in the list below the
 * chart — drawing them would flatten the line into noise.
 */

import { useRef, useState } from "react";

export interface ElevPoint {
  readonly date: string;
  readonly value: number | null;
}
export interface ElevRef {
  readonly elevation: number;
  readonly short: string;
  readonly kind: string;
}

const W = 460;
const H = 200;
const M = { t: 16, r: 122, b: 22, l: 40 };
/** A threshold merits a drawn line when within this many feet of the data. */
const NEAR_FT = 40;

export function ElevationSeries({
  name,
  points,
  thresholds,
}: {
  name: string;
  points: readonly ElevPoint[];
  thresholds: readonly ElevRef[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const vals = points.map((p) => p.value).filter((v): v is number => v !== null);
  if (vals.length < 2) return null;

  const dataLo = Math.min(...vals);
  const dataHi = Math.max(...vals);
  const near = thresholds.filter(
    (t) => t.elevation > dataLo - NEAR_FT && t.elevation < dataHi + NEAR_FT,
  );
  const lo = Math.min(dataLo, ...near.map((t) => t.elevation)) - 6;
  const hi = Math.max(dataHi, ...near.map((t) => t.elevation)) + 6;

  const n = points.length;
  const x = (i: number) => M.l + (i / (n - 1)) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b);

  let d = "";
  let pen = false;
  points.forEach((p, i) => {
    if (p.value === null) { pen = false; return; }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)} `;
    pen = true;
  });

  const lastI = points.length - 1 - [...points].reverse().findIndex((p) => p.value !== null);
  const last = points[lastI]!;

  const monthTicks = points
    .map((p, i) => ({ p, i }))
    .filter(({ p }, idx, arr) => {
      const m = p.date.slice(0, 7);
      const prev = idx > 0 ? arr[idx - 1]!.p.date.slice(0, 7) : "";
      return m !== prev && Number(p.date.slice(5, 7)) % 3 === 1;
    });

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };

  const fmtDate = (s: string) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
    });

  return (
    <div className="elevseries">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`${name} elevation, past 13 months, with nearby operating thresholds`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {near.map((t) => (
          <g key={t.elevation}>
            <line x1={M.l} x2={W - M.r} y1={y(t.elevation)} y2={y(t.elevation)}
              className={`es-ref ${t.kind}`} />
            <text x={W - M.r + 4} y={y(t.elevation) + 3} className={`es-reflabel ${t.kind}`}>
              {t.elevation.toLocaleString()} ·{" "}
              {t.short
                .replace(/^[\d,]+\s*—\s*/, "")
                .replace("minimum power pool", "min power pool")}
            </text>
          </g>
        ))}

        <text x={M.l - 4} y={M.t - 4} className="cc-tick unit" style={{ textAnchor: "start" }}>
          feet · y-axis spans the recent record, not the full pool
        </text>
        {monthTicks.map(({ p, i }) => (
          <text key={p.date} x={x(i)} y={H - 6} className="cc-tick x">
            {new Date(`${p.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
          </text>
        ))}
        <text x={M.l - 6} y={y(dataHi) + 3} className="cc-tick">{Math.round(dataHi).toLocaleString()}</text>
        <text x={M.l - 6} y={y(dataLo) + 3} className="cc-tick">{Math.round(dataLo).toLocaleString()}</text>

        <path d={d} className="tl-line" />
        <circle cx={x(lastI)} cy={y(last.value!)} r={3} className="tl-now" />

        {hover !== null && points[hover]!.value !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="cc-cross" />
            <circle cx={x(hover)} cy={y(points[hover]!.value!)} r={3} className="tl-now" />
          </g>
        )}
      </svg>
      <div className="cc-readout" aria-live="polite">
        {hover !== null && points[hover]!.value !== null
          ? `${fmtDate(points[hover]!.date)} — ${points[hover]!.value!.toLocaleString(undefined, { maximumFractionDigits: 2 })} ft`
          : `elevation, past 13 months — hover for any day`}
      </div>
    </div>
  );
}
