"use client";

/**
 * The reserves, drawn down: combined Powell + Mead storage, monthly since
 * 2000, with the live value as the endpoint. The "impact on the savings
 * account" picture for the landing's beat 4. True-pixel responsive.
 */

import { useRef, useState } from "react";
import hist from "@/public/geo/storage_history.json";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

const MAF = 1_000_000;

export function StorageHistoryLine({
  liveAf,
  capacityAf,
}: {
  liveAf: number | null;
  capacityAf: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();

  const months: string[] = (hist as { months: string[] }).months;
  const series = (hist as { series: Record<string, (number | null)[]> }).series;
  const combined = months.map((_, i) => {
    const p = series.powell?.[i];
    const m = series.mead?.[i];
    return p != null && m != null ? p + m : null;
  });

  if (width === 0) {
    return <div ref={ref} className="topline" style={{ minHeight: 200 }} />;
  }

  const narrow = width < 600;
  const W = width;
  const H = narrow ? Math.round(W * 0.62) : Math.round(W * 0.28);
  const M = narrow
    ? { t: 24, r: 44, b: 24, l: 40 }
    : { t: 22, r: 118, b: 24, l: 44 };

  const n = months.length;
  const hi = capacityAf * 1.04;
  const x = (i: number) => M.l + (i / (n - 1)) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - (v / hi) * (H - M.t - M.b);

  let d = "";
  let pen = false;
  combined.forEach((v, i) => {
    if (v === null) { pen = false; return; }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    pen = true;
  });

  const lastI = combined.length - 1 - [...combined].reverse().findIndex((v) => v !== null);
  const endVal = liveAf ?? combined[lastI]!;

  const yearTicks = months
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.endsWith("-01") && Number(m.slice(0, 4)) % (narrow ? 10 : 5) === 0);

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };

  const fmtMonth = (m: string) =>
    new Date(`${m}-15T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short", year: "numeric", timeZone: "UTC",
    });

  return (
    <div ref={ref} className="topline">
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Combined Powell and Mead storage since 2000, against full capacity"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[20, 40].map((m) => (
          <g key={m}>
            <line x1={M.l} x2={W - M.r} y1={y(m * MAF)} y2={y(m * MAF)} className="cc-grid" />
            <text x={M.l - 6} y={y(m * MAF) + 3.5} className="cc-tick">{m}M</text>
          </g>
        ))}
        <line x1={M.l} x2={W - M.r} y1={y(capacityAf)} y2={y(capacityAf)} className="es-ref" />
        <text
          x={M.l + 6}
          y={y(capacityAf) + 14}
          className="es-reflabel"
          style={narrow ? { fontSize: 10.5 } : undefined}
        >
          full combined capacity · {(capacityAf / MAF).toFixed(0)}M (100%)
        </text>
        {[25, 50, 75, 100].map((p) => (
          <text key={p} x={W - M.r + 6} y={y((p / 100) * capacityAf) + 3.5}
            className="cc-tick" style={{ textAnchor: "start" }}>
            {p}%
          </text>
        ))}
        <text x={M.l - 4} y={M.t - 8} className="cc-tick unit" style={{ textAnchor: "start" }}>
          {narrow
            ? "acre-feet (left) · % of capacity (right)"
            : "acre-feet (left) · % of combined capacity (right) — Powell + Mead, the two largest reservoirs in the US"}
        </text>
        {yearTicks.map(({ m, i }) => (
          <text key={m} x={x(i)} y={H - 8} className="cc-tick x">
            {m.slice(0, 4)}
          </text>
        ))}

        <path d={d} className="tl-line" />
        <circle cx={x(lastI)} cy={y(endVal)} r={3.5} className="tl-now" />
        <text
          x={x(lastI) - 8}
          y={y(endVal) - 8}
          className="tl-endlabel"
          style={{ textAnchor: "end" }}
        >
          {narrow
            ? `${(endVal / MAF).toFixed(1)}M today`
            : `Powell + Mead · ${(endVal / MAF).toFixed(1)}M today`}
        </text>

        {hover !== null && combined[hover] !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="cc-cross" />
            <circle cx={x(hover)} cy={y(combined[hover]!)} r={3.2} className="tl-now" />
          </g>
        )}
      </svg>
      <div className="cc-readout" aria-live="polite">
        {hover !== null && combined[hover] !== null
          ? `${fmtMonth(months[hover]!)} — ${(combined[hover]! / MAF).toFixed(1)} MAF combined`
          : "Monthly since 2000, live endpoint. Hover for any month."}
      </div>
    </div>
  );
}
