import type { SystemProfile } from "@/lib/infrastructure";

/**
 * Water flowing uphill, drawn: distance along the route vs elevation, each
 * pumping plant a vertical jump. Server-rendered SVG in the house register —
 * one hue, still at rest, every number from the operator (schematic
 * positions dashed and said aloud).
 */

const W = 720;
const H = 240;
const M = { t: 26, r: 16, b: 34, l: 46 };

export function ElevationProfile({ system }: { system: SystemProfile }) {
  const pts = system.points;
  const x = (mile: number) => M.l + (mile / system.miles) * (W - M.l - M.r);

  // Build the step polyline: cumulative for schematic profiles, absolute
  // where the operator publishes elevations.
  let elev = system.profileKind === "absolute" ? (system.startElevFt ?? 0) : 0;
  const totalRise = system.profileKind === "absolute"
    ? (pts.filter((p) => p.toElevFt).at(-1)!.toElevFt! - (system.startElevFt ?? 0))
    : system.totalLiftFt;
  const pumpCount = pts.filter((p) => p.kind === "pump" || (p.kind === "intake" && p.liftFt)).length;
  const yMin = system.profileKind === "absolute" ? (system.startElevFt ?? 0) : 0;
  const yMax = yMin + totalRise * 1.06; // headroom so the summit run clears the top gridline
  const y = (e: number) => H - M.b - ((e - yMin) / (yMax - yMin)) * (H - M.t - M.b);

  const steps: { x0: number; x1: number; e0: number; e1: number; p: (typeof pts)[number] }[] = [];
  pts.forEach((p) => {
    const px = x(p.mile);
    const lift = p.liftFt ?? (p.kind === "pump" && system.profileKind === "cumulative-schematic" ? totalRise / pumpCount : 0);
    steps.push({ x0: px, x1: px, e0: elev, e1: elev + lift, p });
    elev += lift;
  });

  let d = `M${steps[0]!.x0.toFixed(1)},${y(steps[0]!.e0).toFixed(1)}`;
  steps.forEach((s, i) => {
    d += ` L${s.x0.toFixed(1)},${y(s.e0).toFixed(1)} L${s.x1.toFixed(1)},${y(s.e1).toFixed(1)}`;
    const next = steps[i + 1];
    if (next) d += ` L${next.x0.toFixed(1)},${y(s.e1).toFixed(1)}`;
  });

  return (
    <div className="elevprofile">
      <div className="ep-head">
        <strong>{system.name}</strong>
        <span>
          {system.miles} miles · {system.totalLiftApprox ? "≈" : ""}
          {system.totalLiftFt.toLocaleString()} ft total lift · {system.operator}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${system.name}: elevation along the route, with each pumping plant drawn as a vertical lift`}>
        <text x={M.l - 6} y={M.t - 10} className="cc-tick unit" style={{ textAnchor: "start" }}>
          {system.profileKind === "absolute" ? "elevation, ft" : "cumulative lift, ft"}
        </text>
        {[yMin, yMin + totalRise / 2, yMin + totalRise].map((e) => (
          <g key={e}>
            <line x1={M.l} x2={W - M.r} y1={y(e)} y2={y(e)} className="ep-grid" />
            <text x={M.l - 5} y={y(e) + 3} className="cc-tick" style={{ textAnchor: "end" }}>
              {Math.round(e).toLocaleString()}
            </text>
          </g>
        ))}
        <path d={d} className="ep-line" />
        {steps.filter((s) => s.e1 > s.e0).map((s) => (
          <g key={s.p.name}>
            <line x1={s.x0} x2={s.x1} y1={y(s.e0)} y2={y(s.e1)} className={`ep-lift${s.p.schematic ? " schematic" : ""}`} />
            <circle cx={s.x1} cy={y(s.e1)} r={2.4} className="ep-plant" />
          </g>
        ))}
        {steps.filter((s) => s.p.kind !== "pump" || !s.p.schematic || s.p.note).slice(0, 8).map((s, i) => (
          <text
            key={s.p.name}
            x={Math.min(Math.max(s.x1, M.l + 4), W - M.r - 4)}
            y={Math.max(y(s.e1) - 8 - (i % 3) * 11, M.t + 10)}
            className="ep-label"
            style={{ textAnchor: s.x1 > W * 0.75 ? "end" : "start" }}
          >
            {s.p.name.split(" (")[0]}
            {s.p.liftFt ? ` +${s.p.liftFt} ft` : ""}
          </text>
        ))}
        <text x={W - M.r} y={H - 8} className="cc-tick" style={{ textAnchor: "end" }}>
          mile {system.miles}
        </text>
        <text x={M.l} y={H - 8} className="cc-tick">mile 0</text>
      </svg>
      <p className="ep-narrative">{system.narrative} {system.powerNote}</p>
      <div className="chain-caveat" style={{ marginTop: 6 }}>Source: {system.source}.</div>
    </div>
  );
}
