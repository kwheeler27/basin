"use client";

/**
 * Runoff efficiency: each water year as a point — April-1 snowpack index
 * (x, % of station median) against the natural flow that year produced
 * (y, acre-feet at Lees Ferry). Era carries the argument: quiet slate
 * points before 2000, warm points since, and a dashed straight-line fit
 * per era so the drop in the trade is visible. Provisional flow years
 * (past the official record) draw HOLLOW. The two accountings are only
 * ever paired, never summed; a snow year with no published flow renders
 * nowhere. Hover (or tap) a point for its year and both values.
 */

import { useRef, useState } from "react";
import {
  AWAITING_FLOW,
  ERA_SPLIT,
  POST_FIT,
  PRE_FIT,
  SNOW_FLOW_POINTS,
  type EraFit,
} from "@/lib/snowflow";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

const MAF = 1_000_000;
// Notable years wear a quiet permanent label; everything else is hover.
const LABELED = new Set([2020, 2021, 2023, 1997]);

export function SnowFlowScatter() {
  const [pick, setPick] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();

  if (width === 0) {
    return <div ref={ref} className="topline" style={{ minHeight: 280 }} />;
  }

  const W = width;
  const compact = W < 480;
  const H = Math.round(W * (compact ? 0.92 : 0.64));
  const M = { t: 18, r: compact ? 16 : 24, b: 40, l: 42 };

  const X_MAX = 165; // index max in record is 157%
  const Y_MAX = 24 * MAF; // record max 22.4 MAF; axis stays zero-based
  const x = (swe: number) => M.l + (swe / X_MAX) * (W - M.l - M.r);
  const y = (af: number) => H - M.b - (af / Y_MAX) * (H - M.t - M.b);

  const fitPath = (f: EraFit) => {
    const x1 = f.minSwe;
    const x2 = f.maxSwe;
    return `M${x(x1).toFixed(1)},${y(f.intercept + f.slope * x1).toFixed(1)} L${x(x2).toFixed(1)},${y(f.intercept + f.slope * x2).toFixed(1)}`;
  };

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    let best: number | null = null;
    let bestD = 26 * 26;
    SNOW_FLOW_POINTS.forEach((p, i) => {
      const d = (x(p.swePct) - px) ** 2 + (y(p.flowAf) - py) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setPick(best);
  };

  const picked = pick !== null ? SNOW_FLOW_POINTS[pick] : null;

  return (
    <div ref={ref} className="topline">
      <div className="cl-legend" aria-hidden="true">
        <span className="cl-chip">
          <span className="cl-swatch sf-dotchip sf-pre" />
          1985&ndash;{ERA_SPLIT - 1}
        </span>
        <span className="cl-chip">
          <span className="cl-swatch sf-dotchip sf-post" />
          {ERA_SPLIT}&ndash;
        </span>
        <span className="cl-chip">
          <span className="cl-swatch sf-dotchip sf-post sf-provchip" />
          hollow = provisional flow
        </span>
      </div>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Water years 1985 to present as points: April-1 snowpack index against the natural flow produced at Lees Ferry, with a straight-line fit per era — most years since ${ERA_SPLIT} sit below the pre-${ERA_SPLIT} line`}
        onMouseMove={onMove}
        onMouseLeave={() => setPick(null)}
      >
        {[5, 10, 15, 20].map((m) => (
          <g key={m}>
            <line x1={M.l} x2={W - M.r} y1={y(m * MAF)} y2={y(m * MAF)} className="cc-grid" />
            <text x={M.l - 6} y={y(m * MAF) + 3.5} className="cc-tick">{m}M</text>
          </g>
        ))}
        <text x={M.l - 4} y={M.t - 5} className="cc-tick unit" style={{ textAnchor: "start" }}>
          acre-feet of natural flow per water year
        </text>
        {[50, 100, 150].map((s) => (
          <text key={s} x={x(s)} y={H - M.b + 16} className="cc-tick x">
            {s}%
          </text>
        ))}
        <text x={W - M.r} y={H - 6} className="cc-tick unit" style={{ textAnchor: "end" }}>
          April-1 snowpack · % of station median
        </text>

        <line x1={x(100)} x2={x(100)} y1={M.t} y2={H - M.b} className="es-ref" />
        <text
          x={x(100) + 5}
          y={M.t + 10}
          className="es-reflabel"
          style={{ fontSize: 10.5 }}
        >
          median snow
        </text>

        {PRE_FIT && <path d={fitPath(PRE_FIT)} className="sf-fit sf-pre" />}
        {POST_FIT && <path d={fitPath(POST_FIT)} className="sf-fit sf-post" />}
        {PRE_FIT && !compact && (
          <text
            x={x(PRE_FIT.maxSwe) + 5}
            y={y(PRE_FIT.intercept + PRE_FIT.slope * PRE_FIT.maxSwe) + 3.5}
            className="sf-fitlabel sf-pre"
          >
            pre-{ERA_SPLIT} fit
          </text>
        )}
        {POST_FIT && !compact && (
          <text
            x={x(POST_FIT.maxSwe) + 5}
            y={y(POST_FIT.intercept + POST_FIT.slope * POST_FIT.maxSwe) + 3.5}
            className="sf-fitlabel sf-post"
          >
            since-{ERA_SPLIT} fit
          </text>
        )}

        {SNOW_FLOW_POINTS.map((p, i) => {
          const era = p.wy < ERA_SPLIT ? "sf-pre" : "sf-post";
          return (
            <g key={p.wy}>
              <circle
                cx={x(p.swePct)}
                cy={y(p.flowAf)}
                r={p.wy < ERA_SPLIT ? 3.5 : 4.5}
                className={`sf-dot ${era}${p.provisional ? " sf-prov" : ""}${pick === i ? " picked" : ""}`}
              />
              {LABELED.has(p.wy) && !compact && pick !== i && (
                <text
                  x={x(p.swePct)}
                  y={y(p.flowAf) - 8}
                  className={`sf-yearlabel ${era}`}
                >
                  {p.wy}
                </text>
              )}
            </g>
          );
        })}

        {picked && (
          <text
            x={x(picked.swePct) + (picked.swePct > X_MAX * 0.65 ? -10 : 10)}
            y={y(picked.flowAf) - 10}
            className={`sf-pick ${picked.wy < ERA_SPLIT ? "sf-pre" : "sf-post"}`}
            style={picked.swePct > X_MAX * 0.65 ? { textAnchor: "end" } : undefined}
          >
            {`WY${picked.wy} · ${Math.round(picked.swePct)}% snow → ${(picked.flowAf / MAF).toFixed(1)} MAF${picked.provisional ? " · provisional" : ""}`}
          </text>
        )}
      </svg>
      <div className="cc-readout" aria-live="polite">
        {picked
          ? `WY${picked.wy}: ${Math.round(picked.swePct)}% of median snow became ${(picked.flowAf / MAF).toFixed(1)} MAF of river${picked.provisional ? " (provisional)" : ""}`
          : AWAITING_FLOW.length > 0
            ? `Hover any point. WY${AWAITING_FLOW.join(" and WY")} have snow readings but no published flow yet — they join when Reclamation posts it.`
            : "Hover any point for its year, snow index, and flow."}
      </div>
    </div>
  );
}
