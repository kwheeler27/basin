"use client";

/**
 * The water-rights picture — seven-state county choropleth stage.
 *
 * Layers (one message, one hue per view — docs/MAP_DESIGN.md):
 *   seniority — median priority year of dated rights per county; the
 *               structure of prior appropriation made visible.
 *   uses      — share of active rights recorded for irrigation.
 *   held      — share held by entities/agencies (vs individuals).
 *   coverage  — what each state's record system can and cannot say;
 *               gaps are content (NM has no priority record; UT/NV/WY
 *               have no scriptable geometry).
 *
 * Data: rights_county_agg.json (baked by packages/ingest rights
 * pipeline, rights-v1) over TIGERweb county polygons. Static at rest;
 * tap any county for the numbers and provenance.
 */

import { useMemo, useState } from "react";
import { geoConicConformal, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import statesTopo from "@/public/geo/states-10m.json";
import counties from "@/public/geo/counties_west.json";
import agg from "@/public/geo/rights_county_agg.json";
import { DetailSheet, type SheetData } from "@/components/DetailSheet";

const W = 960;
const H = 620;

const LAYERS = [
  ["seniority", "Seniority"],
  ["uses", "Irrigation share"],
  ["held", "Institutional share"],
  ["coverage", "Coverage"],
] as const;
type Layer = (typeof LAYERS)[number][0];

const WEST_FIPS: Record<string, string> = {
  "04": "az", "06": "ca", "08": "co", "35": "nm", "32": "nv", "49": "ut", "56": "wy",
};

interface CountyAgg {
  fips: string | null;
  state: string;
  county: string;
  n: number;
  medianPriorityYear: number | null;
  pctPre1922: number | null;
  nDated: number;
  entityHeldShare: number | null;
  uses: Record<string, number>;
}

/** Sequential single-hue ramp (water blue), t in [0,1]. */
const ramp = (t: number) =>
  `color-mix(in srgb, var(--water) ${Math.round(8 + t * 72)}%, var(--surface))`;

export function RightsMap() {
  const [layer, setLayer] = useState<Layer>("seniority");
  const [sheet, setSheet] = useState<SheetData | null>(null);

  const { path, states } = useMemo(() => {
    const t = statesTopo as unknown as Parameters<typeof feature>[0] & {
      objects: { states: Parameters<typeof feature>[1] };
    };
    const all = feature(t, t.objects.states) as unknown as GeoJSON.FeatureCollection;
    const west = all.features.filter((f) =>
      Object.keys(WEST_FIPS).includes(String(f.id).padStart(2, "0")),
    );
    const projection = geoConicConformal()
      .parallels([33, 45])
      .rotate([111, 0])
      .fitExtent(
        [
          [10, 10],
          [W - 10, H - 10],
        ],
        { type: "FeatureCollection", features: west } as GeoJSON.FeatureCollection,
      );
    return { path: geoPath(projection), states: west };
  }, []);

  const byFips = useMemo(() => {
    const m = new Map<string, CountyAgg>();
    for (const c of (agg as { counties: CountyAgg[] }).counties) {
      if (c.fips) m.set(c.fips, c);
    }
    return m;
  }, []);

  const stateMeta = (agg as unknown as {
    states: Record<string, { n: number; seniority?: boolean; coverage?: string; note?: string; seniorityNote?: string; source: string }>;
  }).states;

  // Domain for seniority: 5th–95th percentile of median years, for contrast.
  const yearDomain = useMemo(() => {
    const ys = [...byFips.values()]
      .map((c) => c.medianPriorityYear)
      .filter((y): y is number => y !== null)
      .sort((a, b) => a - b);
    return ys.length ? [ys[Math.floor(ys.length * 0.05)]!, ys[Math.floor(ys.length * 0.95)]!] : [1880, 1980];
  }, [byFips]);

  const fillOf = (fips: string): string | null => {
    const c = byFips.get(fips);
    const st = WEST_FIPS[fips.slice(0, 2)]!;
    const covered = stateMeta[st] && stateMeta[st].n > 0;
    if (layer === "coverage") {
      if (!covered) return null; // hatched via class
      return ramp(0.55);
    }
    if (!c) return covered ? ramp(0.04) : null;
    if (layer === "seniority") {
      if (c.medianPriorityYear === null || !stateMeta[st]?.seniority) return null;
      const [lo, hi] = yearDomain as [number, number];
      const t = 1 - Math.max(0, Math.min(1, (c.medianPriorityYear - lo) / Math.max(1, hi - lo)));
      return ramp(0.06 + t * 0.94); // older = darker
    }
    if (layer === "uses") {
      const total = Object.values(c.uses).reduce((a, b) => a + b, 0);
      const irr = c.uses.irrigation ?? 0;
      if (!total) return ramp(0.04);
      return ramp(0.06 + (irr / total) * 0.94);
    }
    // held
    if (c.entityHeldShare === null) return ramp(0.04);
    return ramp(0.06 + c.entityHeldShare * 0.94);
  };

  const openCounty = (fips: string) => {
    const c = byFips.get(fips);
    const st = WEST_FIPS[fips.slice(0, 2)]!;
    const meta = stateMeta[st];
    if (!c) {
      setSheet({
        kicker: st.toUpperCase(),
        title: "No records mapped here",
        fact:
          meta && meta.n > 0
            ? "This county has no active mapped rights in the current bake."
            : meta?.note ?? "This state's records are not yet scriptable.",
        detail: meta?.source ?? "",
        chips: [],
        clock: "annual",
        clockLabel: "AGENCY RECORD",
        source: meta?.source ?? "state agency of record",
      });
      return;
    }
    const total = Object.values(c.uses).reduce((a, b) => a + b, 0);
    const irr = c.uses.irrigation ?? 0;
    setSheet({
      kicker: `${c.county} · ${st.toUpperCase()}`,
      title: `${c.n.toLocaleString()} active rights of record`,
      fact:
        c.medianPriorityYear !== null
          ? `Half the dated rights here are senior to ${c.medianPriorityYear}${
              c.pctPre1922 !== null ? ` — ${c.pctPre1922}% predate the 1922 Compact` : ""
            }.`
          : "This state's record system does not carry a priority date for these rights.",
      detail: [
        total ? `${Math.round((irr / total) * 100)}% recorded for irrigation.` : null,
        c.entityHeldShare !== null
          ? `${Math.round(c.entityHeldShare * 100)}% held by entities or agencies (rest: individual holders).`
          : null,
        `${c.nDated.toLocaleString()} of ${c.n.toLocaleString()} carry a priority date.`,
      ]
        .filter(Boolean)
        .join(" "),
      chips: ["priority date", "point of diversion"],
      clock: "annual",
      clockLabel: "AGENCY RECORD",
      source: stateMeta[st]?.source ?? "state agency of record",
    });
  };

  const fetched = (agg as { fetched: string }).fetched;

  return (
    <div className="rightsmap">
      <div className="story-layerbar rights-layerbar" role="radiogroup" aria-label="Rights layer">
        {LAYERS.map(([key, label]) => (
          <button
            key={key}
            className={`story-radio${layer === key ? " on" : ""}`}
            aria-pressed={layer === key}
            onClick={() => setLayer(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Seven-state map of water rights by county — seniority, uses, institutional share, and record coverage"
      >
        {states.map((f) => (
          <path key={String(f.id)} d={path(f) ?? undefined} className="rm-state" />
        ))}
        {(counties as unknown as GeoJSON.FeatureCollection).features.map((f) => {
          const p = f.properties as { fips: string; name: string };
          const fill = fillOf(p.fips);
          return (
            <path
              key={p.fips}
              d={path(f) ?? undefined}
              className={`rm-county${fill === null ? " nodata" : ""}`}
              style={fill ? { fill } : undefined}
              onClick={() => openCounty(p.fips)}
            />
          );
        })}
        {states.map((f) => (
          <path key={`o${String(f.id)}`} d={path(f) ?? undefined} className="rm-state-line" />
        ))}
      </svg>
      <div className="rm-legend">
        {layer === "seniority" && (
          <>
            <span className="rm-swatch" style={{ background: ramp(1) }} /> older (median ≤ {yearDomain[0]}) ·
            <span className="rm-swatch" style={{ background: ramp(0.1) }} /> younger (≥ {yearDomain[1]}) ·
            <span className="rm-swatch nodata" /> no priority in record (NM · UT · NV · WY)
          </>
        )}
        {layer === "uses" && (
          <>
            <span className="rm-swatch" style={{ background: ramp(1) }} /> mostly irrigation ·
            <span className="rm-swatch" style={{ background: ramp(0.1) }} /> mostly other recorded uses
          </>
        )}
        {layer === "held" && (
          <>
            <span className="rm-swatch" style={{ background: ramp(1) }} /> mostly entity/agency-held ·
            <span className="rm-swatch" style={{ background: ramp(0.1) }} /> mostly individual holders
          </>
        )}
        {layer === "coverage" && (
          <>
            <span className="rm-swatch" style={{ background: ramp(0.55) }} /> scriptable public record ·
            <span className="rm-swatch nodata" /> record exists, not machine-readable
          </>
        )}
        <span className="rm-asof">Snapshot {fetched} · tap any county</span>
      </div>
      <DetailSheet data={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}
