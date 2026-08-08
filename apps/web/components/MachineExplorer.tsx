"use client";

/**
 * The machine, one system at a time — v3 after Kevin's readability review.
 * Pick a system; its route fills a zoomable map (wheel/drag + buttons),
 * every plant hoverable and tappable (DetailSheet card); below, the
 * land-vs-machine elevation profile, selection-linked both ways.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { geoConicConformal, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import statesTopo from "@/public/geo/states-10m.json";
import capCanal from "@/public/geo/cap_canal.json";
import routeElev from "@/public/geo/route_elevations.json";
import { MAP_CONVEYANCE } from "@/lib/mapdata";
import { acreFeet, HOUSEHOLD_ACRE_FEET_PER_YEAR } from "@/lib/format";
import { SYSTEM_PROFILES, routeFraction, type ProfilePoint } from "@/lib/infrastructure";
import { ElevationProfile, type TerrainSample } from "@/components/ElevationProfile";
import { DetailSheet, type SheetData } from "@/components/DetailSheet";

const W = 860;
const H = 430;

/** Interpolate along raw lon/lat waypoints (same math as the elevation bake). */
function alongGeo(path: readonly (readonly [number, number])[], t: number): [number, number] {
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const d = Math.hypot(path[i]![0] - path[i - 1]![0], path[i]![1] - path[i - 1]![1]);
    segs.push(d); total += d;
  }
  let target = (Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0) * total;
  for (let i = 1; i < path.length; i++) {
    if (target <= segs[i - 1]!) {
      const f = segs[i - 1]! ? target / segs[i - 1]! : 0;
      return [path[i - 1]![0] + (path[i]![0] - path[i - 1]![0]) * f, path[i - 1]![1] + (path[i]![1] - path[i - 1]![1]) * f];
    }
    target -= segs[i - 1]!;
  }
  return [path[path.length - 1]![0], path[path.length - 1]![1]];
}

function alongLine(pts: [number, number][], t: number): [number, number] {
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
    segs.push(d); total += d;
  }
  let target = t * total;
  for (let i = 1; i < pts.length; i++) {
    if (target <= segs[i - 1]!) {
      const f = segs[i - 1]! ? target / segs[i - 1]! : 0;
      return [pts[i - 1]![0] + (pts[i]![0] - pts[i - 1]![0]) * f, pts[i - 1]![1] + (pts[i]![1] - pts[i - 1]![1]) * f];
    }
    target -= segs[i - 1]!;
  }
  return pts[pts.length - 1]!;
}

export function MachineExplorer() {
  const [sysId, setSysId] = useState<"cap" | "cra">("cap");
  // Marks render client-only: an SSR/hydration mismatch left stale
  // server-computed positions in the DOM (root cause note in PR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [selected, setSelected] = useState<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; title: string; line: string } | null>(null);
  const [sheet, setSheet] = useState<SheetData | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const system = SYSTEM_PROFILES.find((s) => s.id === sysId)!;
  const conveyance = MAP_CONVEYANCE.find((c) => c.id === sysId);
  const terrain = (routeElev as unknown as { routes: Record<string, { samples: TerrainSample[] }> }).routes[sysId]!.samples;

  const { path, states, project } = useMemo(() => {
    const t = statesTopo as unknown as Parameters<typeof feature>[0] & { objects: { states: Parameters<typeof feature>[1] } };
    const all = feature(t, t.objects.states) as unknown as GeoJSON.FeatureCollection;
    const west = all.features.filter((f) => ["04", "06", "32"].includes(String(f.id).padStart(2, "0")));
    const sched = MAP_CONVEYANCE.find((c) => c.id === sysId)!;
    const routeFc = {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: sched.path.map((p) => [p[0], p[1]]) } }],
    } as GeoJSON.FeatureCollection;
    const projection = geoConicConformal().parallels([32, 36]).rotate([113.5, 0])
      .fitExtent([[46, 34], [W - 46, H - 34]], routeFc);
    return { path: geoPath(projection), states: west, project: (lon: number, lat: number) => projection([lon, lat]) ?? [0, 0] };
  }, [sysId]);

  const carrier = useMemo(() => {
    const sched = MAP_CONVEYANCE.find((c) => c.id === sysId)!;
    return sched.path.map((p) => project(p[0], p[1]) as [number, number]);
  }, [sysId, project]);

  const capRealPts = useMemo(() => {
    if (sysId !== "cap") return null;
    const pts: [number, number][] = [];
    for (const f of (capCanal as unknown as GeoJSON.FeatureCollection).features) {
      const g = f.geometry;
      const lines = g.type === "MultiLineString" ? g.coordinates : g.type === "LineString" ? [g.coordinates] : [];
      for (const l of lines) for (const c of l) pts.push(project(c[0]!, c[1]!) as [number, number]);
    }
    return pts;
  }, [sysId, project]);

  // zoom behavior (hero pattern)
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = select(svgRef.current);
    const g = select(gRef.current);
    const z = zoom<SVGSVGElement, unknown>().scaleExtent([1, 10])
      .translateExtent([[0, 0], [W, H]])
      .on("zoom", (e) => g.attr("transform", e.transform.toString()));
    svg.call(z);
    zoomRef.current = z;
    return () => { svg.on(".zoom", null); };
  }, [sysId]);
  const zoomBy = (f: number) => { if (svgRef.current && zoomRef.current) zoomRef.current.scaleBy(select(svgRef.current), f); };
  const resetZoom = () => { if (svgRef.current && zoomRef.current) zoomRef.current.transform(select(svgRef.current), zoomIdentity); };

  const openPlant = (pt: ProfilePoint) => {
    setSelected(pt.name);
    setSheet({
      kicker: pt.kind === "pump" ? "Pumping plant" : pt.kind === "intake" ? "Intake" : "Terminus",
      title: pt.name,
      fact: pt.liftFt
        ? `Lifts the water ${pt.liftFt} ft${pt.toElevFt ? ` to ${pt.toElevFt.toLocaleString()} ft above sea level` : ""} — around mile ${pt.mile} of ${system.miles}.`
        : `Around mile ${pt.mile} of the ${system.miles}-mile route.`,
      detail: [pt.note, pt.schematic ? "Position/lift shown schematically — not individually published by the operator." : null]
        .filter(Boolean).join(" "),
      chips: ["aqueduct", "acre_foot"],
      source: system.source,
      clock: "annual",
      clockLabel: "OPERATOR SPEC",
    });
  };

  const showPlantTip = (e: React.MouseEvent, pt: ProfilePoint) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({
      x: e.clientX - rect.left, y: e.clientY - rect.top, title: pt.name,
      line: pt.liftFt ? `+${pt.liftFt} ft lift — tap for detail` : "Tap for detail",
    });
  };

  const af = conveyance?.approxAfPerYear;
  const plantCount = system.points.filter((p) => p.kind === "pump" || p.kind === "intake").length;

  return (
    <div className="machine">
      <div className="story-layerbar rights-layerbar" role="radiogroup" aria-label="System">
        {SYSTEM_PROFILES.map((s) => (
          <button key={s.id} className={`story-radio${sysId === s.id ? " on" : ""}`} aria-pressed={sysId === s.id}
            onClick={() => { setSysId(s.id as "cap" | "cra"); setSelected(null); setSheet(null); resetZoom(); }}>
            {s.name}
          </button>
        ))}
      </div>
      <p className="mx-scale-item" style={{ padding: "0 4px 10px" }}>
        {af ? <><strong>{acreFeet(af)}</strong> moved in 2025 — a year of water for ~{(af / HOUSEHOLD_ACRE_FEET_PER_YEAR / 1e6).toFixed(1)} million households — </> : ""}
        lifted {system.totalLiftApprox ? "≈" : ""}{system.totalLiftFt.toLocaleString()} ft by {plantCount} plants over {system.miles} miles. {system.powerNote}
      </p>
      <div className="mx-wrap" ref={wrapRef}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" className="explorable"
          aria-label={`${system.name} route with every pumping plant — zoom and tap for detail`}>
          <g ref={gRef}>
            {states.map((f) => <path key={String(f.id)} d={path(f) ?? undefined} className="rm-state" />)}
            {states.map((f) => <path key={`o${String(f.id)}`} d={path(f) ?? undefined} className="rm-state-line" />)}
            {sysId === "cap"
              ? (capCanal as unknown as GeoJSON.FeatureCollection).features.map((f, i) => (
                  <path key={i} d={path(f) ?? undefined} className="mx-route" style={{ strokeWidth: 2.6 }} />
                ))
              : <path d={"M" + carrier.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L")} className="mx-route" style={{ strokeWidth: 2.6 }} />}
            {mounted && [0.25, 0.55, 0.85].map((t) => {
              const [ax, ay] = alongLine(carrier, t);
              const [bx, by] = alongLine(carrier, Math.min(1, t + 0.02));
              const ang = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
              return <path key={t} d="M-5,-3.5 L4,0 L-5,3.5" className="mx-arrow" transform={`translate(${ax.toFixed(1)},${ay.toFixed(1)}) rotate(${ang.toFixed(1)})`} />;
            })}
            {mounted && system.points.map((pt) => {
              const sched = MAP_CONVEYANCE.find((c) => c.id === sysId)!;
              const [plon, plat] = alongGeo(sched.path, routeFraction(pt, system.miles));
              let [px, py] = project(plon, plat) as [number, number];
              if (capRealPts) {
                let bx = px, by = py, bd = Infinity;
                for (const v of capRealPts) { const d = Math.hypot(v[0] - px, v[1] - py); if (d < bd) { bd = d; bx = v[0]; by = v[1]; } }
                px = bx; py = by;
              }
              const on = selected === pt.name;
              return (
                <g key={pt.name} className="tappable"
                  onClick={() => openPlant(pt)}
                  onMouseMove={(e) => showPlantTip(e, pt)}
                  onMouseLeave={() => setTip(null)}>
                  <circle cx={px} cy={py} r={10} fill="transparent" />
                  <circle cx={px} cy={py} r={on ? 6 : 4} className={`mx-plant${on ? " on" : ""}${pt.schematic ? " schematic" : ""}`} />
                  {(on || pt.kind !== "pump") && (
                    <text x={px > W - 130 ? px - 8 : px + 8} y={py - 7} className="mx-label"
                      style={px > W - 130 ? { textAnchor: "end" } : undefined}>
                      {pt.name.split(" (")[0]}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        <div className="story-zoom mx-zoom">
          <button onClick={() => zoomBy(1.6)} aria-label="Zoom in">+</button>
          <button onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out">−</button>
          <button onClick={resetZoom} aria-label="Reset">⌂</button>
        </div>
        {tip && (
          <div className="story-tip" style={{ left: Math.min(tip.x + 14, 620), top: tip.y + 14 }}>
            <strong>{tip.title}</strong>
            <div>{tip.line}</div>
          </div>
        )}
        <DetailSheet data={sheet} onClose={() => { setSheet(null); setSelected(null); }} />
      </div>
      <ElevationProfile system={system} terrain={terrain} selected={selected}
        onSelect={(name) => {
          const pt = system.points.find((p) => p.name === name);
          if (pt) openPlant(pt); else { setSelected(null); setSheet(null); }
        }} />
    </div>
  );
}
