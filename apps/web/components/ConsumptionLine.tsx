"use client";

/**
 * Every consumer with an annual series, on one chart: the Lower Basin total
 * and its three states (decree accounting, 2003–2025), Mexico (treaty
 * accounting in the same reports, 2006–), and the Upper Basin (Reclamation's
 * CU&L workbook — a MODELED estimate on different books, so it draws dashed
 * per the house line grammar and the caption declares the bridge; it runs a
 * year behind the decree series and includes the Upper Basin's own reservoir
 * evaporation). The two accountings are never summed. Years a source
 * defeated the parser render as GAPS, never interpolations. The 7.5 MAF
 * apportionment draws as an administrative reference — each basin's number
 * happens to be the same 7.5. Hovering shows each series' value beside its
 * line. True-pixel responsive.
 */

import { useRef, useState } from "react";
import lb from "@/public/geo/lb_consumption_cy.json";
import ub from "@/public/geo/ub_consumption_cy.json";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

const MAF = 1_000_000;
const CEILING_AF = 7_500_000;

type YearRow = {
  lbTotal: number;
  az?: number;
  ca?: number;
  nv?: number;
  mexico?: number;
};

type SeriesKey = keyof YearRow | "ubTotal";

interface Series {
  key: SeriesKey;
  label: string;
  cls: string;
  bold?: boolean;
}

// Fixed order and fixed hues — a series keeps its color no matter what
// renders. The three states sum to the Lower Basin total; Mexico is a
// separate consumer in the same reports. The Upper Basin is a modeled
// estimate on different books (dashed via CSS), never summed with these.
const SERIES: readonly Series[] = [
  { key: "lbTotal", label: "Lower Basin total", cls: "cl-lb", bold: true },
  { key: "ubTotal", label: "Upper Basin (modeled)", cls: "cl-ub" },
  { key: "ca", label: "California", cls: "cl-ca" },
  { key: "az", label: "Arizona", cls: "cl-az" },
  { key: "mexico", label: "Mexico", cls: "cl-mx" },
  { key: "nv", label: "Nevada", cls: "cl-nv" },
];

export function ConsumptionLine() {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();

  const yearsMap = (lb as { years: Record<string, YearRow> }).years;
  const ubYearsMap = (ub as { years: Record<string, { ubTotal: number }> })
    .years;
  // The x-domain is the decree-accounting window; the Upper Basin series
  // (1971–) is clipped to it and simply ends where its estimates do.
  const first = Math.min(...Object.keys(yearsMap).map(Number));
  const last = Math.max(...Object.keys(yearsMap).map(Number));
  const years: number[] = [];
  for (let y = first; y <= last; y++) years.push(y);
  const valsFor = (key: SeriesKey) =>
    years.map((y) =>
      key === "ubTotal"
        ? (ubYearsMap[String(y)]?.ubTotal ?? null)
        : (yearsMap[String(y)]?.[key] ?? null),
    );
  const byKey = new Map(SERIES.map((s) => [s.key, valsFor(s.key)]));

  if (width === 0) {
    return <div ref={ref} className="topline" style={{ minHeight: 260 }} />;
  }

  const W = width;
  const compact = W < 480;
  const H = Math.round(W * (compact ? 0.85 : 0.72));
  const M = { t: 20, r: compact ? 14 : 58, b: 26, l: 38 };

  const hi = CEILING_AF * 1.06;
  const lo = 0;
  const n = years.length;
  const x = (i: number) => M.l + (i / (n - 1)) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b);

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

  const lastIdxFor = (vals: (number | null)[]) => {
    for (let i = vals.length - 1; i >= 0; i--) if (vals[i] !== null) return i;
    return -1;
  };

  const anyGaps = SERIES.some((s) => byKey.get(s.key)!.some((v) => v === null));

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
        aria-label="Consumptive use by year since 2003: Lower Basin total, California, Arizona, Nevada, and Mexico from decree accounting, plus the Upper Basin as a dashed modeled estimate, against the 7.5 MAF apportionment each basin holds"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[2, 4, 6].map((m) => (
          <g key={m}>
            <line x1={M.l} x2={W - M.r} y1={y(m * MAF)} y2={y(m * MAF)} className="cc-grid" />
            <text x={M.l - 6} y={y(m * MAF) + 3.5} className="cc-tick">{m}M</text>
          </g>
        ))}
        <text x={M.l - 4} y={M.t - 6} className="cc-tick unit" style={{ textAnchor: "start" }}>
          acre-feet per calendar year
        </text>
        {years.filter((yy) => yy % (compact ? 8 : 4) === 0).map((yy) => (
          <text key={yy} x={x(years.indexOf(yy))} y={H - 8} className="cc-tick x">
            {yy}
          </text>
        ))}

        <line x1={M.l} x2={W - M.r} y1={y(CEILING_AF)} y2={y(CEILING_AF)} className="es-ref" />
        <text x={M.l + 6} y={y(CEILING_AF) - 5} className="es-reflabel" style={{ fontSize: 10.5 }}>
          7.5M · each basin&rsquo;s apportionment
        </text>

        {SERIES.map((s) => (
          <path key={s.key} d={pathFor(byKey.get(s.key)!)}
            className={`cl-line ${s.cls}${s.bold ? " bold" : ""}`} />
        ))}

        {/* End labels tie identity to each line without hover (skipped when
            cramped — the legend still carries identity). */}
        {!compact &&
          SERIES.map((s) => {
            const vals = byKey.get(s.key)!;
            const li = lastIdxFor(vals);
            if (li < 0) return null;
            return (
              <text key={s.key} x={x(li) + 5} y={y(vals[li]!) + 3.5}
                className={`cl-endlabel ${s.cls}`}>
                {(vals[li]! / MAF).toFixed(s.key === "nv" ? 1 : 2)}M
              </text>
            );
          })}

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="cc-cross" />
            <text x={x(hover)} y={M.t + 10} className="cl-hoveryear">
              CY{years[hover]}
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
                    {(v / MAF).toFixed(2)}M
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>
      <div className="cc-readout" aria-live="polite">
        {hover !== null
          ? `CY${years[hover]} — hover values are beside each line, in MAF`
          : anyGaps
            ? "Hover for any year. Lines start and stop where their sources do — Mexico's series begins in 2006; the Upper Basin estimate runs a year behind."
            : "Hover any year; values appear beside each line."}
      </div>
    </div>
  );
}
