/**
 * Static tile artifacts (Phase 3). The PMTiles archive is a single public
 * file on Vercel Blob read via HTTP range requests — no tile server. Built
 * by `python -m basin_ingest.rights.pipeline export-points` + tippecanoe;
 * re-uploaded on rights re-bakes (pathname is versioned by schema).
 */
export const RIGHTS_TILES_URL =
  "https://oqy316a8ts7fo0yw.public.blob.vercel-storage.com/tiles/rights-v1.pmtiles";
