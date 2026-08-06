-- Basin — canonical schema.
-- The `measure` dimension is GENERATED from the registry (db/seed/measures.gen.sql).
-- This file holds the tables that are not registry-derived.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------- geography

CREATE TABLE IF NOT EXISTS geography (
  id          text PRIMARY KEY,              -- e.g. usbr.lake_mead, usgs.09380000
  type        text NOT NULL,                 -- reservoir | station | gauge | basin | huc | state | ...
  name        text NOT NULL,
  basin       text NOT NULL DEFAULT 'colorado',
  huc         text,                          -- hydrologic unit code where applicable
  parent_id   text REFERENCES geography(id),
  geom        geometry(Geometry, 4326),
  properties  jsonb NOT NULL DEFAULT '{}',
  valid_from  date,                          -- stations open/close; membership is not static
  valid_to    date
);
CREATE INDEX IF NOT EXISTS geography_type_basin_idx ON geography (basin, type);
CREATE INDEX IF NOT EXISTS geography_huc_idx ON geography (huc);
CREATE INDEX IF NOT EXISTS geography_geom_idx ON geography USING gist (geom);

-- ------------------------------------------------------------- observations
--
-- System of record. Measure-keyed and append-only: a revised upstream value
-- becomes a NEW row pointing at what it supersedes via revision_of. This is
-- what makes "what did we believe on date X?" answerable, which the backtest
-- against published 24-Month Studies depends on.
--
-- Three time dimensions, never conflated:
--   valid_time       when the phenomenon occurred
--   publication_time when the agency published it
--   ingested_at      when we saw it

CREATE TABLE IF NOT EXISTS observation (
  id                bigserial PRIMARY KEY,
  measure_id        text        NOT NULL REFERENCES measure(id),
  valid_time        timestamptz NOT NULL,
  geography_id      text        NOT NULL REFERENCES geography(id),
  value_canonical   double precision,        -- NULL means genuinely missing, never zero
  measurement_class text        NOT NULL,    -- denormalized: model output shares a measure_id
  quality_flag      text,                    -- provisional | approved | estimated | missing

  -- lineage
  source_version    text        NOT NULL,    -- upstream revision identifier
  publication_time  timestamptz,
  ingested_at       timestamptz NOT NULL DEFAULT now(),
  snapshot_uri      text        NOT NULL,    -- immutable raw payload in R2
  revision_of       bigint      REFERENCES observation(id),
  superseded        boolean     NOT NULL DEFAULT false,

  -- water year, materialized because it is a dimension, not an expression
  water_year        smallint    NOT NULL,

  -- model provenance (NULL for observations)
  model_version     text,
  rulebook_version  text,
  scenario_id       text,
  trace_id          integer,
  input_data_version text
);

-- Natural key. COALESCE-wrapped so observations (no scenario/trace) and model
-- output (many traces per scenario) share one table without collision.
CREATE UNIQUE INDEX IF NOT EXISTS observation_natural_key
  ON observation (
    measure_id, valid_time, geography_id, measurement_class,
    COALESCE(scenario_id, ''), COALESCE(trace_id, -1), source_version
  );

-- Serving path: current (non-superseded) values for a measure over time.
CREATE INDEX IF NOT EXISTS observation_serving_idx
  ON observation (measure_id, geography_id, valid_time DESC)
  WHERE superseded = false AND scenario_id IS NULL;

CREATE INDEX IF NOT EXISTS observation_water_year_idx ON observation (measure_id, water_year);
CREATE INDEX IF NOT EXISTS observation_scenario_idx ON observation (scenario_id, trace_id)
  WHERE scenario_id IS NOT NULL;

-- ------------------------------------------------------------------ sources

CREATE TABLE IF NOT EXISTS ingest_run (
  id            bigserial PRIMARY KEY,
  adapter       text        NOT NULL,
  measure_id    text        REFERENCES measure(id),
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  status        text        NOT NULL DEFAULT 'running',  -- running | ok | failed | skipped
  rows_written  integer     NOT NULL DEFAULT 0,
  rows_revised  integer     NOT NULL DEFAULT 0,
  snapshot_uri  text,
  error         text
);
CREATE INDEX IF NOT EXISTS ingest_run_recent_idx ON ingest_run (adapter, started_at DESC);

-- ---------------------------------------------------------------- rulebooks
--
-- Operating rules are versioned config, never hardcoded. Every model output
-- records which rulebook produced it. See docs/OPERATING_RULES.md.

CREATE TABLE IF NOT EXISTS rulebook (
  version      text PRIMARY KEY,             -- e.g. v2007-ig-dcp, v-post2026-preferred
  basin        text NOT NULL DEFAULT 'colorado',
  label        text NOT NULL,
  effective_from date,
  effective_to   date,
  status       text NOT NULL,                -- in_force | superseded | proposed | draft
  authority    text NOT NULL,                -- citation of the governing instrument
  notes        text,
  rules        jsonb NOT NULL                -- tier tables, thresholds, per-instrument bands
);
