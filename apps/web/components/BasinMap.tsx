"use client";

/**
 * The plumbing of the Colorado — an interactive, zoomable geographic map.
 *
 * Real geometry: state boundaries (US Census via us-atlas) and river
 * centerlines (Natural Earth). Hand-placed: reservoir points and aqueduct
 * paths — aqueducts are schematic straight runs between real endpoints and
 * are labeled as such.
 *
 * Encoding:
 *   natural rivers   solid blue, width ∝ relative size, animated flow
 *   engineered       dashed orange, animated — dashing doubles as the
 *                    colorblind-safe secondary encoding
 *   reservoirs       ring = capacity, disc = live storage (area-true)
 *   demand centers   small squares
 *
 * Palette validated light+dark with the dataviz six-checks validator.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoArea, geoConicConformal, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import {
  BASIN_STATE_FIPS,
  LEES_FERRY,
  MAP_AGRICULTURE,
  MAP_CITIES,
  MAP_CONVEYANCE,
  MAP_POPULATION,
  MAP_RESERVOIRS,
} from "@/lib/mapdata";
import { acreFeet, percent } from "@/lib/format";

type LayerKey = "water" | "people" | "agriculture" | "counties";

type CountyMetric = "ir" | "ps" | "ind" | "te";

const METRICS: Record<CountyMetric, { label: string; cls: string; what: string }> = {
  ir: { label: "Irrigation", cls: "m-ir", what: "irrigation withdrawals" },
  ps: { label: "Public supply", cls: "m-ps", what: "public-supply withdrawals (homes, businesses, most commercial use)" },
  ind: { label: "Industrial", cls: "m-ind", what: "self-supplied industrial withdrawals" },
  te: { label: "Thermoelectric", cls: "m-te", what: "power-plant cooling withdrawals" },
};

interface CountyRow {
  fips: string; name: string; st: string;
  lon: number; lat: number;
  pop: number | null; ps: number | null; ir: number | null;
  ind: number | null; te: number | null;
}

const AF_PER_MGD_YEAR = 1121; // 1 MGD sustained ≈ 1,121 acre-feet/year

const LAYER_LABELS: Record<LayerKey, string> = {
  water: "Water & storage",
  people: "People served",
  agriculture: "Irrigated agriculture",
  counties: "County water use ’15",
};

const fmtPeople = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : `${Math.round(n / 1000)}k`;

const W = 960;
const H = 700;

const RIVER_WIDTH: Record<string, number> = {
  Colorado: 3.1,
  Green: 2.2,
  "San Juan": 1.7,
  Gila: 1.3,
};

/** Manually placed river labels [lon, lat, angle]. */
const RIVER_LABELS: readonly [string, number, number, number][] = [
  ["Colorado", -109.7, 39.1, -38],
  ["Green", -110.1, 41.6, 55],
  ["San Juan", -108.6, 36.72, 0],
  ["Gila", -110.2, 33.05, 8],
  ["Colorado", -114.55, 34.5, 80],
];

interface Tip {
  x: number;
  y: number;
  title: string;
  lines: string[];
  chip?: string;
}

interface GeoData {
  states: GeoJSON.FeatureCollection;
  rivers: GeoJSON.FeatureCollection;
  boundary: GeoJSON.FeatureCollection;
}

export function BasinMap({
  storage,
}: {
  /** Live storage in AF by reservoir id (powell, mead), from RISE. */
  storage: Record<string, { af: number; asOf: string } | undefined>;
}) {
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [k, setK] = useState(1);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    water: true,
    people: true,
    agriculture: true,
    counties: false,
  });
  const [metric, setMetric] = useState<CountyMetric>("ir");
  const [countyData, setCountyData] = useState<{
    citation: string;
    counties: CountyRow[];
  } | null>(null);
  useEffect(() => {
    // Lazy-load county data the first time the layer is switched on.
    if (layers.counties && !countyData) {
      fetch("/geo/county_wateruse.json")
        .then((r) => r.json())
        .then(setCountyData);
    }
  }, [layers.counties, countyData]);
  const toggleLayer = (key: LayerKey) =>
    setLayers((l) => ({ ...l, [key]: !l[key] }));
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/geo/states-10m.json").then((r) => r.json()),
      fetch("/geo/basin_rivers.geojson").then((r) => r.json()),
      fetch("/geo/basin_boundary.geojson").then((r) => r.json()),
    ]).then(([topo, rivers, boundary]: [unknown, GeoJSON.FeatureCollection, GeoJSON.FeatureCollection]) => {
      if (!alive) return;
      // us-atlas TopoJSON; typed loosely to avoid a types-only dependency.
      const t = topo as Parameters<typeof feature>[0] & {
        objects: { states: Parameters<typeof feature>[1] };
      };
      const states = feature(
        t,
        t.objects.states,
      ) as unknown as GeoJSON.FeatureCollection;
      // d3-geo polygons are spherical: a ring wound the "wrong" way means
      // "everything on Earth except this area". USGS ArcGIS output winds
      // opposite to d3's convention, so rewind any feature whose computed
      // area exceeds a hemisphere.
      for (const f of boundary.features) {
        if (geoArea(f) > 2 * Math.PI && f.geometry.type === "Polygon") {
          (f.geometry as GeoJSON.Polygon).coordinates.forEach((ring) =>
            ring.reverse(),
          );
        }
      }
      setGeo({ states, rivers, boundary });
    });
    return () => {
      alive = false;
    };
  }, []);

  const { path, project } = useMemo(() => {
    const projection = geoConicConformal()
      .parallels([33, 45])
      .rotate([111, 0])
      .fitExtent(
        [
          [16, 16],
          [W - 16, H - 16],
        ],
        // MultiPoint corners, not a Polygon: d3-geo polygons are spherical
        // and a wrong ring winding silently means "everything but the box".
        {
          type: "MultiPoint",
          coordinates: [
            [-119.8, 31.0],
            [-103.6, 31.0],
            [-103.6, 43.9],
            [-119.8, 43.9],
          ],
        } as GeoJSON.MultiPoint,
      );
    return {
      path: geoPath(projection),
      project: (lon: number, lat: number) => projection([lon, lat]) ?? [0, 0],
    };
  }, []);

  useEffect(() => {
    if (!geo || !svgRef.current || !gRef.current) return;
    const svg = select(svgRef.current);
    const g = select(gRef.current);
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 9])
      .translateExtent([
        [0, 0],
        [W, H],
      ])
      .on("zoom", (e) => {
        g.attr("transform", e.transform.toString());
        setK(e.transform.k);
      });
    svg.call(z);
    zoomRef.current = z;
    return () => {
      svg.on(".zoom", null);
    };
  }, [geo]);

  const zoomBy = useCallback((factor: number) => {
    if (svgRef.current && zoomRef.current)
      zoomRef.current.scaleBy(select(svgRef.current), factor);
  }, []);
  const reset = useCallback(() => {
    if (svgRef.current && zoomRef.current)
      zoomRef.current.transform(select(svgRef.current), zoomIdentity);
  }, []);

  const showTip = useCallback(
    (e: React.MouseEvent, title: string, lines: string[], chip?: string) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        title,
        lines,
        chip,
      });
    },
    [],
  );
  const hideTip = useCallback(() => setTip(null), []);

  // Area-true storage discs: r ∝ √AF.
  const rOf = (af: number) => 5.3 * Math.sqrt(af / 1_000_000);
  const inv = 1 / k;

  if (!geo) {
    return (
      <div className="map-wrap map-loading" style={{ aspectRatio: `${W}/${H}` }}>
        <span>Loading basin geometry…</span>
      </div>
    );
  }

  return (
    <div className="map-wrap" ref={wrapRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Interactive map of the Colorado River system: rivers, reservoirs, aqueducts, and the cities they supply"
      >
        <g ref={gRef}>
          {/* States */}
          {geo.states.features.map((f) => {
            const fips = String(f.id).padStart(2, "0");
            const inBasin = BASIN_STATE_FIPS.has(fips);
            return (
              <path
                key={fips}
                d={path(f) ?? undefined}
                className={`map-state${inBasin ? " basin" : ""}`}
              />
            );
          })}

          {/* Watershed boundary — the basin itself, USGS WBD HUC-2 */}
          {geo.boundary.features.map((f) => {
            const props = f.properties as { huc2?: string; name?: string };
            return (
              <path
                key={props.huc2}
                d={path(f) ?? undefined}
                className={`map-basin huc${props.huc2}`}
                onMouseMove={(e) =>
                  showTip(e, props.name ?? "Colorado River Basin", [
                    "USGS Watershed Boundary Dataset (HUC-2) — the land that actually drains to the river.",
                    "Note how little it overlaps the cities it supplies: most of the demand lies outside the basin.",
                  ])
                }
                onMouseLeave={hideTip}
              />
            );
          })}

          {/* Rivers — animated flow */}
          {geo.rivers.features.map((f, i) => {
            const name = (f.properties as { name?: string })?.name ?? "";
            return (
              <path
                key={i}
                d={path(f) ?? undefined}
                className="map-river"
                style={{ strokeWidth: (RIVER_WIDTH[name] ?? 1.4) * inv }}
                onMouseMove={(e) =>
                  showTip(e, `${name} River`, [
                    "Natural Earth centerline — real geometry",
                  ])
                }
                onMouseLeave={hideTip}
              />
            );
          })}

          {/* Engineered conveyance — dashed, animated */}
          {layers.water && MAP_CONVEYANCE.map((c) => {
            const d =
              "M" +
              c.path
                .map((p) => project(p[0], p[1]).map((n) => n.toFixed(1)).join(","))
                .join("L");
            return (
              <path
                key={c.id}
                d={d}
                className="map-canal"
                style={{ strokeWidth: 2.1 * inv }}
                onMouseMove={(e) =>
                  showTip(
                    e,
                    c.name,
                    [
                      c.role,
                      ...(c.approxAfPerYear
                        ? [
                            `≈ ${acreFeet(c.approxAfPerYear)}/yr · ${c.volumeSource ?? ""}`,
                          ]
                        : []),
                      "Path is schematic between real endpoints",
                    ],
                    "engineered",
                  )
                }
                onMouseLeave={hideTip}
              />
            );
          })}

          {/* Lees Ferry — the Compact point */}
          {layers.water && (() => {
            const [x, y] = project(LEES_FERRY.lon, LEES_FERRY.lat);
            return (
              <g
                onMouseMove={(e) =>
                  showTip(e, "Lees Ferry — the Compact point", [
                    "Gauged since 1921. Divides the Upper and Lower Basins;",
                    "the 1922 Compact's delivery obligation is measured here.",
                  ])
                }
                onMouseLeave={hideTip}
              >
                <line
                  x1={x - 7 * inv}
                  x2={x + 7 * inv}
                  y1={y}
                  y2={y}
                  className="map-compact-line"
                  style={{ strokeWidth: 1.6 * inv }}
                />
                <circle cx={x} cy={y} r={3 * inv} className="map-compact-dot" />
                <text
                  x={x - 4 * inv}
                  y={y + 14 * inv}
                  textAnchor="end"
                  className="map-label compact"
                  style={{ fontSize: 10 * inv }}
                >
                  Lees Ferry · Upper ⁄ Lower divide
                </text>
              </g>
            );
          })()}

          {/* Reservoirs — capacity ring + live storage disc */}
          {layers.water && MAP_RESERVOIRS.map((r) => {
            const [x, y] = project(r.lon, r.lat);
            const live = storage[r.id];
            const rCap = rOf(r.capacityAf);
            const rNow = live ? rOf(live.af) : 0;
            const pct = live ? (live.af / r.capacityAf) * 100 : null;
            const labelBelow = rCap < 9; // small reservoirs: label under the ring
            const showLabel = rCap >= 7 || k >= 2.2; // semantic zoom: small names appear when zoomed
            return (
              <g
                key={r.id}
                onMouseMove={(e) =>
                  showTip(
                    e,
                    r.name,
                    [
                      live
                        ? `${acreFeet(live.af)} in storage — ${percent(pct!, 1)} of ${acreFeet(r.capacityAf)} capacity`
                        : `Capacity ${acreFeet(r.capacityAf)}. ${r.noLiveReason ?? "Live storage not yet wired."}`,
                      ...(live ? [`Observed via Reclamation RISE, ${live.asOf} (provisional)`] : []),
                      ...(r.note ? [r.note] : []),
                    ],
                    live ? "observed" : undefined,
                  )
                }
                onMouseLeave={hideTip}
              >
                {/* invisible larger hit target */}
                <circle cx={x} cy={y} r={Math.max(rCap, 12)} fill="transparent" />
                <circle cx={x} cy={y} r={rCap} className="map-res-capacity" style={{ strokeWidth: 1.2 * inv }} />
                {live && <circle cx={x} cy={y} r={rNow} className="map-res-storage" />}
                {showLabel && (
                  <text
                    x={x}
                    y={labelBelow ? y + rCap + 11 * inv : y - rCap - 5 * inv}
                    className="map-label res"
                    style={{ fontSize: 11 * inv }}
                  >
                    {r.name}
                    {pct !== null ? ` · ${percent(pct, 0)}` : ""}
                  </text>
                )}
              </g>
            );
          })}

          {/* County water use — USGS 2015, all sources */}
          {layers.counties && countyData && countyData.counties.map((c) => {
            const v = c[metric];
            if (v === null || v <= 0.05) return null;
            const [x, y] = project(c.lon, c.lat);
            const r = Math.max(0.9, 0.62 * Math.sqrt(v));
            const afy = v * AF_PER_MGD_YEAR;
            return (
              <circle
                key={c.fips}
                cx={x}
                cy={y}
                r={r}
                className={`map-county ${METRICS[metric].cls}`}
                style={{ strokeWidth: 0.9 * inv }}
                onMouseMove={(e) =>
                  showTip(
                    e,
                    `${c.name} County, ${c.st}`,
                    [
                      `${METRICS[metric].label}: ${v.toLocaleString()} MGD ≈ ${acreFeet(afy)}/yr`,
                      `All water sources — not only the Colorado River. Note where this sits relative to the basin boundary.`,
                      "USGS 2015 county water-use census (Dieter et al. 2018). Withdrawals, not consumptive use.",
                    ],
                    "estimated",
                  )
                }
                onMouseLeave={hideTip}
              />
            );
          })}

          {/* People served — area-true violet circles */}
          {layers.people && MAP_POPULATION.map((p) => {
            const [x, y] = project(p.lon, p.lat);
            const r = 3.4 * Math.sqrt(p.people / 1_000_000);
            return (
              <g
                key={p.id}
                onMouseMove={(e) =>
                  showTip(
                    e,
                    `${p.name} — ≈${fmtPeople(p.people)} people`,
                    [p.note, `${p.source} (approx.)`],
                    p.confidence === "medium" ? "estimated" : undefined,
                  )
                }
                onMouseLeave={hideTip}
              >
                <circle cx={x} cy={y} r={Math.max(r, 10)} fill="transparent" />
                <circle cx={x} cy={y} r={r} className="map-people" style={{ strokeWidth: 1.2 * inv }} />
                <text
                  x={x}
                  y={y - r - 4 * inv}
                  className="map-label people"
                  style={{ fontSize: 9.5 * inv }}
                >
                  {fmtPeople(p.people)}
                </text>
              </g>
            );
          })}

          {/* Irrigated agriculture — teal diamonds, area ∝ water where sourced */}
          {layers.agriculture && MAP_AGRICULTURE.map((a) => {
            const [x, y] = project(a.lon, a.lat);
            const half = a.afPerYear ? 5.0 * Math.sqrt(a.afPerYear / 1_000_000) : 4.6;
            return (
              <g
                key={a.id}
                onMouseMove={(e) =>
                  showTip(
                    e,
                    a.name,
                    [
                      a.crops,
                      a.note,
                      ...(a.afPerYear
                        ? [`≈ ${acreFeet(a.afPerYear)}/yr · ${a.volumeSource ?? ""}`]
                        : ["No sourced volume — marker shows location and role only"]),
                    ],
                    a.afPerYear ? undefined : "estimated",
                  )
                }
                onMouseLeave={hideTip}
              >
                <rect
                  x={x - half}
                  y={y - half}
                  width={half * 2}
                  height={half * 2}
                  transform={`rotate(45,${x},${y})`}
                  className={`map-ag${a.afPerYear ? "" : " hollow"}`}
                  style={{ strokeWidth: 1.3 * inv }}
                />
              </g>
            );
          })}

          {/* Demand centers */}
          {layers.water && MAP_CITIES.map((c) => {
            const [x, y] = project(c.lon, c.lat);
            const s = 4.6 * inv;
            return (
              <g
                key={c.name}
                onMouseMove={(e) => showTip(e, c.name, [c.note])}
                onMouseLeave={hideTip}
              >
                <rect
                  x={x - s}
                  y={y - s}
                  width={s * 2}
                  height={s * 2}
                  className="map-city"
                  style={{ strokeWidth: 1.2 * inv }}
                />
                <text
                  x={x + s + 3 * inv}
                  y={y + 3.4 * inv}
                  className="map-label city"
                  style={{ fontSize: 9.5 * inv }}
                >
                  {c.name}
                </text>
              </g>
            );
          })}

          {/* River labels */}
          {RIVER_LABELS.map(([name, lon, lat, angle], i) => {
            const [x, y] = project(lon, lat);
            return (
              <text
                key={i}
                x={x}
                y={y}
                transform={`rotate(${angle},${x},${y})`}
                className="map-label river"
                style={{ fontSize: 9.5 * inv }}
              >
                {name}
              </text>
            );
          })}
        </g>
      </svg>

      <div className="map-layers" role="group" aria-label="Map layers">
        {(Object.keys(LAYER_LABELS) as LayerKey[]).map((key) => (
          <button
            key={key}
            className={`layer-pill ${key}${layers[key] ? " on" : ""}`}
            aria-pressed={layers[key]}
            onClick={() => toggleLayer(key)}
          >
            {LAYER_LABELS[key]}
          </button>
        ))}
      </div>

      {layers.counties && (
        <div className="map-metrics" role="radiogroup" aria-label="County metric">
          {(Object.keys(METRICS) as CountyMetric[]).map((m) => (
            <button
              key={m}
              className={`metric-pill ${METRICS[m].cls}${metric === m ? " on" : ""}`}
              aria-pressed={metric === m}
              onClick={() => setMetric(m)}
            >
              {METRICS[m].label}
            </button>
          ))}
        </div>
      )}

      <div className="map-controls">
        <button onClick={() => zoomBy(1.6)} aria-label="Zoom in">+</button>
        <button onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out">−</button>
        <button onClick={reset} aria-label="Reset view">⌂</button>
      </div>

      <div className="map-legend">
        <span className="lg-item"><i className="lg-line river" /> natural river</span>
        {layers.water && (
          <>
            <span className="lg-item"><i className="lg-line canal" /> engineered (schematic)</span>
            <span className="lg-item"><i className="lg-ring" /> capacity</span>
            <span className="lg-item"><i className="lg-disc" /> storage (live)</span>
          </>
        )}
        {layers.people && (
          <span className="lg-item"><i className="lg-people" /> people served (area ∝ population)</span>
        )}
        {layers.agriculture && (
          <span className="lg-item"><i className="lg-ag" /> irrigated agriculture</span>
        )}
        {layers.counties && (
          <span className="lg-item">
            <i className={`lg-county ${METRICS[metric].cls}`} /> county {METRICS[metric].what} — all sources, USGS 2015
          </span>
        )}
      </div>

      {tip && (
        <div
          className="map-tip"
          style={{
            left: Math.min(tip.x + 14, (wrapRef.current?.clientWidth ?? W) - 280),
            top: tip.y + 14,
          }}
        >
          <div className="map-tip-head">
            <strong>{tip.title}</strong>
            {tip.chip && <span className={`chip chip-${tip.chip}`}>{tip.chip}</span>}
          </div>
          {tip.lines.map((l, i) => (
            <div key={i} className="map-tip-line">{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}
