/**
 * The official 24-Month Study projection — the number the operating rules
 * actually key on (DESIGN_PRINCIPLES §9: our illustration always appears
 * alongside the official projection). Updated when the lookout flags a new
 * edition; values are hand-extracted from the study PDF.
 */
export const OFFICIAL_24MS = {
  edition: "July 2026 Most Probable 24-Month Study",
  /** The PDF at the URL of record was last revised on this date. */
  revised: "2026-08-18",
  extracted: "2026-08-24",
  url: "https://www.usbr.gov/lc/region/g4000/24mo.pdf",
  /** Projected end-of-December 2026 elevations (≈ January 1, 2027). */
  powellJan1Ft: 3507.68,
  meadJan1Ft: 1037.31,
  notes:
    "WY2026 Powell release reduced from 7.48 to 6.00 MAF under SEIS ROD " +
    "§6.E; the study reflects 1.00 MAF of Drought Response Operations " +
    "releases from Flaming Gorge to Powell by April 2027.",
  /** The edition that legally sets next year's tiers. */
  operativeEdition: "August 2026 (not yet published at the URL of record)",
} as const;
