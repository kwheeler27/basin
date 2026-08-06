"use client";

/**
 * Every recorded right — the Phase 3 drill-in (WATER_RIGHTS_DESIGN.md D1/D2).
 *
 * 333k gated point features served as a single static PMTiles archive over
 * HTTP range requests (no tile server), rendered with MapLibre GL styled to
 * the house register: our surface, our county lines, one hue, color by
 * priority year. Holder names appear only where the privacy gate allowed
 * them into the tiles (entities/agencies/tribal governments — never
 * individuals). Loaded lazily: this module costs nothing until opened.
 */

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { RIGHTS_TILES_URL } from "@/lib/tiles";

const BOUNDS: [number, number, number, number] = [-124.6, 31.2, -102.0, 45.1];

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function RightsPointsMap() {
  const el = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!el.current) return;
    // Turbopack mangles maplibre v6's module-worker URL (tiles stall
    // silently, no error) — serve the vendored worker from /public instead.
    maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    const surface = cssVar("--bg", "#f7f8f7");
    const line = cssVar("--border", "#dfe3e1");
    const water = cssVar("--water", "#2b7fb8");
    const ink = cssVar("--muted", "#5d6b66");

    const map = new maplibregl.Map({
      container: el.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          counties: { type: "geojson", data: "/geo/counties_west.json" },
          rights: { type: "vector", url: `pmtiles://${RIGHTS_TILES_URL}` },
        },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": surface } },
          {
            id: "county-lines",
            type: "line",
            source: "counties",
            paint: { "line-color": line, "line-width": 0.6 },
          },
          {
            id: "rights-pts",
            type: "circle",
            source: "rights",
            "source-layer": "rights",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 1, 7, 2, 11, 5],
              "circle-color": [
                "case",
                ["!", ["has", "yr"]],
                ink,
                ["interpolate", ["linear"], ["get", "yr"], 1870, "#08306b", 1922, water, 2020, "#c6dbef"],
              ],
              "circle-opacity": 0.75,
            },
          },
        ],
      },
      bounds: BOUNDS,
      fitBoundsOptions: { padding: 16 },
      minZoom: 3.5,
      maxZoom: 11.5,
      attributionControl: false,
      cooperativeGestures: true,
      // lets the qa harness screenshot the canvas; negligible cost at this scale
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // exposed for the qa harness
    (window as unknown as { __rightsMap?: unknown }).__rightsMap = map;

    map.on("click", "rights-pts", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, string>;
      const lines = [
        p.yr ? `<strong>Priority ${p.yr}</strong> (${p.basis ?? "basis unknown"})` : `<strong>No priority date in record</strong>`,
        p.use ? `Use of record: ${p.use}` : null,
        p.holder ? `Holder of record: ${p.holder}` : `Holder: individual or unrecorded (not shown)`,
        p.src ? `<span class="pm-src">${p.src} · ${p.st?.toUpperCase()}</span>` : null,
      ].filter(Boolean);
      new maplibregl.Popup({ closeButton: true, maxWidth: "280px", className: "pm-popup" })
        .setLngLat(e.lngLat)
        .setHTML(lines.join("<br/>"))
        .addTo(map);
    });
    map.on("mouseenter", "rights-pts", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "rights-pts", () => { map.getCanvas().style.cursor = ""; });

    return () => {
      map.remove();
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  return (
    <div className="pointsmap">
      <div ref={el} className="pointsmap-canvas" />
      <div className="rm-legend">
        <span className="rm-swatch" style={{ background: "#08306b" }} /> pre-1900 ·
        <span className="rm-swatch" style={{ background: "var(--water)" }} /> ~1922 ·
        <span className="rm-swatch" style={{ background: "#c6dbef" }} /> recent ·
        <span className="rm-swatch" style={{ background: "var(--muted)" }} /> no date in record
        <span className="rm-asof">333,459 recorded rights · tap any point</span>
      </div>
    </div>
  );
}
