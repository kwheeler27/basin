"use client";

/**
 * Where the water is taken — county irrigation withdrawals (USGS 2015,
 * the last county-by-county census of water use) as circles on the
 * watershed. Geography only: WITHDRAWALS are a different accounting from
 * the consumptive-use totals above and are never summed with them —
 * stated in the caption. True-pixel responsive; quiet and non-interactive
 * (the tappable version is the basin map's Irrigation layer).
 */

import { useEffect, useState } from "react";
import { geoArea, geoConicConformal, geoContains, geoPath } from "d3-geo";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

type GeoJson = GeoJSON.FeatureCollection | GeoJSON.Feature;

interface County {
  fips: string;
  name: string;
  st: string;
  /** Irrigation withdrawals, Mgal/d (USGS 2015). */
  ir: number;
  lon: number;
  lat: number;
}

export function ConsumptionMiniMap() {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();
  const [data, setData] = useState<{
    boundary: GeoJson;
    rivers: GeoJson;
    counties: County[];
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/geo/basin_boundary.geojson").then((r) => r.json()),
      fetch("/geo/basin_rivers.geojson").then((r) => r.json()),
      fetch("/geo/county_wateruse.json").then((r) => r.json()),
    ]).then(([boundary, rivers, wu]) => {
      // Spherical-winding guard: ArcGIS rings wind opposite to d3-geo.
      for (const f of (boundary as GeoJSON.FeatureCollection).features) {
        if (geoArea(f) > 2 * Math.PI && f.geometry.type === "Polygon") {
          (f.geometry as GeoJSON.Polygon).coordinates.forEach((r) => r.reverse());
        }
      }
      setData({ boundary, rivers, counties: wu.counties });
    });
  }, []);

  if (width === 0 || !data) {
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
      data.boundary as GeoJSON.FeatureCollection,
    );
  const path = geoPath(projection);

  const withIr = data.counties.filter((c) => c.ir > 0);
  const maxIr = Math.max(...withIr.map((c) => c.ir));
  const maxR = W * 0.045;
  const radius = (ir: number) => Math.max(1.5, maxR * Math.sqrt(ir / maxIr));

  // Solid: inside the watershed, or outside it but served by its canals
  // (Imperial and Coachella valleys — the All-American system). Everything
  // else fades to context: those counties irrigate with other water.
  const CANAL_SERVED = new Set(["06025", "06065"]);
  const inBasin = (c: County) =>
    CANAL_SERVED.has(c.fips) ||
    (data.boundary as GeoJSON.FeatureCollection).features.some((f) =>
      geoContains(f, [c.lon, c.lat]),
    );
  const solid = new Map(withIr.map((c) => [c.fips, inBasin(c)]));

  const narrow = W < 520;
  const top = [...withIr]
    .filter((c) => solid.get(c.fips))
    .sort((a, b) => b.ir - a.ir);
  const labeled = new Set(narrow ? [] : top.slice(0, 4).map((c) => c.fips));

  return (
    <div ref={ref} className="minimap">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="County irrigation withdrawals across the region, circle area showing volume">
        <path d={path(data.boundary as never) ?? undefined} className="mm-basin" />
        <path d={path(data.rivers as never) ?? undefined} className="mm-river" />
        {withIr.map((c) => {
          const p = projection([c.lon, c.lat]);
          if (!p) return null;
          const [x, y] = p;
          if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return null;
          const rad = radius(c.ir);
          return (
            <g key={c.fips}>
              <circle cx={x} cy={y} r={rad}
                className={solid.get(c.fips) ? "mm-farm" : "mm-farm-out"} />
              {labeled.has(c.fips) && (
                <text
                  x={c.st === "CA" ? x - rad - 4 : x + rad + 4}
                  y={y + 3.5}
                  className="mm-label"
                  style={c.st === "CA" ? { textAnchor: "end" } : undefined}
                >
                  {c.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="cc-readout">
        {narrow && (
          <>
            Largest: {top.slice(0, 3).map((c) => `${c.name} (${c.st})`).join(" · ")}
            {". "}
          </>
        )}
        Circle area = county irrigation withdrawals, USGS 2015 — where
        water is taken, which is not the same accounting as consumptive use
        above. Solid: inside the watershed or served by its canals
        (Imperial, Coachella). Faded: neighboring counties on other water —
        the Central Valley among them.
      </div>
    </div>
  );
}
