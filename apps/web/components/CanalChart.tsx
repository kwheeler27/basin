"use client";

/**
 * One canal's season: daily headgate hydrograph, annotated NYT-style.
 * One axis (cfs), direct annotations for on/peak/off, crosshair hover
 * per the interaction doctrine. Data baked from CDSS (primary).
 */

import { useMemo, useRef, useState } from "react";

export interface CanalData {
  name: string;
  season: number;
  totalAf: number;
  peakCfs: number;
  peakDate: string;
  onDate: string;
  offDate: string;
  days: [string, number][];
}

const W = 900;
const H = 300;
const M = { t: 34, r: 16, b: 30, l: 44 };

export function CanalChart({ data }: { data: CanalData }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { pts, x, y, maxCfs, months } = useMemo(() => {
    const days = data.days;
    const maxCfs = Math.max(...days.map(([, v]) => v)) * 1.08;
    const x = (i: number) => M.l + (i / (days.length - 1)) * (W - M.l - M.r);
    const y = (v: number) => H - M.b - (v / maxCfs) * (H - M.t - M.b);
    const pts = days.map(([d, v], i) => ({ d, v, x: x(i), y: y(v) }));
    const months: { x: number; label: string }[] = [];
    days.forEach(([d], i) => {
      if (d.endsWith("-01")) {
        months.push({
          x: x(i),
          label: new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
            month: "short",
            timeZone: "UTC",
          }),
        });
      }
    });
    return { pts, x, y, maxCfs, months };
  }, [data]);

  const area =
    `M${pts[0]!.x},${y(0)} ` +
    pts.map((p) => `L${p.x},${p.y}`).join(" ") +
    ` L${pts[pts.length - 1]!.x},${y(0)} Z`;
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  const idxOf = (d: string) => data.days.findIndex(([dd]) => dd === d);
  const peakI = idxOf(data.peakDate);
  const onI = idxOf(data.onDate);
  const offI = idxOf(data.offDate);

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.l) / (W - M.l - M.r)) * (pts.length - 1));
    setHover(i >= 0 && i < pts.length ? i : null);
  };

  const fmtDate = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

  const h = hover !== null ? pts[hover] : null;

  return (
    <div className="canal-chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Daily diversions into the ${data.name}, ${data.season} season: on ${data.onDate}, peak ${Math.round(data.peakCfs)} cfs on ${data.peakDate}, off ${data.offDate}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* y grid: 3 recessive lines */}
        {[200, 400, 600].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="cc-grid" />
            <text x={M.l - 6} y={y(v) + 3.5} className="cc-tick">{v}</text>
          </g>
        ))}
        <text x={M.l - 6} y={M.t - 14} className="cc-tick unit">cfs</text>

        {/* month ticks */}
        {months.map((m) => (
          <text key={m.label} x={m.x} y={H - 9} className="cc-tick x">{m.label}</text>
        ))}

        <path d={area} className="cc-area" />
        <path d={line} className="cc-line" />

        {/* annotations */}
        {onI >= 0 && (
          <g>
            <line x1={pts[onI]!.x} x2={pts[onI]!.x} y1={y(0)} y2={y(0) - 46} className="cc-ann-line" />
            <text x={pts[onI]!.x + 5} y={y(0) - 36} className="cc-ann">
              Canal on · {fmtDate(data.onDate)}
            </text>
          </g>
        )}
        {peakI >= 0 && (
          <g>
            <circle cx={pts[peakI]!.x} cy={pts[peakI]!.y} r={3.5} className="cc-peak" />
            <text x={pts[peakI]!.x} y={pts[peakI]!.y - 10} className="cc-ann peak">
              {Math.round(data.peakCfs)} cfs · July 4 — peak crop demand
            </text>
          </g>
        )}
        {offI >= 0 && (
          <g>
            <line x1={pts[offI]!.x} x2={pts[offI]!.x} y1={y(0)} y2={y(0) - 46} className="cc-ann-line" />
            <text x={pts[offI]!.x - 5} y={y(0) - 36} className="cc-ann end">
              Off · {fmtDate(data.offDate)}
            </text>
          </g>
        )}

        {/* crosshair */}
        {h && (
          <g>
            <line x1={h.x} x2={h.x} y1={M.t} y2={y(0)} className="cc-cross" />
            <circle cx={h.x} cy={h.y} r={3.5} className="cc-dot" />
          </g>
        )}
        <line x1={M.l} x2={W - M.r} y1={y(0)} y2={y(0)} className="cc-base" />
      </svg>
      <div className="cc-readout" aria-live="polite">
        {h
          ? `${fmtDate(h.d)}, ${data.season} — ${Math.round(h.v).toLocaleString()} cfs`
          : "Hover the season"}
      </div>
    </div>
  );
}
