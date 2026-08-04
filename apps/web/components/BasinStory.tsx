"use client";

/**
 * The basin, told as a guided story — then an explorer.
 *
 * Built against docs/MAP_DESIGN.md. The load-bearing rules:
 *   - one view, one message; one hero layer and ONE saturated hue per step
 *   - mark vocabulary capped at graduated circles + lines + text
 *   - still at rest — motion only in step transitions (a delivery path draws
 *     in once when its step activates, then holds)
 *   - annotations carry the argument; tooltips are bonus color only
 *   - guided steps first, free exploration unlocked at the end
 *
 * Steps advance on scroll (sticky map, cards scroll past). `?step=N` pins a
 * step for QA screenshots.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoArea, geoConicConformal, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import {
  BASIN_STATE_FIPS,
  LEES_FERRY,
  MAP_CONVEYANCE,
  MAP_POPULATION,
  MAP_RESERVOIRS,
} from "@/lib/mapdata";
import { acreFeet, percent } from "@/lib/format";

const W = 960;
const H = 640;

type StepId = "basin" | "storage" | "flows" | "people" | "farms" | "explore";
const STEP_IDS: readonly StepId[] = ["basin", "storage", "flows", "people", "farms", "explore"];

const STEPS: readonly { id: StepId; kicker: string; hed: string; body: string }[] = [
  {
    id: "basin",
    kicker: "The system",
    hed: "One river drains a twelfth of the lower 48.",
    body: "The Colorado gathers Rocky Mountain snowmelt and carries it 1,450 miles toward the sea. The shaded area is the watershed — every drop that lands here funnels to one channel, measured at Lees Ferry.",
  },
  {
    id: "storage",
    kicker: "Storage",
    hed: "Two reservoirs hold the savings — and they're about three-quarters empty.",
    body: "Rings show capacity; filled circles show what's actually there. Powell and Mead dwarf everything else and carry the system's buffer. The smaller pools downstream stay full on purpose — they're regulating basins for the aqueducts, not savings.",
  },
  {
    id: "flows",
    kicker: "Deliveries",
    hed: "Most of the water is used outside the basin.",
    body: "Engineered paths carry it away: over the mountains to Los Angeles, uphill to Phoenix and Tucson, under the Continental Divide to Denver, and across the border to Mexico. Line width tracks sourced annual volume.",
  },
  {
    id: "people",
    kicker: "People",
    hed: "40 million people drink this river — most live beyond its edge.",
    body: "Circles are provider-served populations, sized to scale. Los Angeles, Denver, Salt Lake City, Albuquerque — all outside the watershed, all connected by the tunnels and aqueducts you just saw.",
  },
  {
    id: "farms",
    kicker: "Farms",
    hed: "But people are the sideshow — farms use most of the water.",
    body: "County irrigation withdrawals, from the USGS census. Imperial Valley alone takes more than Nevada and Utah's cities combined; with Yuma it grows most of America's winter vegetables. Note the Central Valley cluster — huge, and outside the basin: different river, same story.",
  },
  {
    id: "explore",
    kicker: "Explore",
    hed: "Now look around.",
    body: "Pan, zoom, and switch layers — one at a time, so the map always says one thing. Hover anything for its source.",
  },
];

const STEP_INDEX: Record<StepId, number> = Object.fromEntries(
  STEP_IDS.map((s, i) => [s, i]),
) as Record<StepId, number>;

type ExploreLayer = "storage" | "flows" | "people" | "farms";

interface CountyRow {
  fips: string;
  name: string;
  st: string;
  lon: number;
  lat: number;
  ir: number | null;
  ps: number | null;
}

interface Tip {
  x: number;
  y: number;
  title: string;
  lines: string[];
}

interface GeoData {
  states: GeoJSON.FeatureCollection;
  rivers: GeoJSON.FeatureCollection;
  boundary: GeoJSON.FeatureCollection;
}

const AF_PER_MGD_YEAR = 1121;

/** Labels shown on the people layer (≥1M only — label discipline). */
const PEOPLE_LABEL_MIN = 1_000_000;

export function BasinStory({
  storage,
}: {
  storage: Record<string, { af: number; asOf: string } | undefined>;
}) {
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [counties, setCounties] = useState<CountyRow[] | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [exploreLayer, setExploreLayer] = useState<ExploreLayer>("storage");
  const [tip, setTip] = useState<Tip | null>(null);
  const [k, setK] = useState(1);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);

  const step = STEPS[Math.min(stepIdx, STEPS.length - 1)]!.id;
  const exploring = step === "explore";
  // The hero layer for the current view (story step, or explore selection).
  const hero: StepId | ExploreLayer = exploring ? exploreLayer : step;

  // ---- data ----------------------------------------------------------------
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/geo/states-10m.json").then((r) => r.json()),
      fetch("/geo/basin_rivers.geojson").then((r) => r.json()),
      fetch("/geo/basin_boundary.geojson").then((r) => r.json()),
      fetch("/geo/county_wateruse.json").then((r) => r.json()),
    ]).then(
      ([topo, rivers, boundary, wu]: [
        unknown,
        GeoJSON.FeatureCollection,
        GeoJSON.FeatureCollection,
        { counties: CountyRow[] },
      ]) => {
        if (!alive) return;
        const t = topo as Parameters<typeof feature>[0] & {
          objects: { states: Parameters<typeof feature>[1] };
        };
        const states = feature(t, t.objects.states) as unknown as GeoJSON.FeatureCollection;
        // Spherical-winding guard: ArcGIS rings wind opposite to d3-geo.
        for (const f of boundary.features) {
          if (geoArea(f) > 2 * Math.PI && f.geometry.type === "Polygon") {
            (f.geometry as GeoJSON.Polygon).coordinates.forEach((r) => r.reverse());
          }
        }
        setGeo({ states, rivers, boundary });
        setCounties(wu.counties);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  // ?step=N pins a view (QA / deep links).
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("step");
    if (raw !== null) {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0 && n < STEPS.length) {
        setStepIdx(n);
        setPinned(true);
      }
    }
  }, []);

  // ---- projection ----------------------------------------------------------
  const { path, project } = useMemo(() => {
    const projection = geoConicConformal()
      .parallels([33, 45])
      .rotate([111, 0])
      .fitExtent(
        [
          [14, 14],
          [W - 14, H - 14],
        ],
        {
          type: "MultiPoint",
          coordinates: [
            [-119.8, 31.2],
            [-103.7, 31.2],
            [-103.7, 43.7],
            [-119.8, 43.7],
          ],
        } as GeoJSON.MultiPoint,
      );
    return {
      path: geoPath(projection),
      project: (lon: number, lat: number) => projection([lon, lat]) ?? [0, 0],
    };
  }, []);

  // ---- scroll driving ------------------------------------------------------
  useEffect(() => {
    if (pinned) return;
    const cards = document.querySelectorAll<HTMLElement>("[data-story-card]");
    if (!cards.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setStepIdx(Number((e.target as HTMLElement).dataset.storyCard));
          }
        }
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [pinned, geo]);

  // ---- zoom (explore only) -------------------------------------------------
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = select(svgRef.current);
    if (!exploring) {
      svg.on(".zoom", null);
      if (gRef.current) select(gRef.current).attr("transform", null);
      setK(1);
      return;
    }
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
  }, [exploring]);

  const zoomBy = useCallback((f: number) => {
    if (svgRef.current && zoomRef.current)
      zoomRef.current.scaleBy(select(svgRef.current), f);
  }, []);
  const resetZoom = useCallback(() => {
    if (svgRef.current && zoomRef.current)
      zoomRef.current.transform(select(svgRef.current), zoomIdentity);
  }, []);

  const showTip = useCallback((e: React.MouseEvent, title: string, lines: string[]) => {
    const rect = stickyRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, title, lines });
  }, []);
  const hideTip = useCallback(() => setTip(null), []);

  // Tap-shown tooltips linger on touch devices; any scroll dismisses.
  useEffect(() => {
    const clear = () => setTip(null);
    window.addEventListener("scroll", clear, { passive: true });
    return () => window.removeEventListener("scroll", clear);
  }, []);

  // ---- layer opacities: hero = 1, context whisper, hidden = 0 --------------
  const on = (layer: ExploreLayer | "basin") =>
    exploring ? (layer === "basin" ? true : exploreLayer === layer) : undefined;
  // One saturated layer per view (docs/MAP_DESIGN.md #10). The only
  // context-whisper allowed is storage under the delivery paths, where the
  // reservoirs are the origins of the flows being shown. Nothing else
  // accumulates across steps — ghost labels compete with the hero.
  const opacity = {
    boundary: 1, // ground context everywhere; hero of step 0
    rivers: hero === "flows" ? 0.9 : step === "basin" ? 1 : 0.45,
    storage: hero === "storage" ? 1 : step === "flows" ? 0.22 : 0,
    flows: hero === "flows" ? 1 : 0,
    people: hero === "people" ? 1 : 0,
    farms: hero === "farms" ? 1 : 0,
    leesFerry: step === "basin" || exploring ? 1 : 0,
  };

  const rOf = (af: number) => 5.1 * Math.sqrt(af / 1_000_000);
  const inv = 1 / k;
  // Mobile type scale: SVG-unit text renders ~2.5x smaller at phone width.
  const ts = (narrow ? 1.9 : 1) * inv;

  // Mobile: the basin is portrait-shaped — crop to it for the intro steps so
  // the map fills the screen; zoom out to full extent exactly when the story
  // leaves the basin (deliveries/people/farms/explore need LA and Denver).
  // Crop rects carry ~15u of padding past the drawn canvas so the basin
  // never touches the container edge (it was being sliced by the rounded
  // corner). Deliveries keeps the tall crop: aqueducts exit toward edge
  // labels. People/farms need the wide view (LA's circle, Central Valley).
  const CROP = "215 10 585 645";
  const FULL = `0 -8 ${W} ${H + 16}`;
  const cropped =
    narrow && !exploring &&
    (hero === "basin" || hero === "storage" || hero === "flows");
  const viewBox = cropped ? CROP : FULL;

  if (!geo || !counties) {
    return (
      <div className="story-loading" style={{ aspectRatio: `${W}/${H}` }}>
        Loading basin geometry…
      </div>
    );
  }

  const flowsActive = hero === "flows";

  return (
    <div className={`story${pinned ? " pinned" : ""}`}>
      <div className="story-sticky" ref={stickyRef}>
        <svg
          ref={svgRef}
          viewBox={viewBox}
          role="img"
          aria-label="Map of the Colorado River system, revealed in steps: watershed, reservoirs, deliveries, people, and irrigation"
          className={exploring ? "explorable" : undefined}
        >
          <g ref={gRef}>
            {/* ground: states, near-white */}
            {geo.states.features.map((f) => {
              const fips = String(f.id).padStart(2, "0");
              return (
                <path
                  key={fips}
                  d={path(f) ?? undefined}
                  className={`st-state${BASIN_STATE_FIPS.has(fips) ? " basin" : ""}`}
                />
              );
            })}

            {/* watershed — hero of step 0, quiet ground afterwards */}
            <g style={{ opacity: opacity.boundary }} className="fade">
              {geo.boundary.features.map((f) => {
                const p = f.properties as { huc2?: string; name?: string };
                return (
                  <path
                    key={p.huc2}
                    d={path(f) ?? undefined}
                    className={`st-watershed${step === "basin" ? " hero" : ""}`}
                    onMouseMove={(e) =>
                      showTip(e, p.name ?? "Colorado River Basin", [
                        "USGS Watershed Boundary Dataset (HUC-2).",
                      ])
                    }
                    onMouseLeave={hideTip}
                  />
                );
              })}
            </g>

            {/* rivers — solid, still */}
            <g style={{ opacity: opacity.rivers }} className="fade">
              {geo.rivers.features.map((f, i) => {
                const name = (f.properties as { name?: string })?.name ?? "";
                return (
                  <path
                    key={i}
                    d={path(f) ?? undefined}
                    className="st-river"
                    style={{ strokeWidth: (name === "Colorado" ? 2.4 : 1.4) * inv }}
                    onMouseMove={(e) => showTip(e, `${name} River`, ["Natural Earth centerline."])}
                    onMouseLeave={hideTip}
                  />
                );
              })}
            </g>

            {/* Lees Ferry — step 0 annotation */}
            <g style={{ opacity: opacity.leesFerry }} className="fade">
              {(() => {
                const [x, y] = project(LEES_FERRY.lon, LEES_FERRY.lat);
                return (
                  <>
                    <circle cx={x} cy={y} r={3 * inv} className="st-ink" />
                    <text x={x + 8 * inv} y={y + 3.5 * inv} className="st-label ink" style={{ fontSize: 10.5 * ts }}>
                      Lees Ferry — where the river is measured
                    </text>
                  </>
                );
              })()}
            </g>

            {/* storage — ring (capacity) + disc (live) */}
            <g style={{ opacity: opacity.storage }} className="fade">
              {MAP_RESERVOIRS.map((r) => {
                const [x, y] = project(r.lon, r.lat);
                const live = storage[r.id];
                const rCap = rOf(r.capacityAf);
                const pct = live ? (live.af / r.capacityAf) * 100 : null;
                const major = r.id === "powell" || r.id === "mead";
                const storageIsHero = hero === "storage";
                const showLabel = storageIsHero && (major || (exploring && (rCap >= 7 || k >= 2.2))) && (!narrow || major || exploring);
                return (
                  <g
                    key={r.id}
                    onMouseMove={(e) =>
                      showTip(e, r.name, [
                        live
                          ? `${acreFeet(live.af)} of ${acreFeet(r.capacityAf)} — ${percent(pct!, 0)} full`
                          : `Capacity ${acreFeet(r.capacityAf)}. ${r.noLiveReason ?? ""}`,
                        live ? `Reclamation RISE, ${live.asOf}, provisional.` : "",
                      ].filter(Boolean))
                    }
                    onMouseLeave={hideTip}
                  >
                    <circle cx={x} cy={y} r={Math.max(rCap, 11)} fill="transparent" />
                    <circle cx={x} cy={y} r={rCap} className="st-cap" style={{ strokeWidth: 1.1 * inv }} />
                    {live && <circle cx={x} cy={y} r={rOf(live.af)} className="st-store" />}
                    {showLabel && (
                      <text
                        x={x}
                        y={rCap < 9 ? y + rCap + 11 * inv : y - rCap - 6 * inv}
                        className="st-label water"
                        style={{ fontSize: (major ? 12 : 10.5) * ts }}
                      >
                        {r.name}
                        {pct !== null ? ` · ${percent(pct, 0)}` : ""}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* deliveries — draw in once on activation */}
            <g style={{ opacity: opacity.flows }} className="fade">
              {MAP_CONVEYANCE.map((c) => {
                const d =
                  "M" +
                  c.path.map((p) => project(p[0], p[1]).map((n) => n.toFixed(1)).join(",")).join("L");
                const wLine = c.approxAfPerYear
                  ? Math.max(1.4, 1.1 * Math.sqrt(c.approxAfPerYear / 500_000))
                  : 1.6;
                return (
                  <path
                    key={c.id}
                    d={d}
                    pathLength={1}
                    className={`st-canal${flowsActive ? " drawn" : ""}`}
                    style={{ strokeWidth: wLine * inv }}
                    onMouseMove={(e) =>
                      showTip(e, c.name, [
                        c.role,
                        c.approxAfPerYear
                          ? `≈ ${acreFeet(c.approxAfPerYear)}/yr — ${c.volumeSource ?? ""}`
                          : "No sourced volume; width is nominal.",
                        "Path is schematic between real endpoints.",
                      ])
                    }
                    onMouseLeave={hideTip}
                  />
                );
              })}
              {/* destination labels, flows step only */}
              {flowsActive && !cropped &&
                [
                  ["Los Angeles", -118.24, 34.15],
                  ["Phoenix", -112.07, 33.28],
                  ["Denver", -104.9, 39.9],
                  ["Mexico", -115.25, 32.14],
                ].map(([name, lon, lat]) => {
                  const [x, y] = project(lon as number, lat as number);
                  return (
                    <text key={name as string} x={x} y={y} className="st-label canal" style={{ fontSize: 10.5 * ts }}>
                      {name}
                    </text>
                  );
                })}
              {flowsActive && cropped && (
                <>
                  {/* paths exit the tall crop; edge labels name where they go */}
                  <text x={228} y={project(-118.24, 33.95)[1]} className="st-label canal" style={{ fontSize: 10.5 * ts, textAnchor: "start" }}>
                    ← Los Angeles
                  </text>
                  <text x={786} y={project(-104.9, 39.95)[1]} className="st-label canal" style={{ fontSize: 10.5 * ts, textAnchor: "end" }}>
                    Denver →
                  </text>
                  {(() => {
                    const [x, y] = project(-112.07, 33.28);
                    return <text x={x} y={y} className="st-label canal" style={{ fontSize: 10.5 * ts }}>Phoenix</text>;
                  })()}
                  {(() => {
                    const [x, y] = project(-115.25, 32.2);
                    return <text x={x} y={y} className="st-label canal" style={{ fontSize: 10.5 * ts }}>Mexico</text>;
                  })()}
                </>
              )}
            </g>

            {/* people — one violet circle system */}
            <g style={{ opacity: opacity.people }} className="fade">
              {MAP_POPULATION.map((p) => {
                const [x, y] = project(p.lon, p.lat);
                const r = 3.2 * Math.sqrt(p.people / 1_000_000);
                const label = (p.people >= (narrow ? 2_000_000 : PEOPLE_LABEL_MIN)) || (exploring && k >= 2.2);
                return (
                  <g
                    key={p.id}
                    onMouseMove={(e) =>
                      showTip(e, p.name, [
                        `≈ ${(p.people / 1e6).toFixed(1).replace(/\.0$/, "")} million people — ${p.source} (approx.)`,
                        p.note,
                      ])
                    }
                    onMouseLeave={hideTip}
                  >
                    <circle cx={x} cy={y} r={Math.max(r, 9)} fill="transparent" />
                    <circle cx={x} cy={y} r={r} className="st-people" style={{ strokeWidth: 1.1 * inv }} />
                    {label && (
                      <text x={x} y={y - r - 4 * inv} className="st-label people" style={{ fontSize: 10 * ts }}>
                        {p.name.split("·")[0]!.split("/")[0]!.trim()}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* farms — county irrigation, one teal circle system */}
            <g style={{ opacity: opacity.farms }} className="fade">
              {counties.map((c) => {
                const v = c.ir;
                if (v === null || v <= 1) return null;
                const [x, y] = project(c.lon, c.lat);
                return (
                  <circle
                    key={c.fips}
                    cx={x}
                    cy={y}
                    r={Math.max(1, 0.58 * Math.sqrt(v))}
                    className="st-farm"
                    style={{ strokeWidth: 0.8 * inv }}
                    onMouseMove={(e) =>
                      showTip(e, `${c.name} County, ${c.st}`, [
                        `Irrigation: ${v.toLocaleString()} MGD ≈ ${acreFeet(v * AF_PER_MGD_YEAR)}/yr`,
                        "All water sources, not only the Colorado. USGS 2015 county census (withdrawals).",
                      ])
                    }
                    onMouseLeave={hideTip}
                  />
                );
              })}
              {hero === "farms" && (
                <>
                  {(() => {
                    const [x, y] = project(-115.5, 32.95);
                    return (
                      <text x={x - 14} y={y + 4} textAnchor="end" className="st-label farm" style={{ fontSize: 11 * ts }}>
                        Imperial Valley
                      </text>
                    );
                  })()}
                  {(() => {
                    const [x, y] = project(-119.6, 36.6);
                    return (
                      <text x={x} y={y} className="st-label farm" style={{ fontSize: 10 * ts }}>
                        Central Valley — outside the basin
                      </text>
                    );
                  })()}
                </>
              )}
            </g>
          </g>
        </svg>

        {/* explore controls */}
        {exploring && (
          <>
            <div className="story-layerbar" role="radiogroup" aria-label="Layer">
              {(
                [
                  ["storage", "Storage"],
                  ["flows", "Deliveries"],
                  ["people", "People"],
                  ["farms", "Irrigation"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  className={`story-radio ${key}${exploreLayer === key ? " on" : ""}`}
                  aria-pressed={exploreLayer === key}
                  onClick={() => setExploreLayer(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="story-zoom">
              <button onClick={() => zoomBy(1.6)} aria-label="Zoom in">+</button>
              <button onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out">−</button>
              <button onClick={resetZoom} aria-label="Reset">⌂</button>
            </div>
          </>
        )}

        {/* step dots */}
        <div className="story-dots" aria-hidden="true">
          {STEPS.map((s, i) => (
            <i key={s.id} className={i === stepIdx ? "on" : undefined} />
          ))}
        </div>

        {tip && (
          <div
            className="story-tip"
            style={{ left: Math.min(tip.x + 14, 660), top: tip.y + 14 }}
          >
            <strong>{tip.title}</strong>
            {tip.lines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        )}
      </div>

      {/* scrolling cards */}
      <div className="story-cards">
        {STEPS.map((s, i) => (
          <article
            key={s.id}
            data-story-card={i}
            className={`story-card${i === stepIdx ? " active" : ""}`}
          >
            <div className="story-kicker">{s.kicker}</div>
            <h3>{s.hed}</h3>
            <p>{s.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
