"use client";

/**
 * Where the water is taken — county irrigation withdrawals (USGS 2015,
 * the last county-by-county census of water use) as tappable circles on
 * the watershed, over state lines and quiet county lines. Geography only:
 * WITHDRAWALS are a different accounting from the consumptive-use totals
 * above and are never summed with them — stated in the caption and on
 * every tap card. Cards reuse the basin map's county sheet verbatim.
 */

import { useEffect, useState } from "react";
import { geoArea, geoConicConformal, geoContains, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { acreFeet, HOUSEHOLD_ACRE_FEET_PER_YEAR } from "@/lib/format";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";
import { DetailSheet, type SheetData } from "./DetailSheet";

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

const AF_PER_MGD_YEAR = 1121;

function households(af: number): string {
  const n = af / HOUSEHOLD_ACRE_FEET_PER_YEAR;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} million households for a year`;
  if (n >= 1_000) return `${Math.round(n / 1000).toLocaleString()},000 households for a year`;
  return `${Math.round(n).toLocaleString()} households for a year`;
}

export function ConsumptionMiniMap() {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [data, setData] = useState<{
    boundary: GeoJson;
    rivers: GeoJson;
    states: GeoJSON.FeatureCollection;
    countyLines: GeoJSON.FeatureCollection;
    counties: County[];
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/geo/basin_boundary.geojson").then((r) => r.json()),
      fetch("/geo/basin_rivers.geojson").then((r) => r.json()),
      fetch("/geo/states-10m.json").then((r) => r.json()),
      fetch("/geo/basin_counties.geojson").then((r) => r.json()),
      fetch("/geo/county_wateruse.json").then((r) => r.json()),
    ]).then(([boundary, rivers, topo, countyLines, wu]) => {
      // Spherical-winding guard: ArcGIS rings wind opposite to d3-geo.
      for (const f of (boundary as GeoJSON.FeatureCollection).features) {
        if (geoArea(f) > 2 * Math.PI && f.geometry.type === "Polygon") {
          (f.geometry as GeoJSON.Polygon).coordinates.forEach((r) => r.reverse());
        }
      }
      const t = topo as Parameters<typeof feature>[0] & {
        objects: { states: Parameters<typeof feature>[1] };
      };
      const states = feature(t, t.objects.states) as unknown as GeoJSON.FeatureCollection;
      setData({ boundary, rivers, states, countyLines, counties: wu.counties });
    });
  }, []);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheet(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

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

  const ranked = [...withIr].sort((a, b) => b.ir - a.ir);
  const irRank = new Map(ranked.map((c, i) => [c.fips, i + 1]));

  const narrow = W < 520;
  const top = ranked.filter((c) => solid.get(c.fips));
  const labeled = new Set(narrow ? [] : top.slice(0, 4).map((c) => c.fips));

  const openCounty = (c: County) => {
    const afy = c.ir * AF_PER_MGD_YEAR;
    const isSolid = solid.get(c.fips);
    setSheet({
      kicker: "County irrigation",
      title: `${c.name} County, ${c.st}`,
      fact: `Farms here withdrew about ${acreFeet(afy)} a year — enough water for ${households(afy)}.`,
      detail:
        (isSolid
          ? CANAL_SERVED.has(c.fips)
            ? "Outside the topographic watershed but served by its canals (the All-American system). "
            : "Inside the Colorado River watershed. "
          : "Outside the watershed — this county irrigates with other rivers' water; it is drawn faded for context. ") +
        "Withdrawals from all water sources, not only the Colorado River — and more than crops actually consume, since some returns to rivers and aquifers.",
      chips: ["mgd", "irrigation_withdrawal", "withdrawal", "consumptive_use", "census_2015"],
      compare: [
        `#${irRank.get(c.fips) ?? "—"} of ${irRank.size} counties in the seven basin states`,
      ],
      source: "USGS county water-use census (Dieter et al. 2018)",
      clock: "census",
      clockLabel: "2015 CENSUS · last full county count",
    });
  };

  return (
    <div ref={ref} className="minimap">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="County irrigation withdrawals across the region, circle area showing volume; tap a county for detail">
        <path d={path(data.states as never) ?? undefined} className="mm-state" />
        <path d={path(data.countyLines as never) ?? undefined} className="mm-countyline" />
        <path d={path(data.boundary as never) ?? undefined} className="mm-basin" />
        <path d={path(data.rivers as never) ?? undefined} className="mm-river" />
        {withIr.map((c) => {
          const p = projection([c.lon, c.lat]);
          if (!p) return null;
          const [x, y] = p;
          if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return null;
          const rad = radius(c.ir);
          return (
            <g key={c.fips} className="tappable" onClick={() => openCounty(c)}>
              <circle cx={x} cy={y} r={Math.max(rad, 7)} fill="transparent" />
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
        the Central Valley among them. Tap any county for detail &amp; source.
      </div>
      <DetailSheet data={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}
