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
  /** Projected end-of-September 2026 elevation (≈ October 1) — the value
   * the 2027–2028 Operating Guidelines key Powell's WY2027 range on. */
  powellOct1Ft: 3516.16,
  notes:
    "WY2026 Powell release reduced from 7.48 to 6.00 MAF under SEIS ROD " +
    "§6.E; the study reflects 1.00 MAF of Drought Response Operations " +
    "releases from Flaming Gorge to Powell by April 2027.",
  /**
   * Succession note: the Post-2026 Record of Decision (2026-08-21) adopted
   * the Decision Framework, and the 2027–2028 Operating Guidelines now
   * govern 2027 operations. How they use 24-Month Study projections is to
   * be read from the guidelines themselves — ingestion queued.
   */
  operativeEdition:
    "2027 operations: 2027–2028 Operating Guidelines (issued with the Post-2026 ROD, 2026-08-21)",
} as const;
