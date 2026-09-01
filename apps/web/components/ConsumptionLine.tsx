"use client";

/**
 * Lower Basin consumptive use, year by year, from 23 years of decree
 * accounting reports — the "how did we get here" line for §1. Years whose
 * report format defeated the parser render as GAPS, never interpolations
 * (they are named in the caption). The 7.5 MAF apportionment draws as an
 * administrative reference. True-pixel responsive, crosshair + readout.
 */

import { useRef, useState } from "react";
import lb from "@/public/geo/lb_consumption_cy.json";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

const MAF = 1_000_000;
const CEILING_AF = 7_500_000;

export function ConsumptionLine() {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();

  const yearsMap = (lb as { years: Record<string, { lbTotal: number }> }).years;
  const first = Math.min(...Object.keys(yearsMap).map(Number));
  const last = Math.max(...Object.keys(yearsMap).map(Number));
  const years: number[] = [];
  for (let y = first; y <= last; y++) years.push(y);
  const vals = years.map((y) => yearsMap[String(y)]?.lbTotal ?? null);

  if (width === 0) {
    return <div ref={ref} className="topline" style={{ minHeight: 200 }} />;
  }

  const narrow = width < 600;
  const W = width;
  const H = narrow ? Math.round(W * 0.62) : Math.round(W * 0.28);
  const M = narrow
    ? { t: 24, r: 14, b: 26, l: 40 }
    : { t: 22, r: 110, b: 26, l: 44 };

  const hi = CEILING_AF * 1.06;
  const lo = 5_200_000;
  const n = years.length;
  const x = (i: number) => M.l + (i / (n - 1)) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b);

  let d = "";
  let pen = false;
  vals.forEach((v, i) => {
    if (v === null) { pen = false; return; }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    pen = true;
  });

  const lastI = vals.length - 1 - [...vals].reverse().findIndex((v) => v !== null);

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
        aria-label="Lower Basin consumptive use by year since 2003, against the 7.5 MAF apportionment"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[6, 7].map((m) => (
          <g key={m}>
            <line x1={M.l} x2={W - M.r} y1={y(m * MAF)} y2={y(m * MAF)} className="cc-grid" />
            <text x={M.l - 6} y={y(m * MAF) + 3.5} className="cc-tick">{m}M</text>
          </g>
        ))}
        <text x={M.l - 4} y={M.t - 8} className="cc-tick unit" style={{ textAnchor: "start" }}>
          acre-feet per calendar year · y-axis starts at 5.2M, not zero
        </text>
        {years.filter((yy) => yy % (narrow ? 8 : 4) === 0).map((yy) => (
          <text key={yy} x={x(years.indexOf(yy))} y={H - 8} className="cc-tick x">
            {yy}
          </text>
        ))}

        <line x1={M.l} x2={W - M.r} y1={y(CEILING_AF)} y2={y(CEILING_AF)} className="es-ref" />
        <text
          x={narrow ? M.l + 6 : W - M.r + 4}
          y={narrow ? y(CEILING_AF) - 5 : y(CEILING_AF) + 3}
          className="es-reflabel"
          style={narrow ? { fontSize: 10.5 } : undefined}
        >
          7.5M · apportionment
        </text>

        <path d={d} className="tl-line" />
        {vals[lastI] !== null && (
          <>
            <circle cx={x(lastI)} cy={y(vals[lastI]!)} r={3.5} className="tl-now" />
            <text
              x={x(lastI) - 8}
              y={y(vals[lastI]!) - 8}
              className="tl-endlabel"
              style={{ textAnchor: "end" }}
            >
              {(vals[lastI]! / MAF).toFixed(2)}M · {years[lastI]}
            </text>
          </>
        )}

        {hover !== null && vals[hover] !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="cc-cross" />
            <circle cx={x(hover)} cy={y(vals[hover]!)} r={3.2} className="tl-now" />
          </g>
        )}
      </svg>
      <div className="cc-readout" aria-live="polite">
        {hover !== null
          ? vals[hover] !== null
            ? `CY${years[hover]} — ${(vals[hover]! / MAF).toFixed(2)} MAF Lower Basin consumptive use`
            : `CY${years[hover]} — report format not yet parsed; shown as a gap`
          : "Hover for any year. Gaps are unparsed report years, never zeros."}
      </div>
    </div>
  );
}
