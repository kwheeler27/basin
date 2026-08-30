"use client";

/**
 * One sub-basin's drought coverage over time. The USDM categories are
 * cumulative (D0 ⊇ D1 ⊇ … ⊇ D4), so they draw as NESTED area fills —
 * lightest (D0+) at the back, exceptional (D4) in front — with the
 * current percentage direct-labeled per band. Crosshair + readout.
 */

import { useRef, useState } from "react";
import type { DroughtSeries } from "@/lib/drought";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

const BANDS = [
  { key: "d0", label: "D0+ abnormally dry", cls: "dr0" },
  { key: "d1", label: "D1+ moderate", cls: "dr1" },
  { key: "d2", label: "D2+ severe", cls: "dr2" },
  { key: "d3", label: "D3+ extreme", cls: "dr3" },
  { key: "d4", label: "D4 exceptional", cls: "dr4" },
] as const;

export function DroughtPanel({ series }: { series: DroughtSeries }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();

  const weeks = series.weeks;
  if (weeks.length < 8) {
    return (
      <section className="card">
        <div className="card-head">
          <h2 className="card-title">{series.name}</h2>
        </div>
        <p className="err">
          Drought Monitor data unavailable. Showing no value rather than a
          stale one.
        </p>
      </section>
    );
  }

  if (width === 0) {
    return (
      <section className="card">
        <div ref={ref} style={{ minHeight: 200 }} />
      </section>
    );
  }

  const narrow = width < 430;
  const W = width;
  const H = narrow ? Math.round(W * 0.66) : Math.round(W * 0.46);
  const M = narrow
    ? { t: 16, r: 78, b: 22, l: 34 }
    : { t: 16, r: 96, b: 22, l: 36 };

  const n = weeks.length;
  const latest = weeks[n - 1]!;
  const x = (i: number) => M.l + (i / (n - 1)) * (W - M.l - M.r);
  const y = (pct: number) => H - M.b - (pct / 100) * (H - M.t - M.b);

  const area = (key: (typeof BANDS)[number]["key"]) => {
    let d = `M${x(0).toFixed(1)},${y(0).toFixed(1)} `;
    weeks.forEach((w, i) => {
      d += `L${x(i).toFixed(1)},${y(w[key]).toFixed(1)} `;
    });
    d += `L${x(n - 1).toFixed(1)},${y(0).toFixed(1)} Z`;
    return d;
  };

  const yearTicks = weeks
    .map((w, i) => ({ w, i }))
    .filter(({ w }, idx, arr) => {
      const m = w.mapDate.slice(0, 7);
      const prev = idx > 0 ? arr[idx - 1]!.w.mapDate.slice(0, 7) : "";
      return m !== prev && ["01", "07"].includes(w.mapDate.slice(5, 7));
    });

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };

  const at = hover !== null ? weeks[hover]! : latest;
  const fmtDate = (s: string) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
    });

  return (
    <section className="card" ref={ref}>
      <div className="card-head">
        <h2 className="card-title">{series.name}</h2>
        <span className="card-sub">HUC-{series.huc} watershed</span>
      </div>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`${series.name} percent area by drought severity, past two years`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[50, 100].map((p) => (
          <g key={p}>
            <line x1={M.l} x2={W - M.r} y1={y(p)} y2={y(p)} className="cc-grid" />
            <text x={M.l - 6} y={y(p) + 3.5} className="cc-tick">{p}%</text>
          </g>
        ))}
        <text x={M.l - 4} y={M.t - 5} className="cc-tick unit" style={{ textAnchor: "start" }}>
          % of watershed at each severity, or worse
        </text>
        {yearTicks.map(({ w, i }) => (
          <text key={w.mapDate} x={x(i)} y={H - 6} className="cc-tick x">
            {new Date(`${w.mapDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })}
          </text>
        ))}

        {BANDS.map((b) => (
          <path key={b.key} d={area(b.key)} className={`dr-area ${b.cls}`} />
        ))}

        {BANDS.map((b, bi) => (
          <text key={`l-${b.key}`} x={W - M.r + 5}
            y={M.t + 10 + bi * 13} className={`dr-label ${b.cls}`}>
            {b.label.split(" ")[0]} {Math.round(at[b.key])}%
          </text>
        ))}

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="cc-cross" />
        )}
      </svg>
      <div className="cc-readout" aria-live="polite">
        {hover !== null
          ? `week of ${fmtDate(at.mapDate)} — D2+ ${at.d2.toFixed(0)}% · D3+ ${at.d3.toFixed(0)}% · D4 ${at.d4.toFixed(0)}%`
          : `map date ${fmtDate(latest.mapDate)} — hover for any week in the past two years`}
      </div>
    </section>
  );
}
