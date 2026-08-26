"use client";

/**
 * Water-year cumulative unregulated inflow above Lake Powell — the leading
 * indicator the storage numbers lag. Daily RISE values (which can be
 * negative: the series is a computed residual) accumulate from October 1;
 * the dashed reference is the recent-era FULL-YEAR mean, labeled as such —
 * a yardstick, not a pace line.
 */

import { useRef, useState } from "react";

export interface InflowPoint {
  readonly date: string; // YYYY-MM-DD
  readonly value: number; // daily acre-feet (can be negative)
}

const W = 920;
const H = 240;
const M = { t: 20, r: 116, b: 26, l: 44 };
const MAF = 1_000_000;

export function InflowTopline({
  points,
  fullYearMeanAf,
  meanLabel,
}: {
  points: readonly InflowPoint[];
  fullYearMeanAf: number;
  meanLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  if (points.length < 14) {
    return (
      <p className="err">
        Live inflow series unavailable. Showing no chart rather than a stale
        one.
      </p>
    );
  }

  // Cumulative from the first point (the water-year start).
  let run = 0;
  const cum = points.map((p) => {
    run += p.value;
    return { date: p.date, value: run };
  });
  const last = cum[cum.length - 1]!;

  const hi = Math.max(last.value, fullYearMeanAf) * 1.06;
  const n = cum.length;
  const x = (i: number) => M.l + (i / (n - 1)) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - (v / hi) * (H - M.t - M.b);

  let d = "";
  cum.forEach((p, i) => {
    d += `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)} `;
  });

  const monthTicks = cum
    .map((p, i) => ({ p, i }))
    .filter(({ p }, idx, arr) => {
      const m = p.date.slice(0, 7);
      const prev = idx > 0 ? arr[idx - 1]!.p.date.slice(0, 7) : "";
      return m !== prev && Number(p.date.slice(5, 7)) % 2 === 0;
    });

  const ticks: number[] = [];
  for (let v = 2 * MAF; v < hi; v += 2 * MAF) ticks.push(v);

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
    <div className="topline">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Cumulative water-year unregulated inflow to Lake Powell"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="cc-grid" />
            <text x={M.l - 6} y={y(v) + 3.5} className="cc-tick">
              {(v / MAF).toFixed(0)}M
            </text>
          </g>
        ))}
        <text x={M.l - 4} y={M.t - 8} className="cc-tick unit" style={{ textAnchor: "start" }}>
          acre-feet, cumulative since October 1
        </text>
        {monthTicks.map(({ p, i }) => (
          <text key={p.date} x={x(i)} y={H - 8} className="cc-tick x">
            {new Date(`${p.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
          </text>
        ))}

        <line x1={M.l} x2={W - M.r} y1={y(fullYearMeanAf)} y2={y(fullYearMeanAf)}
          className="es-ref" />
        <text x={W - M.r + 4} y={y(fullYearMeanAf) + 3} className="es-reflabel">
          {meanLabel}
        </text>

        <path d={d} className="tl-line" />
        <circle cx={x(n - 1)} cy={y(last.value)} r={3.5} className="tl-now" />
        <text x={x(n - 1) + 8} y={y(last.value) + 4} className="tl-endlabel">
          {(last.value / MAF).toFixed(2)} MAF
        </text>

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="cc-cross" />
            <circle cx={x(hover)} cy={y(cum[hover]!.value)} r={3.4} className="tl-now" />
          </g>
        )}
      </svg>
      <div className="cc-readout" aria-live="polite">
        {hover !== null
          ? `${fmtDate(cum[hover]!.date)} — ${(cum[hover]!.value / MAF).toFixed(2)} MAF since October 1`
          : "Hover for any day this water year"}
      </div>
    </div>
  );
}
