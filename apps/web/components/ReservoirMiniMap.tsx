"use client";

/**
 * Where the savings accounts sit — the basin's major live-gauged
 * reservoirs on the watershed, circle AREA = water in storage right now
 * (the house rule for storage marks). Quiet and direct-labeled; the
 * interactive version with every layer is the basin map instrument.
 */

import { useEffect, useState } from "react";
import { geoArea, geoConicConformal, geoPath } from "d3-geo";
import { MAP_RESERVOIRS } from "@/lib/mapdata";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

const MAF = 1_000_000;

type GeoJson = GeoJSON.FeatureCollection | GeoJSON.Feature;

export function ReservoirMiniMap({
  storage,
}: {
  /** Live storage by reservoir id (acre-feet); missing = not drawn. */
  storage: Record<string, { af: number } | undefined>;
}) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();
  const [geo, setGeo] = useState<{ boundary: GeoJson; rivers: GeoJson } | null>(
    null,
  );

  useEffect(() => {
    Promise.all([
      fetch("/geo/basin_boundary.geojson").then((r) => r.json()),
      fetch("/geo/basin_rivers.geojson").then((r) => r.json()),
    ]).then(([boundary, rivers]) => {
      // Spherical-winding guard: ArcGIS rings wind opposite to d3-geo,
      // which otherwise treats the basin as its own inverse (the whole
      // globe minus the basin) and fitExtent collapses everything.
      for (const f of (boundary as GeoJSON.FeatureCollection).features) {
        if (geoArea(f) > 2 * Math.PI && f.geometry.type === "Polygon") {
          (f.geometry as GeoJSON.Polygon).coordinates.forEach((r) => r.reverse());
        }
      }
      setGeo({ boundary, rivers });
    });
  }, []);

  if (width === 0 || !geo) {
    return <div ref={ref} className="minimap" style={{ minHeight: 320 }} />;
  }

  const W = Math.min(width, 720);
  const H = Math.round(W * 0.92);
  const pad = 8;
  const projection = geoConicConformal()
    .parallels([32, 36])
    .rotate([113.5, 0])
    .fitExtent(
      [
        [pad, pad],
        [W - pad, H - pad],
      ],
      geo.boundary as GeoJSON.FeatureCollection,
    );
  const path = geoPath(projection);

  const live = MAP_RESERVOIRS.filter((r) => storage[r.id]?.af);
  // Circle area proportional to storage; Powell anchors the scale.
  const maxAf = Math.max(...live.map((r) => storage[r.id]!.af));
  const maxR = W * 0.055;
  const radius = (af: number) => Math.max(3, maxR * Math.sqrt(af / maxAf));
  // Direct labels for the biggest holdings only; the rest stay quiet dots.
  const narrow = W < 520;
  const top = [...live].sort(
    (a, b) => storage[b.id]!.af - storage[a.id]!.af,
  );
  // Narrow screens: the center is too crowded for in-map labels — the
  // biggest holdings go in the caption instead.
  const labeled = new Set(narrow ? [] : top.slice(0, 5).map((r) => r.id));

  return (
    <div ref={ref} className="minimap">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="The basin's major reservoirs, circle area showing live storage">
        <path d={path(geo.boundary as never) ?? undefined} className="mm-basin" />
        <path d={path(geo.rivers as never) ?? undefined} className="mm-river" />
        {live.map((r) => {
          const p = projection([r.lon, r.lat]);
          if (!p) return null;
          const [x, y] = p;
          const rad = radius(storage[r.id]!.af);
          const name = labeled.has(r.id);
          return (
            <g key={r.id}>
              <circle cx={x} cy={y} r={rad} className="mm-res" />
              {name &&
                (() => {
                  // Powell sits mid-basin with neighbors east — label below.
                  // Mead hugs the left edge: label left on wide screens,
                  // below (clamped inside the frame) on narrow ones.
                  const below =
                    r.id === "powell" || (narrow && r.id === "mead");
                  const lx = below
                    ? Math.max(64, x)
                    : r.id === "mead"
                      ? x - rad - 5
                      : x + rad + 5;
                  const ly = below ? y + rad + 15 : y + 3.5;
                  const anchor = below
                    ? "middle"
                    : r.id === "mead"
                      ? "end"
                      : undefined;
                  return (
                    <text x={lx} y={ly} className="mm-label"
                      style={anchor ? { textAnchor: anchor } : undefined}>
                      {r.name} · {(storage[r.id]!.af / MAF).toFixed(1)}M
                    </text>
                  );
                })()}
            </g>
          );
        })}
      </svg>
      <div className="cc-readout">
        {narrow && (
          <>
            {top
              .slice(0, 3)
              .map(
                (r) =>
                  `${r.name} ${(storage[r.id]!.af / MAF).toFixed(1)}M`,
              )
              .join(" · ")}
            {". "}
          </>
        )}
        Circle area = acre-feet in storage now (live, provisional). The full
        interactive map, with every layer, is in Explore.
      </div>
    </div>
  );
}
