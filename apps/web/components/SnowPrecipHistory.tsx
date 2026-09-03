"use client";

/**
 * Where the river's water starts — April-1 snowpack and water-year
 * mountain precipitation as NRCS basin indexes (% of station median,
 * sum-over-sum convention, same roster as the live snowpack tile).
 * A different accounting from acre-feet of flow: indexes are never
 * summed or reconciled with the natural-flow record above, and years
 * with too few reporting stations render as gaps, never guesses.
 */

import { useRef, useState } from "react";
import hist from "@/public/geo/snow_precip_history.json";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

interface YearIndex {
  pct: number | null;
  used: number;
}

const SERIES = [
  { key: "aprilSwePctMedian", label: "April 1 snowpack", cls: "sp-swe", bold: true },
  { key: "wyPrecipPctMedian", label: "Water-year precipitation", cls: "sp-prec", bold: false },
] as const;

export function SnowPrecipHistory() {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();

  const data = hist as unknown as {
    aprilSwePctMedian: Record<string, YearIndex>;
    wyPrecipPctMedian: Record<string, YearIndex>;
  };
  const allYears = Object.keys(data.aprilSwePctMedian).map(Number);
  const first = Math.min(...allYears);
  const last = Math.max(...allYears);
  const years: number[] = [];
  for (let y = first; y <= last; y++) years.push(y);
  const valsFor = (key: (typeof SERIES)[number]["key"]) =>
    years.map((y) => data[key][String(y)]?.pct ?? null);
  const byKey = new Map(SERIES.map((s) => [s.key, valsFor(s.key)]));

  if (width === 0) {
    return <div ref={ref} className="topline" style={{ minHeight: 240 }} />;
  }

  const compact = width < 480;
  const W = width;
  const H = Math.round(W * (compact ? 0.8 : 0.5));
  const M = { t: 20, r: compact ? 14 : 56, b: 26, l: 40 };

  const maxVal = Math.max(
    110,
    ...[...byKey.values()].flat().filter((v): v is number => v !== null),
  );
  const hi = maxVal * 1.06;
  const n = years.length;
  const x = (i: number) => M.l + (i / (n - 1)) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - (v / hi) * (H - M.t - M.b);

  const pathFor = (vals: (number | null)[]) => {
    let d = "";
    let pen = false;
    vals.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };

  return (
    <div ref={ref} className="topline">
      <div className="cl-legend" aria-hidden="true">
        {SERIES.map((s) => (
          <span key={s.key} className="cl-chip">
            <span className={`cl-swatch ${s.cls}`} />
            {s.label}
          </span>
        ))}
      </div>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Upper Basin April-1 snowpack and water-year precipitation, as percent of the station median, by year"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[50, 150].map((m) => (
          <g key={m}>
            <line x1={M.l} x2={W - M.r} y1={y(m)} y2={y(m)} className="cc-grid" />
            <text x={M.l - 6} y={y(m) + 3.5} className="cc-tick">{m}%</text>
          </g>
        ))}
        <text x={M.l - 4} y={M.t - 6} className="cc-tick unit" style={{ textAnchor: "start" }}>
          % of station median · NRCS basin index
        </text>
        {years.filter((yy) => yy % (compact ? 10 : 5) === 0).map((yy) => (
          <text key={yy} x={x(years.indexOf(yy))} y={H - 8} className="cc-tick x">
            {yy}
          </text>
        ))}

        <line x1={M.l} x2={W - M.r} y1={y(100)} y2={y(100)} className="es-ref" />
        <text
          x={W - M.r - 6}
          y={y(100) - 5}
          className="es-reflabel"
          style={{ fontSize: 10.5, textAnchor: "end" }}
        >
          100% · the typical year
        </text>

        {SERIES.map((s) => (
          <path key={s.key} d={pathFor(byKey.get(s.key)!)}
            className={`cl-line ${s.cls}${s.bold ? " bold" : ""}`} />
        ))}

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="cc-cross" />
            <text x={x(hover)} y={M.t + 10} className="cl-hoveryear">
              {years[hover]}
            </text>
            {SERIES.map((s) => {
              const v = byKey.get(s.key)![hover];
              if (v == null) return null;
              const onLeft = hover > n * 0.72;
              return (
                <g key={s.key}>
                  <circle cx={x(hover)} cy={y(v)} r={3} className={`cl-dot ${s.cls}`} />
                  <text
                    x={x(hover) + (onLeft ? -7 : 7)}
                    y={y(v) - 6}
                    className={`cl-hoverval ${s.cls}`}
                    style={onLeft ? { textAnchor: "end" } : undefined}
                  >
                    {Math.round(v)}%
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>
      <div className="cc-readout" aria-live="polite">
        {hover !== null
          ? `${years[hover]} — values beside each line, % of median`
          : "Hover any year. Gaps are years with too few reporting stations, never zeros."}
      </div>
    </div>
  );
}
