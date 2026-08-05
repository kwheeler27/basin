"use client";

/**
 * Compact line chart for the DetailSheet: one series, annotated ends,
 * optional capacity reference. Small enough to live inside a tap sheet;
 * honest enough to carry min/max/current labels instead of naked axes.
 */

export interface MiniSeriesData {
  /** [label, value] pairs, chronological. Nulls are gaps. */
  readonly points: readonly (readonly [string, number | null])[];
  readonly unit: string;
  /** Reference line (e.g. capacity); drawn dashed with a label. */
  readonly reference?: { value: number; label: string };
  readonly startLabel: string;
  readonly endLabel: string;
}

const W = 360;
const H = 96;
const M = { t: 14, r: 8, b: 16, l: 8 };

export function MiniSeries({ data }: { data: MiniSeriesData }) {
  const vals = data.points.map(([, v]) => v).filter((v): v is number => v !== null);
  if (vals.length < 2) return null;
  const hi = Math.max(...vals, data.reference?.value ?? -Infinity);
  const lo = Math.min(...vals, 0);
  const x = (i: number) => M.l + (i / (data.points.length - 1)) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - ((v - lo) / (hi - lo || 1)) * (H - M.t - M.b);

  let d = "";
  let pen = false;
  data.points.forEach(([, v], i) => {
    if (v === null) { pen = false; return; }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    pen = true;
  });

  const last = [...data.points].reverse().find(([, v]) => v !== null)!;
  const lastI = data.points.lastIndexOf(last);
  const minV = Math.min(...vals);
  const minI = data.points.findIndex(([, v]) => v === minV);

  return (
    <div className="mini-series">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Time series, ${data.startLabel} to ${data.endLabel}`}>
        {data.reference && (
          <g>
            <line x1={M.l} x2={W - M.r} y1={y(data.reference.value)} y2={y(data.reference.value)} className="ms-ref" />
            <text x={W - M.r} y={y(data.reference.value) - 3} className="ms-ref-label">
              {data.reference.label}
            </text>
          </g>
        )}
        <path d={d} className="ms-line" />
        <circle cx={x(lastI)} cy={y(last[1]!)} r={3} className="ms-now" />
        {minI >= 0 && minI !== lastI && (
          <circle cx={x(minI)} cy={y(minV)} r={2.3} className="ms-min" />
        )}
        <text x={M.l} y={H - 4} className="ms-axis">{data.startLabel}</text>
        <text x={W - M.r} y={H - 4} className="ms-axis end">{data.endLabel}</text>
      </svg>
    </div>
  );
}
