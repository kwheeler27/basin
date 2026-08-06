/**
 * Bake Arizona's groundwater transportation basins (Markets map overlay).
 *
 * Under A.R.S. §45-551 et seq., groundwater may be transported from rural
 * basins to Active Management Areas (the urban zones) ONLY from named
 * basins: McMullen Valley, Butler Valley, the Harquahala INA, and the Big
 * Chino subbasin. These polygons are therefore the legal geography of
 * "where rural Arizona groundwater can be sold to cities."
 *
 * Source: ADWR's public ArcGIS org (services.arcgis.com/C34zQ7veRS0V1t04) —
 * Groundwater_Basin_2024 (three basins) + ADWR_Groundwater_Subbasin_2024
 * (Big Chino). Geometry generalized (~500m) for a small static map.
 *
 *   node scripts/build-az-basins.mjs   (run from apps/web)
 */
import { writeFileSync } from "node:fs";

const ORG = "https://services.arcgis.com/C34zQ7veRS0V1t04/arcgis/rest/services";
// maxAllowableOffset is in outSR units: 0.005° ≈ 500m at this latitude.
const SIMPLIFY = "maxAllowableOffset=0.005&geometryPrecision=4&outSR=4326";

async function grab(service, where, label) {
  const url = `${ORG}/${service}/FeatureServer/0/query?where=${encodeURIComponent(where)}&outFields=*&${SIMPLIFY}&f=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
  const gj = await res.json();
  if (!gj.features?.length) throw new Error(`${label}: no features`);
  return gj.features;
}

const basins = await grab(
  "Groundwater_Basin_2024",
  "BASIN_NAME IN ('MCMULLEN VALLEY','BUTLER VALLEY','HARQUAHALA INA')",
  "basins",
);
const bigChino = await grab(
  "ADWR_Groundwater_Subbasin_2024",
  "SUBBASIN_NAME = 'BIG CHINO'",
  "big chino",
);

const features = [
  ...basins.map((f) => ({
    type: "Feature",
    properties: { name: titleCase(f.properties.BASIN_NAME), kind: "basin" },
    geometry: f.geometry,
  })),
  ...bigChino.map((f) => ({
    type: "Feature",
    properties: { name: "Big Chino (subbasin)", kind: "subbasin" },
    geometry: f.geometry,
  })),
];
if (features.length !== 4)
  throw new Error(`expected 4 export-basin features, got ${features.length}`);

function titleCase(s) {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bIna\b/, "INA")
    .replace(/\bMcmullen\b/, "McMullen");
}

const out = {
  type: "FeatureCollection",
  source:
    "Arizona Department of Water Resources — Groundwater_Basin_2024 / ADWR_Groundwater_Subbasin_2024 (public ArcGIS feature services). Legal basis: A.R.S. §45-551 et seq. (groundwater transportation to AMAs).",
  fetched: new Date().toISOString().slice(0, 10),
  features,
};
writeFileSync("public/geo/az_export_basins.json", JSON.stringify(out));
console.log(
  `${features.length} export-basin polygons → public/geo/az_export_basins.json (${JSON.stringify(out).length} bytes)`,
);
