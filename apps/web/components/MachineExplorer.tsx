"use client";

/**
 * The machine, mapped and measured — linked views for the Infrastructure
 * tab. Left/top: the two flagship aqueducts on the land, every pumping
 * plant a mark on its route (positions derived by milepost along the drawn
 * line; CAP's line is operator geometry). Below: the elevation staircases.
 * Selecting a plant in either view highlights it in both — geography and
 * elevation as one instrument.
 */

import { useMemo, useState } from "react";
import { geoConicConformal, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import statesTopo from "@/public/geo/states-10m.json";
import capCanal from "@/public/geo/cap_canal.json";
import { MAP_CONVEYANCE } from "@/lib/mapdata";
import { acreFeet, HOUSEHOLD_ACRE_FEET_PER_YEAR } from "@/lib/format";
import { SYSTEM_PROFILES, routeFraction } from "@/lib/infrastructure";
import { ElevationProfile } from "@/components/ElevationProfile";

const W = 860;
const H = 420;
const WEST = new Set(["04", "06", "32"]); // AZ, CA, NV frame

/** Point at fraction t along a polyline (in projected px space). */
function alongLine(pts: [number, number][], t: number): [number, number] {
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
    segs.push(d);
    total += d;
  }
  let target = t * total;
  for (let i = 1; i < pts.length; i++) {
    if (target <= segs[i - 1]!) {
      const f = segs[i - 1]! ? target / segs[i - 1]! : 0;
      return [
        pts[i - 1]![0] + (pts[i]![0] - pts[i - 1]![0]) * f,
        pts[i - 1]![1] + (pts[i]![1] - pts[i - 1]![1]) * f,
      ];
    }
    target -= segs[i - 1]!;
  }
  return pts[pts.length - 1]!;
}

export function MachineExplorer() {
  const [selected, setSelected] = useState<string | null>(null);

  // CAP's published geometry arrives as unordered segments — chain them
  // greedily from the Lake Havasu end so distance-along-route is real.
  const capChain = useMemo(() => {
    const segs: [number, number][][] = [];
    for (const f of (capCanal as unknown as GeoJSON.FeatureCollection).features) {
      const g = f.geometry;
      const lines = g.type === "MultiLineString" ? g.coordinates : g.type === "LineString" ? [g.coordinates] : [];
      for (const line of lines) segs.push(line.map((c) => [c[0]!, c[1]!] as [number, number]));
    }
    const chain: [number, number][] = [];
    let cursor: [number, number] = [-114.14, 34.3]; // Havasu intake
    const pool = [...segs];
    while (pool.length) {
      let best = 0, flip = false, bd = Infinity;
      pool.forEach((seg, i) => {
        const d0 = Math.hypot(seg[0]![0] - cursor[0], seg[0]![1] - cursor[1]);
        const d1 = Math.hypot(seg[seg.length - 1]![0] - cursor[0], seg[seg.length - 1]![1] - cursor[1]);
        if (d0 < bd) { bd = d0; best = i; flip = false; }
        if (d1 < bd) { bd = d1; best = i; flip = true; }
      });
      const seg = pool.splice(best, 1)[0]!;
      const ordered = flip ? [...seg].reverse() : seg;
      chain.push(...ordered);
      cursor = chain[chain.length - 1]!;
    }
    return chain;
  }, []);

  const { path, states, project } = useMemo(() => {
    const t = statesTopo as unknown as Parameters<typeof feature>[0] & {
      objects: { states: Parameters<typeof feature>[1] };
    };
    const all = feature(t, t.objects.states) as unknown as GeoJSON.FeatureCollection;
    const west = all.features.filter((f) => WEST.has(String(f.id).padStart(2, "0")));
    const cra = MAP_CONVEYANCE.find((c) => c.id === "cra")!;
    const routesFc = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: capChain } },
        { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: cra.path.map((p) => [p[0], p[1]]) } },
      ],
    } as GeoJSON.FeatureCollection;
    const projection = geoConicConformal()
      .parallels([32, 36])
      .rotate([113.5, 0])
      .fitExtent([[30, 26], [W - 30, H - 26]], routesFc);
    return {
      path: geoPath(projection),
      states: west,
      project: (lon: number, lat: number) => projection([lon, lat]) ?? [0, 0],
    };
  }, [capChain]);

  // Route polylines in projected space: CAP from operator geometry
  // (segments stitched nose-to-tail), CRA from its schematic waypoints.
  const routes = useMemo(() => {
    const capSchematic = MAP_CONVEYANCE.find((c) => c.id === "cap")!;
    const capPts = capSchematic.path.map((p) => project(p[0], p[1]) as [number, number]);
    const cra = MAP_CONVEYANCE.find((c) => c.id === "cra")!;
    const craPts = cra.path.map((p) => project(p[0], p[1]) as [number, number]);
    const capReal = capChain.map((c) => project(c[0], c[1]) as [number, number]);
    return { cap: capPts, cra: craPts, capReal };
  }, [capChain, project]);

  /** Snap a point to the nearest vertex of the drawn (real) line. */
  const snap = (pt: [number, number], verts: [number, number][]): [number, number] => {
    let best = pt, bd = Infinity;
    for (const v of verts) {
      const d = Math.hypot(v[0] - pt[0], v[1] - pt[1]);
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  };

  return (
    <div className="machine">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The two flagship aqueducts on the land, with every pumping plant marked along its route">
        {states.map((f) => (
          <path key={String(f.id)} d={path(f) ?? undefined} className="rm-state" />
        ))}
        {states.map((f) => (
          <path key={`o${String(f.id)}`} d={path(f) ?? undefined} className="rm-state-line" />
        ))}
        {SYSTEM_PROFILES.map((sys) => {
          const pts = routes[sys.id as "cap" | "cra"];
          const d = "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L");
          const conveyance = MAP_CONVEYANCE.find((c) => c.id === sys.id);
          const af = conveyance?.approxAfPerYear;
          const wRoute = af ? Math.max(2, 1.6 * Math.sqrt(af / 500_000)) : 2;
          const sysSelected = sys.points.some((pt) => pt.name === selected);
          // direction arrows: small chevrons at fractions along the route
          const arrows = [0.18, 0.42, 0.66, 0.88].map((t) => {
            const [ax, ay] = alongLine(pts, t);
            const [bx, by] = alongLine(pts, Math.min(1, t + 0.015));
            const ang = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
            return { ax, ay, ang };
          });
          return (
            <g key={sys.id}>
              {sys.id === "cap" ? (
                <>
                  {(capCanal as unknown as GeoJSON.FeatureCollection).features.map((f, fi) => (
                    <path key={fi} d={path(f) ?? undefined} className={`mx-route${sysSelected ? " flowing" : ""}`} style={{ strokeWidth: wRoute }} pathLength={1} />
                  ))}
                  <path d={d} className="mx-carrier" />
                </>
              ) : (
                <path d={d} className={`mx-route${sysSelected ? " flowing" : ""}`} style={{ strokeWidth: wRoute }} pathLength={1} />
              )}
              {arrows.map((a, i) => (
                <path
                  key={i}
                  d="M-4,-3 L3,0 L-4,3"
                  className="mx-arrow"
                  transform={`translate(${a.ax.toFixed(1)},${a.ay.toFixed(1)}) rotate(${a.ang.toFixed(1)})`}
                />
              ))}
              {sys.points.map((pt) => {
                let [x, y] = alongLine(pts, routeFraction(pt, sys.miles));
                if (sys.id === "cap") [x, y] = snap([x, y], routes.capReal);
                const on = selected === pt.name;
                const isPlant = pt.kind === "pump" || pt.kind === "intake";
                return (
                  <g key={pt.name} className="tappable" onClick={() => setSelected(on ? null : pt.name)}>
                    <circle cx={x} cy={y} r={9} fill="transparent" />
                    <circle
                      cx={x}
                      cy={y}
                      r={on ? 5 : isPlant ? 3 : 2.2}
                      className={`mx-plant${on ? " on" : ""}${isPlant ? "" : " minor"}${pt.schematic ? " schematic" : ""}`}
                    />
                    {(on || pt.kind === "intake" || pt.kind === "terminus") && (
                      <text
                        x={(sys.id === "cra" && x > 150) || x > W - 110 ? x - 7 : x + 7}
                        y={Math.max(y - 6, 14)}
                        className="mx-label"
                        style={{ textAnchor: (sys.id === "cra" && x > 150) || x > W - 110 ? "end" : "start" }}
                      >
                        {pt.name.split(" (")[0]}
                        {on && pt.liftFt ? ` +${pt.liftFt} ft` : ""}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
        <text x={12} y={H - 10} className="cc-tick">
          Line width: CY2025 accounted volume. Arrows: direction of flow. Plant positions by milepost (CAP line: operator geometry). Tap a plant here or on a staircase below.
        </text>
      </svg>
      <div className="mx-scale">
        {SYSTEM_PROFILES.map((sys) => {
          const af = MAP_CONVEYANCE.find((c) => c.id === sys.id)?.approxAfPerYear;
          return (
            <span key={sys.id} className="mx-scale-item">
              <strong>{sys.name}</strong>: {af ? `${acreFeet(af)} moved in 2025 — a year of water for ~${(af / HOUSEHOLD_ACRE_FEET_PER_YEAR / 1e6).toFixed(1)}M households` : ""}, lifted {sys.totalLiftApprox ? "≈" : ""}{sys.totalLiftFt.toLocaleString()} ft by {sys.points.filter((p) => p.kind === "pump" || p.kind === "intake").length} plants.{" "}
              {sys.powerNote}
            </span>
          );
        })}
      </div>
      {SYSTEM_PROFILES.map((s) => (
        <ElevationProfile key={s.id} system={s} selected={selected} onSelect={setSelected} />
      ))}
    </div>
  );
}
