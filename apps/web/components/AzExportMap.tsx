import { geoConicConformal, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import statesTopo from "@/public/geo/states-10m.json";
import basins from "@/public/geo/az_export_basins.json";

/**
 * Where privatization can cash out — Arizona's groundwater transportation
 * basins (A.R.S. §45-551): the only rural basins whose groundwater may
 * legally be moved to the urban Active Management Areas. Static,
 * server-rendered SVG: one message, one hue, still at rest.
 */

const W = 560;
const H = 520;

const AMAS = [
  { name: "Phoenix", lon: -112.074, lat: 33.448 },
  { name: "Prescott", lon: -112.47, lat: 34.54 },
];

export function AzExportMap() {
  const t = statesTopo as unknown as Parameters<typeof feature>[0] & {
    objects: { states: Parameters<typeof feature>[1] };
  };
  const states = feature(t, t.objects.states) as unknown as GeoJSON.FeatureCollection;
  const az = states.features.find((f) => String(f.id).padStart(2, "0") === "04");
  if (!az) return null;

  const projection = geoConicConformal()
    .parallels([31, 37])
    .rotate([111.5, 0])
    .fitExtent(
      [
        [16, 16],
        [W - 16, H - 16],
      ],
      az as GeoJSON.Feature,
    );
  const path = geoPath(projection);
  const pt = (lon: number, lat: number) => projection([lon, lat]) ?? [0, 0];

  const fc = basins as unknown as GeoJSON.FeatureCollection;

  return (
    <div className="azmap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Arizona map showing the four groundwater basins whose water may legally be transported to urban Active Management Areas"
      >
        <path d={path(az) ?? undefined} className="azmap-state" />
        {fc.features.map((f) => {
          const name = (f.properties as { name: string }).name;
          const [[x0, y0], [x1, y1]] = path.bounds(f);
          const cy = (y0 + y1) / 2;
          // Adjacent basins collide at centroids — place each label off its
          // own bounding box instead: Butler west, McMullen east, the rest
          // above/below.
          const lab =
            name === "Butler Valley"
              ? { x: x0 - 6, y: cy + 4, anchor: "end" as const }
              : name === "McMullen Valley"
                ? { x: x1 + 6, y: cy + 4, anchor: "start" as const }
                : name === "Harquahala INA"
                  ? { x: (x0 + x1) / 2, y: y1 + 15, anchor: "middle" as const }
                  : { x: (x0 + x1) / 2, y: y0 - 8, anchor: "middle" as const };
          return (
            <g key={name}>
              <path d={path(f) ?? undefined} className="azmap-basin" />
              <text
                x={lab.x}
                y={lab.y}
                className="azmap-label"
                style={{ textAnchor: lab.anchor }}
              >
                {name}
              </text>
            </g>
          );
        })}
        {AMAS.map((a) => {
          const [x, y] = pt(a.lon, a.lat);
          return (
            <g key={a.name}>
              <circle cx={x} cy={y} r={4} className="azmap-ama" />
              <text x={x + 8} y={y + 4} className="azmap-ama-label">
                {a.name} AMA
              </text>
            </g>
          );
        })}
        <text x={16} y={H - 14} className="azmap-note">
          Shaded: the only basins allowed to export groundwater to the AMAs.
        </text>
      </svg>
    </div>
  );
}
