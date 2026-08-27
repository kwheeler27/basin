"use client";

/**
 * The supply story as a time-series: 115 years of annual natural flow at
 * Lees Ferry, with the 1922 Compact assumption and the modern mean drawn
 * as reference lines — the structural problem in one image. Light annual
 * line, bold 10-year mean, crosshair + readout.
 */

import { useRef, useState } from "react";
import flow from "@/public/geo/natural_flow_wy.json";
import { SUPPLY } from "@/lib/system";

const W = 920;
const H = 260;
const M = { t: 22, r: 130, b: 26, l: 40 };
const MAF = 1_000_000;

export function SupplySeries() {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const years = Object.keys(flow.wy).map(Number).sort((a, b) => a - b);
  const vals = years.map((y) => (flow.wy as Record<string, number>)[String(y)]!);
  const n = years.length;

  const hi = Math.max(...vals, SUPPLY.compactAssumption.acreFeet) * 1.05;
  const x = (i: number) => M.l + (i / (n - 1)) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - (v / hi) * (H - M.t - M.b);

  let d = "";
  vals.forEach((v, i) => {
    d += `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
  });

  // Trailing 10-year mean — the trend without the noise.
  let dm = "";
  vals.forEach((_, i) => {
    if (i < 9) return;
    const m = vals.slice(i - 9, i + 1).reduce((s, v) => s + v, 0) / 10;
    dm += `${dm === "" ? "M" : "L"}${x(i).toFixed(1)},${y(m).toFixed(1)} `;
  });

  const refs = [
    { v: SUPPLY.compactAssumption.acreFeet, label: "1922 assumption", cls: "warn" },
    { v: SUPPLY.modernMean.acreFeet, label: "modern mean", cls: "danger" },
  ];

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };

  return (
    <div className="topline">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Annual natural flow at Lees Ferry, 1906 to 2020, against the 1922 Compact assumption"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[5, 10, 15, 20].map((m) => (
          <g key={m}>
            <line x1={M.l} x2={W - M.r} y1={y(m * MAF)} y2={y(m * MAF)} className="cc-grid" />
            <text x={M.l - 6} y={y(m * MAF) + 3.5} className="cc-tick">{m}M</text>
          </g>
        ))}
        <text x={M.l - 4} y={M.t - 8} className="cc-tick unit" style={{ textAnchor: "start" }}>
          acre-feet per water year · natural flow at Lees Ferry
        </text>
        {years.filter((yy) => yy % 20 === 0).map((yy) => (
          <text key={yy} x={x(years.indexOf(yy))} y={H - 8} className="cc-tick x">
            {yy}
          </text>
        ))}

        {refs.map((r) => (
          <g key={r.label}>
            <line x1={M.l} x2={W - M.r} y1={y(r.v)} y2={y(r.v)} className={`es-ref ${r.cls === "danger" ? "power" : ""}`} />
            <text x={W - M.r + 4} y={y(r.v) + 3} className={`es-reflabel ${r.cls === "danger" ? "power" : ""}`}>
              {(r.v / MAF).toFixed(1)}M · {r.label}
            </text>
          </g>
        ))}

        <path d={d} className="sf-annual" />
        <path d={dm} className="sf-mean" />

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="cc-cross" />
            <circle cx={x(hover)} cy={y(vals[hover]!)} r={3.2} className="tl-now" />
          </g>
        )}
      </svg>
      <div className="cc-readout" aria-live="polite">
        {hover !== null
          ? `WY${years[hover]} — ${(vals[hover]! / MAF).toFixed(2)} MAF natural flow`
          : "Light line: each year. Bold line: trailing 10-year mean. Hover for any year."}
      </div>
    </div>
  );
}
