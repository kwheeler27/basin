"use client";

/**
 * The supply story as a time-series: 115 years of annual natural flow at
 * Lees Ferry, with the 1922 Compact assumption and the modern mean drawn
 * as reference lines — the structural problem in one image.
 *
 * Renders at TRUE pixel size (measured container width), so mobile gets a
 * taller layout with in-plot reference labels and real font sizes instead
 * of a scaled-down postage stamp.
 */

import { useRef, useState } from "react";
import flow from "@/public/geo/natural_flow_wy.json";
import { SUPPLY } from "@/lib/system";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

const MAF = 1_000_000;

export function SupplySeries() {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();

  const years = Object.keys(flow.wy).map(Number).sort((a, b) => a - b);
  const vals = years.map((y) => (flow.wy as Record<string, number>)[String(y)]!);
  const n = years.length;

  if (width === 0) {
    return <div ref={ref} className="topline" style={{ minHeight: 220 }} />;
  }

  const narrow = width < 600;
  // Capped: at full content width the panorama ratio got so wide the shape
  // of the record disappeared (Kevin, 2026-09-02).
  const W = narrow ? width : Math.min(width, 880);
  const H = narrow ? Math.round(W * 0.78) : Math.round(W * 0.42);
  const M = narrow
    ? { t: 26, r: 12, b: 26, l: 36 }
    : { t: 22, r: 128, b: 26, l: 42 };

  const hi = Math.max(...vals, SUPPLY.compactAssumption.acreFeet) * 1.05;
  const x = (i: number) => M.l + (i / (n - 1)) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - (v / hi) * (H - M.t - M.b);

  let d = "";
  vals.forEach((v, i) => {
    d += `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
  });

  let dm = "";
  vals.forEach((_, i) => {
    if (i < 9) return;
    const m = vals.slice(i - 9, i + 1).reduce((s, v) => s + v, 0) / 10;
    dm += `${dm === "" ? "M" : "L"}${x(i).toFixed(1)},${y(m).toFixed(1)} `;
  });

  const refs = [
    { v: SUPPLY.compactAssumption.acreFeet, label: "1922 assumption", cls: "" },
    { v: SUPPLY.modernMean.acreFeet, label: "modern mean", cls: "power" },
  ];

  const tickEvery = narrow ? 40 : 20;

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };

  return (
    <div ref={ref} className="topline">
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Annual natural flow at Lees Ferry, 1906 to 2020, against the 1922 Compact assumption"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[5, 10, 15, 20].map((m) => (
          <g key={m}>
            <line x1={M.l} x2={W - M.r} y1={y(m * MAF)} y2={y(m * MAF)} className="cc-grid" />
            <text x={M.l - 6} y={y(m * MAF) + 3.5} className="cc-tick">{m}M</text>
          </g>
        ))}
        <text x={M.l - 4} y={M.t - 8} className="cc-tick unit" style={{ textAnchor: "start" }}>
          {narrow ? "acre-feet per water year" : "acre-feet per water year · natural flow at Lees Ferry"}
        </text>
        {years.filter((yy) => yy % tickEvery === 0).map((yy) => (
          <text key={yy} x={x(years.indexOf(yy))} y={H - 8} className="cc-tick x">
            {yy}
          </text>
        ))}

        {refs.map((r) => (
          <g key={r.label}>
            <line x1={M.l} x2={W - M.r} y1={y(r.v)} y2={y(r.v)} className={`es-ref ${r.cls}`} />
            {narrow ? (
              <text x={M.l + 6} y={y(r.v) - 5}
                className={`es-reflabel ${r.cls}`} style={{ fontSize: 11 }}>
                {(r.v / MAF).toFixed(1)}M · {r.label}
              </text>
            ) : (
              <text x={W - M.r + 4} y={y(r.v) + 3} className={`es-reflabel ${r.cls}`}>
                {(r.v / MAF).toFixed(1)}M · {r.label}
              </text>
            )}
          </g>
        ))}

        <path d={d} className="sf-annual" style={narrow ? { strokeWidth: 1 } : undefined} />
        <path d={dm} className="sf-mean" style={narrow ? { strokeWidth: 2.6 } : undefined} />

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
