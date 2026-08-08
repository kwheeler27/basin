"use client";

import type { SystemProfile } from "@/lib/infrastructure";

/**
 * The land vs the machine: real ground elevation along the corridor (USGS
 * 3DEP samples, filled gray) with the water's engineered path over it.
 * CRA draws its published water grade as steps — where the water line runs
 * beneath the ground, the aqueduct is in tunnel or siphon. CAP marks its
 * plants on the terrain (per-plant grades unpublished; total lift stated).
 */

export interface TerrainSample { mile: number; elevFt: number | null }

const W = 720;
const H = 260;
const M = { t: 30, r: 16, b: 34, l: 48 };

export function ElevationProfile({
  system,
  terrain,
  selected,
  onSelect,
}: {
  system: SystemProfile;
  terrain: TerrainSample[];
  selected?: string | null;
  onSelect?: (name: string | null) => void;
}) {
  const pts = system.points;
  const x = (mile: number) => M.l + (mile / system.miles) * (W - M.l - M.r);

  const tVals = terrain.map((t) => t.elevFt).filter((v): v is number => v !== null);
  const isAbs = system.profileKind === "absolute";

  // Water steps (absolute systems only)
  let elev = system.startElevFt ?? 0;
  const steps = pts.map((p) => {
    const s = { x: x(p.mile), e0: elev, e1: elev + (p.liftFt ?? 0), p };
    elev = s.e1;
    return s;
  });

  const yMin = Math.min(...tVals, isAbs ? (system.startElevFt ?? 1e9) : 1e9) - 60;
  const yMax = Math.max(...tVals, isAbs ? elev : 0) * 1.03;
  const y = (e: number) => H - M.b - ((e - yMin) / (yMax - yMin)) * (H - M.t - M.b);

  const ground =
    `M${x(terrain[0]!.mile)},${y(terrain[0]!.elevFt ?? yMin)} ` +
    terrain.filter((t) => t.elevFt !== null).map((t) => `L${x(t.mile).toFixed(1)},${y(t.elevFt!).toFixed(1)}`).join(" ") +
    ` L${x(system.miles)},${H - M.b} L${x(0)},${H - M.b} Z`;

  let waterD = "";
  if (isAbs) {
    waterD = `M${steps[0]!.x.toFixed(1)},${y(steps[0]!.e0).toFixed(1)}`;
    steps.forEach((s, i) => {
      waterD += ` L${s.x.toFixed(1)},${y(s.e0).toFixed(1)} L${s.x.toFixed(1)},${y(s.e1).toFixed(1)}`;
      const next = steps[i + 1];
      if (next) waterD += ` L${next.x.toFixed(1)},${y(s.e1).toFixed(1)}`;
    });
  }

  /** Nearest terrain elevation to a milepost (for schematic plant markers). */
  const groundAt = (mile: number): number => {
    const valid = terrain.filter((t) => t.elevFt !== null);
    let best = valid[0]!;
    for (const t of valid) if (Math.abs(t.mile - mile) < Math.abs(best.mile - mile)) best = t;
    return best.elevFt!;
  };

  return (
    <div className="elevprofile">
      <div className="ep-head">
        <strong>The land it crosses — and the {isAbs ? "water's path over it" : "plants that push water up it"}</strong>
        <span>
          {system.miles} miles · {system.totalLiftApprox ? "≈" : ""}{system.totalLiftFt.toLocaleString()} ft total lift
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${system.name}: ground elevation along the route with the water's lifted path`}>
        {[Math.round(yMin + 60), Math.round((yMin + yMax) / 2), Math.round(yMax / 1.03)].map((e) => (
          <g key={e}>
            <line x1={M.l} x2={W - M.r} y1={y(e)} y2={y(e)} className="ep-grid" />
            <text x={M.l - 5} y={y(e) + 3} className="cc-tick" style={{ textAnchor: "end" }}>{e.toLocaleString()}</text>
          </g>
        ))}
        <text x={M.l - 6} y={M.t - 12} className="cc-tick unit" style={{ textAnchor: "start" }}>elevation, ft</text>
        <path d={ground} className="ep-ground" />
        {isAbs && <path d={waterD} className="ep-line" />}
        {steps.filter((s) => (isAbs ? s.e1 > s.e0 : s.p.kind === "pump" || s.p.kind === "intake")).map((s) => {
          const on = selected === s.p.name;
          const py = isAbs ? y(s.e1) : y(groundAt(s.p.mile));
          return (
            <g key={s.p.name} className="tappable" onClick={onSelect ? () => onSelect(on ? null : s.p.name) : undefined}>
              <circle cx={s.x} cy={py} r={9} fill="transparent" />
              {isAbs && <line x1={s.x} x2={s.x} y1={y(s.e0)} y2={y(s.e1)} className={`ep-lift${s.p.schematic ? " schematic" : ""}${on ? " on" : ""}`} />}
              <circle cx={s.x} cy={py} r={on ? 4.5 : 2.6} className={`ep-plant${on ? " on" : ""}`} />
              {(on || (isAbs && s.p.liftFt && s.p.liftFt > 280)) && (
                <text x={Math.min(s.x + 5, W - 95)} y={Math.max(py - 9, 14)} className="ep-label">
                  {s.p.name.split(" (")[0]}{s.p.liftFt ? ` +${s.p.liftFt} ft` : ""}
                </text>
              )}
            </g>
          );
        })}
        {isAbs && (
          <text x={x(150)} y={y(1500)} className="ep-note">
            water line below ground = tunnel or siphon
          </text>
        )}
        <text x={M.l} y={H - 8} className="cc-tick">mile 0</text>
        <text x={W - M.r} y={H - 8} className="cc-tick" style={{ textAnchor: "end" }}>mile {system.miles}</text>
      </svg>
      <p className="ep-narrative">{system.narrative} {system.powerNote}</p>
      <div className="chain-caveat" style={{ marginTop: 6 }}>
        Ground: USGS 3DEP along the schematic corridor. Machine: {system.source}.
      </div>
    </div>
  );
}
