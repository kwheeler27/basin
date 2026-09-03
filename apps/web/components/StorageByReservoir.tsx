"use client";

/**
 * Reservoir levels over time — the five reservoirs that supplied nearly all
 * of the drawdown, each as its own line, plus the six smaller tracked pools
 * summed as "Rest of system". Monthly since January 2000 (Reclamation RISE,
 * last reading of each month). Same accounting on every line: water in
 * storage, acre-feet. Hover shows each line's value beside it.
 */

import { useRef, useState } from "react";
import hist from "@/public/geo/storage_history.json";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

const MAF = 1_000_000;

interface LineDef {
  key: string;
  label: string;
  /** Short form for the at-line end label, where space is tight. */
  endLabel: string;
  cls: string;
  /** ids summed into this line (for the Rest bucket). */
  ids: readonly string[];
}

const LINES: readonly LineDef[] = [
  { key: "mead", label: "Mead", endLabel: "Mead", cls: "sr-mead", ids: ["mead"] },
  { key: "powell", label: "Powell", endLabel: "Powell", cls: "sr-powell", ids: ["powell"] },
  { key: "navajo", label: "Navajo", endLabel: "Navajo", cls: "sr-navajo", ids: ["navajo"] },
  { key: "flaming_gorge", label: "Flaming Gorge", endLabel: "Fl. Gorge", cls: "sr-fg", ids: ["flaming_gorge"] },
  { key: "blue_mesa", label: "Blue Mesa", endLabel: "Blue Mesa", cls: "sr-bm", ids: ["blue_mesa"] },
  {
    key: "rest",
    label: "Rest of system (6)",
    endLabel: "Rest (6)",
    cls: "sr-rest",
    ids: ["mohave", "havasu", "granby", "fontenelle", "mcphee", "strawberry"],
  },
];

export function StorageByReservoir() {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();

  const months = (hist as { months: string[] }).months;
  const series = (hist as { series: Record<string, (number | null)[]> }).series;
  const n = months.length;

  const sumAt = (ids: readonly string[], i: number): number | null => {
    let s = 0;
    for (const id of ids) {
      const v = series[id]?.[i];
      if (v == null) return null; // partial sums would lie
      s += v;
    }
    return s;
  };
  const valsFor = (l: LineDef) => months.map((_, i) => sumAt(l.ids, i));
  const byKey = new Map(LINES.map((l) => [l.key, valsFor(l)]));

  if (width === 0) {
    return <div ref={ref} className="topline" style={{ minHeight: 260 }} />;
  }

  const compact = width < 600;
  const W = compact ? width : Math.min(width, 880);
  const H = Math.round(W * (compact ? 0.8 : 0.46));
  const M = { t: 18, r: compact ? 12 : 120, b: 26, l: 40 };

  const hi = 27 * MAF;
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
  const lastIdxFor = (vals: (number | null)[]) => {
    for (let i = vals.length - 1; i >= 0; i--) if (vals[i] !== null) return i;
    return -1;
  };

  const yearTicks = months
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.endsWith("-01") && Number(m.slice(0, 4)) % (compact ? 8 : 4) === 0);

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
        {LINES.map((l) => (
          <span key={l.key} className="cl-chip">
            <span className={`cl-swatch ${l.cls}`} />
            {l.label}
          </span>
        ))}
      </div>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Water in storage by reservoir, monthly since 2000: Mead, Powell, Navajo, Flaming Gorge, Blue Mesa, and the six smaller tracked reservoirs combined"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[10, 20].map((m) => (
          <g key={m}>
            <line x1={M.l} x2={W - M.r} y1={y(m * MAF)} y2={y(m * MAF)} className="cc-grid" />
            <text x={M.l - 6} y={y(m * MAF) + 3.5} className="cc-tick">{m}M</text>
          </g>
        ))}
        <text x={M.l - 4} y={M.t - 4} className="cc-tick unit" style={{ textAnchor: "start" }}>
          acre-feet in storage, end of month
        </text>
        {yearTicks.map(({ m, i }) => (
          <text key={m} x={x(i)} y={H - 8} className="cc-tick x">
            {m.slice(0, 4)}
          </text>
        ))}

        {LINES.map((l) => (
          <path key={l.key} d={pathFor(byKey.get(l.key)!)}
            className={`cl-line ${l.cls}${l.key === "mead" || l.key === "powell" ? " bold" : ""}`} />
        ))}

        {!compact &&
          LINES.map((l) => {
            const vals = byKey.get(l.key)!;
            const li = lastIdxFor(vals);
            if (li < 0) return null;
            return (
              <text key={l.key} x={x(li) + 5} y={y(vals[li]!) + 3.5}
                className={`cl-endlabel ${l.cls}`}>
                {l.endLabel} {(vals[li]! / MAF).toFixed(1)}M
              </text>
            );
          })}

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="cc-cross" />
            <text x={x(hover)} y={M.t + 10} className="cl-hoveryear">
              {months[hover]}
            </text>
            {(() => {
              // Nudge colliding value labels apart (Mead and Powell cross
              // repeatedly) — dots stay on the data; only text moves.
              const entries = LINES.flatMap((l) => {
                const v = byKey.get(l.key)![hover];
                return v == null ? [] : [{ l, v, ly: y(v) - 6 }];
              }).sort((a, b) => a.ly - b.ly);
              for (let i = 1; i < entries.length; i++) {
                if (entries[i]!.ly - entries[i - 1]!.ly < 13) {
                  entries[i]!.ly = entries[i - 1]!.ly + 13;
                }
              }
              const onLeft = hover > n * 0.72;
              return entries.map(({ l, v, ly }) => (
                <g key={l.key}>
                  <circle cx={x(hover)} cy={y(v)} r={3} className={`cl-dot ${l.cls}`} />
                  <text
                    x={x(hover) + (onLeft ? -7 : 7)}
                    y={ly}
                    className={`cl-hoverval ${l.cls}`}
                    style={onLeft ? { textAnchor: "end" } : undefined}
                  >
                    {(v / MAF).toFixed(1)}M
                  </text>
                </g>
              ));
            })()}
          </g>
        )}
      </svg>
      <div className="cc-readout" aria-live="polite">
        {hover !== null
          ? `${months[hover]} — values beside each line, in MAF`
          : "Hover any month; values appear beside each line."}
      </div>
    </div>
  );
}
