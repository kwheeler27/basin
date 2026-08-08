/**
 * Crop composition for the West's largest irrigation counties, from the USDA
 * NASS Cropland Data Layer (2023) baked by scripts/build-crops.mjs.
 *
 * The eight display categories below are a presentation grouping of CDL's
 * per-crop classes — the underlying classes are preserved in the bake and in
 * each bar's detail. "Feed & forage" acreage elsewhere on the page counts
 * CDL alfalfa (36) + other hay (37) only; grain fed to livestock is not
 * included in that figure.
 */

import crops from "@/public/geo/crops_counties.json";

export interface CropEntry { code: number; name: string; acres: number }
export interface CropCounty {
  fips: string;
  county: string;
  st: string;
  irrigationMgd: number;
  pixelSizeM: number;
  croplandAcres: number;
  feedForageAcres: number;
  crops: CropEntry[];
}

export const CROPS_META = crops as unknown as {
  source: string;
  year: number;
  fetched: string;
  sampling: string;
  counties: CropCounty[];
};

/** Fixed category order = stack order = legend order. Palette is Okabe-Ito
 *  (colorblind-safe), adjacency-validated; fallow re-stepped to #c9c9c9. */
export const CROP_CATEGORIES = [
  { key: "alfalfa", label: "Alfalfa", color: "#D55E00" },
  { key: "hay", label: "Other hay", color: "#E69F00" },
  { key: "grains", label: "Grains", color: "#F0E442" },
  { key: "cotton", label: "Cotton", color: "#CC79A7" },
  { key: "vegetables", label: "Vegetables & melons", color: "#009E73" },
  { key: "orchards", label: "Orchards, nuts & vines", color: "#0072B2" },
  { key: "other", label: "Other crops", color: "#56B4E9" },
  { key: "fallow", label: "Fallow / idle", color: "#c9c9c9" },
] as const;

export type CategoryKey = (typeof CROP_CATEGORIES)[number]["key"];

const GRAIN_WORDS = ["Corn", "Wheat", "Barley", "Oats", "Millet", "Sorghum", "Triticale", "Rye", "Small Grains", "Rice"];
const ORCHARD_WORDS = ["Almonds", "Pistachios", "Walnuts", "Grapes", "Citrus", "Cherries", "Prunes", "Olives", "Peaches", "Tree Crops", "Pecans", "Apples", "Pomegranates", "Apricots", "Plums", "Nectarines"];
const VEG_WORDS = ["Tomatoes", "Lettuce", "Carrots", "Onions", "Greens", "Vegs", "Sugarbeets", "Beans", "Cantaloupe", "Melons", "Peppers", "Potatoes", "Garlic", "Broccoli", "Cabbage", "Squash", "Cucumbers", "Strawberries", "Watermelons", "Peas"];

/** Map a CDL class name to a display category (double-crops: lettuce pairs
 *  count as vegetables; remaining grain/cotton pairs by their named grain). */
export function categorize(name: string): CategoryKey {
  if (name === "Alfalfa") return "alfalfa";
  if (name.includes("Hay")) return "hay";
  if (name.includes("Fallow")) return "fallow";
  if (name.includes("Lettuce")) return "vegetables";
  if (name.includes("Cotton")) return "cotton";
  if (GRAIN_WORDS.some((w) => name.includes(w))) return "grains";
  if (ORCHARD_WORDS.some((w) => name.includes(w))) return "orchards";
  if (VEG_WORDS.some((w) => name.includes(w))) return "vegetables";
  return "other";
}

export interface CountyMix {
  county: CropCounty;
  /** Acres per category; top-8 classes categorized, remainder of mapped
   *  cropland lands in "other". */
  byCategory: Record<CategoryKey, number>;
  feedSharePct: number;
}

export function countyMixes(): CountyMix[] {
  return CROPS_META.counties.map((c) => {
    const byCategory = Object.fromEntries(CROP_CATEGORIES.map((k) => [k.key, 0])) as Record<CategoryKey, number>;
    let listed = 0;
    for (const cr of c.crops) {
      byCategory[categorize(cr.name)] += cr.acres;
      listed += cr.acres;
    }
    byCategory.other += Math.max(0, c.croplandAcres - listed);
    return {
      county: c,
      byCategory,
      feedSharePct: (100 * c.feedForageAcres) / c.croplandAcres,
    };
  });
}
