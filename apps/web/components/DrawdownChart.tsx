"use client";

/**
 * The drawdown: Powell and Mead storage, 2000 -> today, as two annotated
 * lines. The marquee time-series of the product — one axis (MAF), direct
 * labels at line ends, crosshair hover, annotations instead of a legend.
 */

import { useEffect, useMemo, useRef, useState } from "react";

interface Hist {
  vintage: string;
  months: string[];
  series: Record<string, (number | null)[]>;
}

const W = 920;
const H = 330;
const M = { t: 24, r: 88, b: 28, l: 40 };
const MAF = 1_000_000;

export function DrawdownChart({
  liveNow,
}: {
  liveNow: { powell?: number; mead?: number };
}) {
  const [hist, setHist] = useState<Hist | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    fetch("/geo/storage_history.json").then((r) => r.json()).then(setHist);
  }, []);

  const model = useMemo(() => {
    if (!hist) return null;
    const n = hist.months.length;
    const x = (i: number) => M.l + (i / (n - 1)) * (W - M.l - M.r);
    const y = (af: number) => H - M.b - (af / (26 * MAF)) * (H - M.t - M.b);
    const line = (rid: string) => {
      let d = "";
      let pen = false;
      (hist.series[rid] ?? []).forEach((v, i) => {
        if (v === null) { pen = false; return; }
        d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
        pen = true;
      });
      return d;
    };
    const yearTicks = hist.months
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => m.endsWith("-01") && Number(m.slice(0, 4)) % 5 === 0);
    return { n, x, y, line, yearTicks };
  }, [hist]);

  if (!hist || !model) {
    return <div className="drawdown loading">Loading 26 years of records…</div>;
  }
  const { n, x, y, line, yearTicks } = model;

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };

  const at = (rid: string, i: number) => hist.series[rid]?.[i] ?? null;
  const fmt = (v: number | null) => (v === null ? "—" : `${(v / MAF).toFixed(1)}M`);
  const label = (i: number) =>
    new Date(`${hist.months[i]}-15T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short", year: "numeric", timeZone: "UTC",
    });

  const lastI = n - 1;

  return (
    <div className="drawdown">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Lake Powell and Lake Mead storage, 2000 to today"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[5, 10, 15, 20, 25].map((m) => (
          <g key={m}>
            <line x1={M.l} x2={W - M.r} y1={y(m * MAF)} y2={y(m * MAF)} className="cc-grid" />
            <text x={M.l - 6} y={y(m * MAF) + 3.5} className="cc-tick">{m}M</text>
          </g>
        ))}
        <text x={M.l - 4} y={M.t - 8} className="cc-tick unit" style={{ textAnchor: "start" }}>acre-feet</text>
        {yearTicks.map(({ m, i }) => (
          <text key={m} x={x(i)} y={H - 8} className="cc-tick x">{m.slice(0, 4)}</text>
        ))}

        <path d={line("powell")} className="dd-line powell" />
        <path d={line("mead")} className="dd-line mead" />

        {/* direct labels at line ends */}
        <text x={x(lastI) + 8} y={y(at("powell", lastI) ?? 0) + 4} className="dd-label powell">
          Powell {fmt(at("powell", lastI))}
        </text>
        <text x={x(lastI) + 8} y={y(at("mead", lastI) ?? 0) + 4} className="dd-label mead">
          Mead {fmt(at("mead", lastI))}
        </text>

        {/* annotations */}
        <text x={x(8)} y={y(23.5 * MAF)} className="cc-ann">2000 — both nearly full</text>
        <text x={x(Math.round(n * 0.86))} y={y(4.2 * MAF)} className="cc-ann" textAnchor="middle">
          2022–23 — the near-crisis lows
        </text>

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="cc-cross" />
            {(["powell", "mead"] as const).map((rid) => {
              const v = at(rid, hover);
              return v === null ? null : (
                <circle key={rid} cx={x(hover)} cy={y(v)} r={3.4} className={`dd-dot ${rid}`} />
              );
            })}
          </g>
        )}
      </svg>
      <div className="cc-readout" aria-live="polite">
        {hover !== null
          ? `${label(hover)} — Powell ${fmt(at("powell", hover))} · Mead ${fmt(at("mead", hover))} · combined ${fmt((at("powell", hover) ?? 0) + (at("mead", hover) ?? 0))}`
          : "Hover for any month since 2000"}
      </div>
      <div className="chain-caveat" style={{ marginTop: 8 }}>
        Reclamation RISE, monthly-sampled daily storage (snapshot {hist.vintage});
        provisional throughout. Live values on the map above update hourly
        {liveNow.powell ? ` — Powell is at ${(liveNow.powell / MAF).toFixed(2)}M today` : ""}.
      </div>
    </div>
  );
}
