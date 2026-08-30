"use client";

/**
 * Topline time-series for the Current state page: combined Powell + Mead
 * storage over the trailing 13 months. One axis (MAF), crosshair hover,
 * direct end label, gaps where either reservoir's record is missing.
 */

import { useRef, useState } from "react";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

export interface ToplinePoint {
  readonly date: string; // YYYY-MM-DD
  readonly value: number | null; // acre-feet; null renders as a gap
}

const MAF = 1_000_000;

export function StorageTopline({ points }: { points: readonly ToplinePoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();

  const vals = points.map((p) => p.value).filter((v): v is number => v !== null);
  if (vals.length < 2) {
    return (
      <p className="err">
        Live storage series unavailable. Showing no chart rather than a stale
        one.
      </p>
    );
  }
  if (width === 0) {
    return <div ref={ref} className="topline" style={{ minHeight: 200 }} />;
  }

  const narrow = width < 600;
  const W = width;
  const H = narrow ? Math.round(W * 0.62) : Math.round(W * 0.26);
  const M = narrow
    ? { t: 20, r: 14, b: 26, l: 42 }
    : { t: 20, r: 110, b: 26, l: 44 };

  const lo = Math.min(...vals) * 0.985;
  const hi = Math.max(...vals) * 1.015;
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

  // Y ticks: whole/half MAF lines inside the domain.
  const step = hi - lo > 3 * MAF ? MAF : 0.5 * MAF;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);

  // X ticks: first of every other month (every third when narrow).
  const tickMod = narrow ? 3 : 2;
  const monthTicks = points
    .map((p, i) => ({ p, i }))
    .filter(({ p }, idx, arr) => {
      const m = p.date.slice(0, 7);
      const prev = idx > 0 ? arr[idx - 1]!.p.date.slice(0, 7) : "";
      return m !== prev && Number(p.date.slice(5, 7)) % tickMod === 1;
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
  const fmt = (v: number | null) =>
    v === null ? "—" : `${(v / MAF).toFixed(2)} MAF`;

  return (
    <div ref={ref} className="topline">
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Combined Powell and Mead storage, past 13 months"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="cc-grid" />
            <text x={M.l - 6} y={y(v) + 3.5} className="cc-tick">
              {(v / MAF).toFixed(v % MAF === 0 ? 0 : 1)}M
            </text>
          </g>
        ))}
        <text x={M.l - 4} y={M.t - 8} className="cc-tick unit" style={{ textAnchor: "start" }}>
          acre-feet · y-axis starts at {(lo / MAF).toFixed(1)}M, not zero
        </text>
        {monthTicks.map(({ p, i }) => (
          <text key={p.date} x={x(i)} y={H - 8} className="cc-tick x">
            {new Date(`${p.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
          </text>
        ))}

        <path d={d} className="tl-line" />
        <circle cx={x(lastI)} cy={y(last.value!)} r={3.5} className="tl-now" />
        <text
          x={narrow ? x(lastI) - 8 : x(lastI) + 8}
          y={y(last.value!) - (narrow ? 8 : -4)}
          className="tl-endlabel"
          style={narrow ? { textAnchor: "end" } : undefined}
        >
          {fmt(last.value)}
        </text>

        {hover !== null && points[hover]!.value !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="cc-cross" />
            <circle cx={x(hover)} cy={y(points[hover]!.value!)} r={3.4} className="tl-now" />
          </g>
        )}
      </svg>
      <div className="cc-readout" aria-live="polite">
        {hover !== null
          ? `${fmtDate(points[hover]!.date)} — combined storage ${fmt(points[hover]!.value)}`
          : "Hover for any day in the past 13 months"}
      </div>
    </div>
  );
}
