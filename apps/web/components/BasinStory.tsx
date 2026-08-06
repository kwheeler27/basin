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
import { geoArea, geoConicConformal, geoContains, geoPath } from "d3-geo";
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
import { acreFeet, percent, HOUSEHOLD_ACRE_FEET_PER_YEAR } from "@/lib/format";
import { DetailSheet, type SheetData } from "./DetailSheet";

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
    body: "County irrigation withdrawals, from the 2015 USGS census — the last time anyone counted county by county. Tap any circle for plain-language detail. Imperial Valley alone takes more than Nevada and Utah's cities combined; with Yuma it grows most of America's winter vegetables. Note the Central Valley cluster — huge, and outside the basin: different river, same story.",
  },
  {
    id: "explore",
    kicker: "Explore",
    hed: "Now look around.",
    body: "Pan, zoom, and switch layers — one at a time, so the map always says one thing. Tap anything for what it means, how it compares, and where the number comes from.",
  },
];

const STEP_INDEX: Record<StepId, number> = Object.fromEntries(
  STEP_IDS.map((s, i) => [s, i]),
) as Record<StepId, number>;

/** The narrated chapters — explore now lives in its own hero instance. */
const STORY_STEPS = STEPS.slice(0, -1);

type ExploreLayer = "storage" | "flows" | "people" | "cities" | "farms" | "et";

interface NidDam {
  n: string; id: string; st: string;
  lat: number; lon: number; af: number;
  own: string; use: string; riv: string; yr: string | null;
}

interface EtField {
  id: string; name: string; st: string; crops: string;
  quality: "field" | "uncertain";
  monthly: number[]; annual: number; lon: number; lat: number;
}

interface CityRow {
  n: string;
  st: string;
  p: number;
  lat: number;
  lon: number;
}

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

interface StorageHistory {
  vintage: string;
  months: string[];               // "yyyy-mm"
  series: Record<string, (number | null)[]>;
}

interface GeoData {
  states: GeoJSON.FeatureCollection;
  rivers: GeoJSON.FeatureCollection;
  boundary: GeoJSON.FeatureCollection;
  countyLines: GeoJSON.FeatureCollection;
}

/** Households supplied for a year by a given volume — the standard anchor. */
function households(af: number): string {
  const n = af / HOUSEHOLD_ACRE_FEET_PER_YEAR;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} million households for a year`;
  if (n >= 1_000) return `${Math.round(n / 1000).toLocaleString()},000 households for a year`;
  return `${Math.round(n).toLocaleString()} households for a year`;
}

const AF_PER_MGD_YEAR = 1121;

/** Labels shown on the people layer (≥1M only — label discipline). */
const PEOPLE_LABEL_MIN = 1_000_000;

export function BasinStory({
  storage,
  variant = "story",
}: {
  storage: Record<string, { af: number; asOf: string } | undefined>;
  /**
   * "story" — the scroll-driven narration with sticky stage and cards.
   * "explore" — the same stage as a static, always-interactive hero:
   * layer pills, zoom, taps; no cards, no scroll driving, no time-lapse.
   */
  variant?: "story" | "explore";
}) {
  const isHero = variant === "explore";
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [counties, setCounties] = useState<CountyRow[] | null>(null);
  const [cities, setCities] = useState<CityRow[] | null>(null);
  const [etFields, setEtFields] = useState<EtField[] | null>(null);
  const [nidDams, setNidDams] = useState<NidDam[] | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [exploreLayer, setExploreLayer] = useState<ExploreLayer>("storage");
  const [tip, setTip] = useState<Tip | null>(null);
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [history, setHistory] = useState<StorageHistory | null>(null);
  /** Index into history.months during replay/scrub; null = today (live). */
  const [timeIdx, setTimeIdx] = useState<number | null>(null);
  const playedRef = useRef(false);
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

  const step: StepId = isHero
    ? "explore"
    : STORY_STEPS[Math.min(stepIdx, STORY_STEPS.length - 1)]!.id;
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
      fetch("/geo/basin_counties.geojson").then((r) => r.json()),
      fetch("/geo/cities_10k.json").then((r) => r.json()),
      fetch("/geo/storage_history.json").then((r) => r.json()),
      fetch("/geo/openet_fields_2025.json").then((r) => r.json()),
      fetch("/geo/nid_reservoirs.json").then((r) => r.json()),
    ]).then(
      ([topo, rivers, boundary, wu, countyLines, cityData, hist, etData, nid]: [
        unknown,
        GeoJSON.FeatureCollection,
        GeoJSON.FeatureCollection,
        { counties: CountyRow[] },
        GeoJSON.FeatureCollection,
        { places: CityRow[] },
        StorageHistory,
        { fields: EtField[] },
        { dams: NidDam[] },
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
        setGeo({ states, rivers, boundary, countyLines });
        setCounties(wu.counties);
        setCities(cityData.places);
        setHistory(hist);
        setEtFields(etData.fields.filter((f) => f.quality === "field"));
        // Drop NID entries that duplicate the curated live reservoirs
        // (Hoover, Glen Canyon, ... appear in both).
        setNidDams(nid.dams.filter((d) =>
          !MAP_RESERVOIRS.some((r) =>
            Math.abs(r.lat - d.lat) < 0.09 && Math.abs(r.lon - d.lon) < 0.09)));
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  // ?step=N pins a view (QA / deep links). Story instance only.
  useEffect(() => {
    if (isHero) return;
    const raw = new URLSearchParams(window.location.search).get("step");
    if (raw !== null) {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0 && n < STORY_STEPS.length) {
        setStepIdx(n);
        setPinned(true);
      }
    }
  }, [isHero]);

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
    if (isHero || pinned) return;
    const cards = document.querySelectorAll<HTMLElement>("[data-story-card]");
    if (!cards.length) return;
    // The observer is only a trigger; the active step is always the card
    // nearest the viewport center. Setting state per-entry made the last
    // intersecting card win, so the final transition flickered out of
    // explore when two tall cards straddled the band.
    const pick = () => {
      const mid = window.innerHeight / 2;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((el) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bestDist) {
          bestDist = d;
          best = Number(el.dataset.storyCard);
        }
      });
      setStepIdx(best);
    };
    const io = new IntersectionObserver(pick, {
      rootMargin: "-30% 0px -30% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });
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
    // `geo` is a dependency because the hero variant is exploring from its
    // very first render, while the SVG doesn't exist until data loads — bind
    // once the real stage mounts, not against the loading placeholder's refs.
  }, [exploring, geo]);

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
    cities: exploring && exploreLayer === "cities" ? 1 : 0,
    et: exploring && exploreLayer === "et" ? 1 : 0,
    leesFerry: step === "basin" || exploring ? 1 : 0,
  };

  /** Point-in-watershed test against the USGS HUC boundary (post-rewind). */
  const inBasin = (lon: number, lat: number) =>
    geo?.boundary.features.some((f) => geoContains(f, [lon, lat])) ?? false;

  /** Storage shown on the map: historical during replay/scrub, else live. */
  const shownStorage = (rid: string): number | null => {
    if (timeIdx !== null) return history?.series[rid]?.[timeIdx] ?? null;
    return storage[rid]?.af ?? null;
  };
  const timeLabel =
    timeIdx !== null && history
      ? new Date(`${history.months[timeIdx]}-15T00:00:00Z`).toLocaleDateString(
          "en-US", { year: "numeric", month: "short", timeZone: "UTC" })
      : null;

  const rOf = (af: number) => 5.1 * Math.sqrt(af / 1_000_000);
  const inv = 1 / k;
  // Mobile type scale: SVG-unit text renders ~2.5x smaller at phone width.
  const ts = (narrow ? 1.9 : 1) * inv;

  // Mobile: the basin is portrait-shaped — crop to it for the intro steps so
  // the map fills the screen; zoom out to full extent exactly when the story
  // leaves the basin (deliveries/people/farms/explore need LA and Denver).
// Playback engine for the storage time-lapse: play/pause/restart/seek.
  // Motion is the data (change over time); the synced time-strip line chart
  // below the map carries the trajectory the circles alone can't.
  const REPLAY_MS = 12_000;
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(1); // 0..1 through the archive; 1 = today
  const progRef = useRef(1);
  const seek = (p: number, keepPlaying = false) => {
    const clamped = Math.max(0, Math.min(1, p));
    progRef.current = clamped;
    setProg(clamped);
    if (!history) return;
    if (clamped >= 1) setTimeIdx(null);
    else setTimeIdx(Math.round(clamped * (history.months.length - 1)));
    if (!keepPlaying) setPlaying(false);
  };
  useEffect(() => {
    if (!playing || !history) return;
    if (progRef.current >= 1) progRef.current = 0;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, progRef.current + (t - last) / REPLAY_MS);
      last = t;
      progRef.current = p;
      setProg(p);
      setTimeIdx(p >= 1 ? null : Math.round(p * (history.months.length - 1)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, history]);

  // Auto-play once on first arrival at the storage step (not in pinned QA;
  // reduced-motion users keep manual control instead).
  useEffect(() => {
    if (step !== "storage" || pinned || playedRef.current || !history) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    playedRef.current = true;
    progRef.current = 0;
    setProg(0);
    setPlaying(true);
  }, [step, pinned, history]);

  // Leaving the storage context returns the clock to today and stops playback.
  useEffect(() => {
    if (hero !== "storage") {
      setPlaying(false);
      progRef.current = 1;
      setProg(1);
      setTimeIdx(null);
    }
  }, [hero]);

  // City rank within its state (cities arrive sorted by population desc).
  const cityRank = useMemo(() => {
    const perState = new Map<string, number>();
    const out = new Map<string, number>();
    if (cities) {
      for (const c of cities) {
        const r = (perState.get(c.st) ?? 0) + 1;
        perState.set(c.st, r);
        out.set(`${c.n}|${c.st}`, r);
      }
    }
    return out;
  }, [cities]);

  // Irrigation rank per county, for the comparison zone of the tap sheet.
  const irRank = useMemo(() => {
    if (!counties) return new Map<string, number>();
    const sorted = [...counties]
      .filter((c) => c.ir !== null)
      .sort((a, b) => (b.ir ?? 0) - (a.ir ?? 0));
    return new Map(sorted.map((c, i) => [c.fips, i + 1]));
  }, [counties]);

  // Mobile: ONE constant portrait frame — the stage must never resize
  // mid-scroll (the frame jumping between portrait and landscape was the
  // reported awkwardness). Instead the CAMERA PANS at constant scale:
  // people/farms shift the window west so LA and the Central Valley slide
  // in while the basin slides right. Same scale = pure translation =
  // smoothly animatable. What pans out of frame gets an edge label.
  const CROP = "215 10 585 645";
  const FULL = `0 -8 ${W} ${H + 16}`;
  const viewBox = narrow ? CROP : FULL;
  const cropped = narrow; // flows/people label variants keyed to the frame
  const panX = !narrow
    ? 0
    : hero === "people"
      ? 145 // window [70,655]: SoCal circle in; Denver/ABQ exit east
      : hero === "farms"
        ? 215 // window [0,585]: Central Valley + Imperial in
        : 0;

  if (!geo || !counties || !cities || !etFields || !nidDams) {
    return (
      <div className="story-loading" style={{ aspectRatio: `${W}/${H}` }}>
        Loading basin geometry…
      </div>
    );
  }

  const flowsActive = hero === "flows";


  return (
    <div
      id={isHero ? "explore" : undefined}
      className={`story${pinned ? " pinned" : ""}${exploring ? " exploring" : ""}${isHero ? " explore-hero" : ""}`}
    >
      <div className="story-sticky" ref={stickyRef}>
        <svg
          ref={svgRef}
          viewBox={viewBox}
          role="img"
          aria-label="Map of the Colorado River system, revealed in steps: watershed, reservoirs, deliveries, people, and irrigation"
          className={exploring ? "explorable" : undefined}
        >
          <g ref={gRef}>
          <g className="pan-layer" style={{ transform: `translateX(${panX}px)` }}>
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

            {/* county boundaries — permanent quiet ground, one rung below
                state lines; slightly more present where they carry meaning
                (farms data, zoomed exploration) */}
            <g
              style={{ opacity: hero === "farms" ? 0.7 : exploring && k >= 2 ? 0.6 : 0.32 }}
              className="fade"
            >
              {geo.countyLines.features.map((f) => (
                <path
                  key={(f.properties as { fips: string }).fips}
                  d={path(f) ?? undefined}
                  className="st-countyline"
                />
              ))}
            </g>

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
                      {narrow ? "Lees Ferry" : "Lees Ferry — where the river is measured"}
                    </text>
                  </>
                );
              })()}
            </g>

            {/* storage — ring (capacity) + disc (live) */}
            <g style={{ opacity: opacity.storage }} className="fade">
              {/* the long tail: every NID dam >= 10 kaf (capacity only, no
                  live feed). Zoom-density: majors at rest, everything when
                  zoomed. Explore only — the story keeps its 13. */}
              {exploring && nidDams.map((d) => {
                if (k < 2.2 && d.af < 100_000) return null;
                const [x, y] = project(d.lon, d.lat);
                if (x < 6 || x > W - 6 || y < 6 || y > H - 6) return null;
                const rr = Math.max(1.2, rOf(d.af));
                const inside = inBasin(d.lon, d.lat);
                return (
                  <g
                    key={d.id}
                    className="tappable"
                    onClick={() =>
                      setSheet({
                        kicker: "Reservoir (inventory)",
                        title: d.n,
                        fact: `Capacity about ${acreFeet(d.af)} — ${d.use.toLowerCase() || "multi-purpose"}, on ${d.riv || "an unnamed stream"}${d.yr ? `, completed ${d.yr}` : ""}.`,
                        detail: inside
                          ? "Inside the Colorado River watershed."
                          : "OUTSIDE the Colorado River watershed — a different river system, even if it sits in a basin state (some Front Range reservoirs store imported Colorado River water).",
                        chips: ["storage_capacity", "watershed", "acre_foot"],
                        compare: [
                          `${d.own || "Unknown"} owner · no public live-storage feed`,
                        ],
                        source: "US Army Corps of Engineers, National Inventory of Dams (2026 snapshot)",
                        clock: "annual",
                        clockLabel: "INVENTORY · NID 2026",
                      })
                    }
                    onMouseMove={(e) =>
                      showTip(e, d.n, [`≈ ${acreFeet(d.af)} capacity · ${d.st}`])
                    }
                    onMouseLeave={hideTip}
                  >
                    <circle cx={x} cy={y} r={Math.max(rr, 7)} fill="transparent" />
                    <circle cx={x} cy={y} r={rr} className={`st-nid${inside ? "" : " outside"}`} style={{ strokeWidth: 1 * inv }} />
                    {k >= 3 && d.af >= 12_000 && (
                      <text x={x} y={y - rr - 3 * inv} className="st-label nid" style={{ fontSize: 8.5 * ts }}>
                        {d.n}
                      </text>
                    )}
                  </g>
                );
              })}
              {MAP_RESERVOIRS.map((r) => {
                const [x, y] = project(r.lon, r.lat);
                const live = storage[r.id];
                const shown = shownStorage(r.id);
                const rCap = rOf(r.capacityAf);
                const pct = shown !== null ? (shown / r.capacityAf) * 100 : null;
                const major = r.id === "powell" || r.id === "mead";
                const storageIsHero = hero === "storage";
                const showLabel = storageIsHero && (major || (exploring && (rCap >= 7 || k >= 2.2))) && (!narrow || major || exploring);
                return (
                  <g
                    key={r.id}
                    className="tappable"
                    onClick={() =>
                      setSheet({
                        kicker: "Reservoir",
                        title: r.name,
                        fact: live
                          ? `Holding ${acreFeet(live.af)} today — ${percent((live.af / r.capacityAf) * 100, 0)} of its ${acreFeet(r.capacityAf)} capacity. That water would supply ${households(live.af)}.`
                          : `Capacity ${acreFeet(r.capacityAf)}. ${r.noLiveReason ?? "Live storage not yet wired."}`,
                        detail: r.note,
                        chips: ["storage_capacity", "acre_foot", "provisional"],
                        compare: [
                          `#${[...MAP_RESERVOIRS].sort((a, b) => b.capacityAf - a.capacityAf).findIndex((x) => x.id === r.id) + 1} of ${MAP_RESERVOIRS.length} mapped reservoirs by capacity`,
                          ...(live && (r.id === "powell" || r.id === "mead")
                            ? ["One of the two savings reservoirs — the rest are small regulating pools."]
                            : []),
                        ],
                        source: live
                          ? `Bureau of Reclamation RISE, ${live.asOf}`
                          : "Bureau of Reclamation (capacity); operator data unavailable",
                        clock: "live",
                        clockLabel: live ? "LIVE · updated daily" : "REFERENCE",
                        series: history?.series[r.id]
                          ? {
                              points: history.months.map((m, i) => [m, history.series[r.id]![i] ?? null]),
                              unit: "acre-feet",
                              reference: { value: r.capacityAf, label: "capacity" },
                              startLabel: "2000",
                              endLabel: "now",
                            }
                          : undefined,
                      })
                    }
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
                    {shown !== null && <circle cx={x} cy={y} r={rOf(shown)} className="st-store" />}
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
                    className={`st-canal tappable${flowsActive ? " drawn" : ""}`}
                    onClick={() =>
                      setSheet({
                        kicker: "Delivery path",
                        title: c.name,
                        fact: c.approxAfPerYear
                          ? `Carries about ${acreFeet(c.approxAfPerYear)} a year — ${households(c.approxAfPerYear)}.`
                          : "No sourced annual volume — shown for its role, not its size.",
                        detail: `${c.role}. The drawn path is schematic between real endpoints.`,
                        chips: ["aqueduct", "acre_foot", "consumptive_use"],
                        source: c.volumeSource ?? "Role documented; volume unsourced",
                        clock: "annual",
                        clockLabel: "REPORTED AVERAGE",
                      })
                    }
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
              {narrow && hero === "people" && (
                <text
                  x={786 - panX} /* inside the pan layer: counter-offset to stay at the frame edge */
                  y={project(-104.9, 39.95)[1]}
                  className="st-label people"
                  style={{ fontSize: 10 * ts, textAnchor: "end" }}
                >
                  Denver · 2.5M →
                </text>
              )}
              {MAP_POPULATION.map((p) => {
                const [x, y] = project(p.lon, p.lat);
                const r = 3.2 * Math.sqrt(p.people / 1_000_000);
                const label = (p.people >= (narrow ? 2_000_000 : PEOPLE_LABEL_MIN)) || (exploring && k >= 2.2);
                return (
                  <g
                    key={p.id}
                    className="tappable"
                    onClick={() =>
                      setSheet({
                        kicker: "People served",
                        title: p.name,
                        fact: `About ${(p.people / 1e6).toFixed(1).replace(/\.0$/, "")} million people — roughly ${Math.round((p.people / 40_000_000) * 100)}% of everyone who depends on the river.`,
                        detail: p.note,
                        chips: ["service_population", "watershed"],
                        source: `${p.source} (approximate)`,
                        clock: "annual",
                        clockLabel: "ANNUAL ESTIMATE",
                      })
                    }
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
                    className="st-farm tappable"
                    style={{ strokeWidth: 0.8 * inv }}
                    onClick={() => {
                      const afy = v * AF_PER_MGD_YEAR;
                      setSheet({
                        kicker: "County irrigation",
                        title: `${c.name} County, ${c.st}`,
                        fact: `Farms here withdrew about ${acreFeet(afy)} a year — enough water for ${households(afy)}.`,
                        detail:
                          "Withdrawals from all water sources, not only the Colorado River — and more than crops actually consume, since some returns to rivers and aquifers.",
                        chips: ["mgd", "irrigation_withdrawal", "withdrawal", "consumptive_use", "census_2015"],
                        compare: [
                          `#${irRank.get(c.fips) ?? "—"} of ${irRank.size} counties in the seven basin states`,
                        ],
                        source: "USGS county water-use census (Dieter et al. 2018)",
                        clock: "census",
                        clockLabel: "2015 CENSUS · last full county count",
                      });
                    }}
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

            {/* consumption ’25 — OpenET representative fields; MODELED, so
                dashed (the doctrine's epistemic encoding), field-quality
                points only (missed-field samples are named in the legend) */}
            <g style={{ opacity: opacity.et }} className="fade">
              {opacity.et > 0 && etFields.map((f) => {
                const [x, y] = project(f.lon, f.lat);
                const r = 4 + f.annual / 5.5;
                return (
                  <g
                    key={f.id}
                    className="tappable"
                    onClick={() =>
                      setSheet({
                        kicker: "Consumption · 2025",
                        title: `${f.name}, ${f.st}`,
                        fact: `Fields here consumed about ${f.annual} inches of water depth in 2025 — ${(f.annual / 12).toFixed(1)} vertical feet off every irrigated acre.`,
                        detail: `Grows ${f.crops}. Sampled at one representative 30m field pixel; ensemble of satellite models, not a ground instrument.`,
                        chips: ["evapotranspiration", "satellite_model", "consumptive_use"],
                        compare: [
                          `#${[...etFields].sort((a, b) => b.annual - a.annual).findIndex((z) => z.id === f.id) + 1} of ${etFields.length} sampled districts by consumption depth`,
                        ],
                        source: "OpenET ensemble (NASA/USGS/DRI partnership), calendar 2025",
                        clock: "model",
                        clockLabel: "SATELLITE MODEL · 2025",
                        series: {
                          points: f.monthly.map((v, i) => [`M${i + 1}`, v]),
                          unit: "inches/month",
                          startLabel: "Jan ’25",
                          endLabel: "Dec ’25",
                        },
                      })
                    }
                    onMouseMove={(e) =>
                      showTip(e, `${f.name}, ${f.st}`, [`≈ ${f.annual} in of ET in 2025 (modeled)`])
                    }
                    onMouseLeave={hideTip}
                  >
                    <circle cx={x} cy={y} r={Math.max(r, 10)} fill="transparent" />
                    <circle cx={x} cy={y} r={r} className="st-et" style={{ strokeWidth: 1.6 * inv }} />
                    <text x={x} y={y + 3 * ts} className="st-label et" style={{ fontSize: 9.5 * ts }}>
                      {Math.round(f.annual)}&#8243;
                    </text>
                  </g>
                );
              })}
            </g>

            {/* cities — explore only: every incorporated place >= 10k */}
            <g style={{ opacity: opacity.cities }} className="fade">
              {opacity.cities > 0 && cities.map((c) => {
                const ck = `${c.n}|${c.st}`;
                const [x, y] = project(c.lon, c.lat);
                if (x < 8 || x > W - 8 || y < 8 || y > H - 8) return null;
                const r = Math.max(0.8, 0.6 * Math.sqrt(c.p / 10_000));
                const label =
                  c.p >= 250_000 || (k >= 2.4 && c.p >= 60_000) || k >= 4.5;
                return (
                  <g
                    key={ck}
                    className="tappable"
                    onClick={() =>
                      setSheet({
                        kicker: "City",
                        title: `${c.n}, ${c.st}`,
                        fact: `${c.p.toLocaleString()} people (July 2024 estimate).`,
                        detail:
                          "Incorporated places only — unincorporated communities (like the Las Vegas Strip's Paradise, NV) aren't counted here.",
                        chips: ["watershed"],
                        compare: [
                          `#${cityRank.get(ck) ?? "—"} largest incorporated city in ${c.st} (of those over 10,000)`,
                        ],
                        source:
                          "US Census Bureau, city population totals 2020–2024 (SUB-EST2024); TIGERweb centroids",
                        clock: "annual",
                        clockLabel: "JULY 2024 ESTIMATE",
                      })
                    }
                    onMouseMove={(e) =>
                      showTip(e, `${c.n}, ${c.st}`, [
                        `${c.p.toLocaleString()} people (2024 est.)`,
                      ])
                    }
                    onMouseLeave={hideTip}
                  >
                    <circle cx={x} cy={y} r={Math.max(r, 5)} fill="transparent" />
                    <circle cx={x} cy={y} r={r} className="st-city" style={{ strokeWidth: 0.7 * inv }} />
                    {label && (
                      <text x={x} y={y - r - 3 * inv} className="st-label ink-city" style={{ fontSize: 9.5 * ts }}>
                        {c.n}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
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
                  ["cities", "Cities"],
                  ["farms", "Irrigation ’15"],
                  ["et", "Consumption ’25"],
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

        {/* time panel: the trajectory as lines, synced to the map.
            Desktop: prominent right-side panel over the map's quiet east.
            Mobile: compact bottom strip. Transport lives here. */}
        {step === "storage" && !exploring && history && (() => {
          const P = narrow
            ? { SW: 620, SH: 118, t: 12, r: 58, b: 18, l: 16, axis: false }
            : { SW: 340, SH: 250, t: 34, r: 54, b: 22, l: 34, axis: true };
          const n = history.months.length;
          const sx = (i: number) => P.l + (i / (n - 1)) * (P.SW - P.l - P.r);
          const sy = (af: number) => P.SH - P.b - (af / 26_000_000) * (P.SH - P.t - P.b);
          const lineOf = (rid: string) => {
            let d = "";
            let pen = false;
            (history.series[rid] ?? []).forEach((v, i) => {
              if (v === null) { pen = false; return; }
              d += `${pen ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)} `;
              pen = true;
            });
            return d;
          };
          const curI = timeIdx ?? n - 1;
          const clipW = P.l + prog * (P.SW - P.l - P.r);
          const yearTicks = history.months
            .map((m, i) => ({ m, i }))
            .filter(({ m }) => m.endsWith("-01") && Number(m.slice(0, 4)) % (narrow ? 5 : 10) === 0);
          const onSeek = (e: React.MouseEvent<SVGSVGElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * P.SW;
            seek((px - P.l) / (P.SW - P.l - P.r));
          };
          const labels = (() => {
            let yp = sy(history.series.powell?.[curI] ?? 0) + 3.5;
            let ym = sy(history.series.mead?.[curI] ?? 0) + 3.5;
            if (Math.abs(yp - ym) < 11) {
              const mid = (yp + ym) / 2;
              const povTop = yp <= ym;
              yp = mid + (povTop ? -6 : 6);
              ym = mid + (povTop ? 6 : -6);
            }
            return { yp, ym };
          })();
          return (
            <div className={`timestrip${narrow ? "" : " panel"}`}>
              <div className="ts-head">
                <div className="ts-controls">
                  <button aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)}>
                    {playing ? "❚❚" : "▶"}
                  </button>
                  <button aria-label="Restart from 2000" onClick={() => { seek(0, true); setPlaying(true); }}>
                    ↺
                  </button>
                </div>
                <div className="ts-date">{timeLabel ?? "Today"}</div>
              </div>
              <svg viewBox={`0 0 ${P.SW} ${P.SH}`} role="img"
                aria-label="Powell and Mead storage over time — click to seek"
                onClick={onSeek}>
                <defs>
                  <clipPath id="ts-clip">
                    <rect x={0} y={0} width={clipW} height={P.SH} />
                  </clipPath>
                </defs>
                {P.axis && (
                  <>
                    <text x={P.l - 4} y={P.t - 8} className="ts-tick" style={{ textAnchor: "start" }}>
                      storage, MAF
                    </text>
                    {[5, 15, 25].map((m) => (
                      <g key={m}>
                        <line x1={P.l} x2={P.SW - P.r} y1={sy(m * 1e6)} y2={sy(m * 1e6)} className="ts-grid" />
                        <text x={P.l - 4} y={sy(m * 1e6) + 3} className="ts-tick" style={{ textAnchor: "end" }}>{m}</text>
                      </g>
                    ))}
                  </>
                )}
                {yearTicks.map(({ m, i }) => (
                  <text key={m} x={sx(i)} y={P.SH - 5} className="ts-tick">{m.slice(0, 4)}</text>
                ))}
                <path d={lineOf("powell")} className="ts-ghost" />
                <path d={lineOf("mead")} className="ts-ghost" />
                <g clipPath="url(#ts-clip)">
                  <path d={lineOf("powell")} className="ts-line powell" />
                  <path d={lineOf("mead")} className="ts-line mead" />
                </g>
                <line x1={sx(curI)} x2={sx(curI)} y1={P.t} y2={P.SH - P.b} className="ts-hair" />
                <text x={P.SW - P.r + 6} y={labels.yp} className="ts-label powell">Powell</text>
                <text x={P.SW - P.r + 6} y={labels.ym} className="ts-label mead">Mead</text>
              </svg>
            </div>
          );
        })()}

        {/* time context: ghost year during replay/scrub */}
        {timeLabel && (
          <div className="ghost-year" aria-hidden="true">
            {timeLabel}
          </div>
        )}

        {/* hero legend: what each mark means, per layer — the story's cards
            carry this job in narration; the explore front door needs it
            stated. Swatches use the real mark classes so they cannot drift
            from the map. */}
        {isHero && (
          <div className="hero-legend" aria-label="Map legend">
            {exploreLayer === "storage" && (
              <>
                <span className="hl-item"><svg viewBox="0 0 16 16" className="hl-sw"><circle cx="8" cy="8" r="6" className="map-res-storage" /></svg>water in storage now (live)</span>
                <span className="hl-item"><svg viewBox="0 0 16 16" className="hl-sw"><circle cx="8" cy="8" r="6.5" className="map-res-capacity" /></svg>full capacity</span>
                <span className="hl-item"><svg viewBox="0 0 16 16" className="hl-sw"><circle cx="8" cy="8" r="4.5" className="st-nid" /></svg>other large dams — no live gauge</span>
                <span className="hl-item"><svg viewBox="0 0 16 16" className="hl-sw"><circle cx="8" cy="8" r="4.5" className="st-nid outside" /></svg>dashed: outside the watershed</span>
              </>
            )}
            {exploreLayer === "flows" && (
              <span className="hl-item"><svg viewBox="0 0 22 16" className="hl-sw wide"><path d="M2 8 L20 8" className="st-canal" strokeWidth={4} /></svg>delivery path — width is sourced annual volume; schematic between real endpoints</span>
            )}
            {exploreLayer === "people" && (
              <span className="hl-item"><svg viewBox="0 0 16 16" className="hl-sw"><circle cx="8" cy="8" r="6" className="map-people" /></svg>population served by a water provider — area is people</span>
            )}
            {exploreLayer === "cities" && (
              <span className="hl-item"><svg viewBox="0 0 16 16" className="hl-sw"><circle cx="8" cy="8" r="4.5" className="st-city" /></svg>city or town of 10,000+ — area is population (2024 census estimates)</span>
            )}
            {exploreLayer === "farms" && (
              <span className="hl-item"><svg viewBox="0 0 16 16" className="hl-sw"><circle cx="8" cy="8" r="6" className="st-farm" /></svg>county irrigation withdrawals — area is volume (2015 USGS census)</span>
            )}
            {exploreLayer === "et" && (
              <span className="hl-item"><svg viewBox="0 0 16 16" className="hl-sw"><circle cx="8" cy="8" r="5.5" className="st-et" /></svg>district field consumption, 2025 — dashed: modeled from satellite (OpenET)</span>
            )}
            <span className="hl-tap">tap any mark for detail &amp; source</span>
          </div>
        )}

        {/* step dots (story only) */}
        {!isHero && (
          <div className="story-dots" aria-hidden="true">
            {STORY_STEPS.map((s, i) => (
              <i key={s.id} className={i === stepIdx ? "on" : undefined} />
            ))}
          </div>
        )}

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
        <DetailSheet data={sheet} onClose={() => setSheet(null)} />
      </div>

      {/* scrolling cards (story only) */}
      {!isHero && (
        <div className="story-cards">
          {STORY_STEPS.map((s, i) => (
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
          <article className="story-card outro active">
            <div className="story-kicker">Explore</div>
            <h3>Now it&rsquo;s your instrument.</h3>
            <p>
              Every layer you just read is live on the map at the top of this
              page — pan, zoom, switch layers, and tap anything for what it
              means, how it compares, and where the number comes from.
            </p>
            <a className="story-outro-link" href="#explore">
              ↑ Back to the map
            </a>
          </article>
        </div>
      )}
    </div>
  );
}
