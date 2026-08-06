/**
 * Formatting and scale anchors.
 *
 * Mirrors packages/ingest/basin_ingest/units.py — the same constants, because
 * both sides ultimately derive from the registry's canonical units. Anchors
 * never replace the canonical number; per docs/DESIGN_PRINCIPLES.md they
 * accompany it, and human-scale anchors are always labeled approximate.
 */

export const CUBIC_FEET_PER_ACRE_FOOT = 43_560;
export const LITERS_PER_CUBIC_FOOT = 28.316846592;
export const GALLONS_PER_CUBIC_FOOT = 7.480519480519481;

export const GALLONS_PER_ACRE_FOOT =
  CUBIC_FEET_PER_ACRE_FOOT * GALLONS_PER_CUBIC_FOOT; // 325,851.4
export const LITERS_PER_ACRE_FOOT =
  CUBIC_FEET_PER_ACRE_FOOT * LITERS_PER_CUBIC_FOOT; // 1,233,481.8

/** Midpoint of a 110,000–140,000 gal/yr household. Approximate by nature. */
export const HOUSEHOLD_GALLONS_PER_YEAR = 125_000;
export const HOUSEHOLD_ACRE_FEET_PER_YEAR =
  HOUSEHOLD_GALLONS_PER_YEAR / GALLONS_PER_ACRE_FOOT; // ~0.3836

export function acreFeet(value: number): string {
  if (Math.abs(value) >= 1_000_000)
    return `${(value / 1_000_000).toFixed(2)} MAF`;
  if (Math.abs(value) >= 1_000)
    return `${Math.round(value / 1_000).toLocaleString()} kaf`;
  return `${Math.round(value).toLocaleString()} AF`;
}

export function feet(value: number, digits = 2): string {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ft`;
}

export function percent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

export function signed(value: number, format: (n: number) => string): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${format(Math.abs(value))}`;
}

export interface Anchor {
  readonly label: string;
  readonly value: string;
  readonly approximate: boolean;
}

/** Intuitive framings of a volume in acre-feet. */
export function volumeAnchors(af: number): Anchor[] {
  const gal = af * GALLONS_PER_ACRE_FOOT;
  const households = af / HOUSEHOLD_ACRE_FEET_PER_YEAR;
  return [
    {
      label: "gallons",
      value:
        gal >= 1e12
          ? `${(gal / 1e12).toFixed(1)} trillion`
          : `${(gal / 1e9).toFixed(0)} billion`,
      approximate: false,
    },
    {
      label: "liters",
      value: `${(af * LITERS_PER_ACRE_FOOT / 1e12).toFixed(1)} trillion`,
      approximate: false,
    },
    {
      label: "household-years",
      value:
        households >= 1e6
          ? `${(households / 1e6).toFixed(1)} million`
          : `${Math.round(households / 1000).toLocaleString()} thousand`,
      approximate: true,
    },
  ];
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";
}

/** SVG path for a sparkline over the series' own min/max range. */
export function sparklinePath(
  values: readonly number[],
  width = 240,
  height = 40,
): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
