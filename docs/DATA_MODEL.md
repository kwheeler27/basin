# Canonical Data Model

The ingestion layer is a **semantic asset graph**, not a collection of ETL jobs. Every dataset is a versioned, typed asset with explicit lineage, units, cadence, and provenance.

---

## 1. Two graphs

**The asset graph** (Dagster, free): *"this table was produced by that job from those inputs."* Operational lineage — mechanical, about production.

**The semantic graph** (authored): *"this measure is Lake Mead storage, in acre-feet, a stock not a flux, observed rather than modeled, provisional, from RISE item 6124 — and it must never be summed with a consumptive-use figure even though both are acre-feet."*

The second must be authored, and it is the one the AI layer needs. The failure mode of an LLM narrative layer is not "couldn't find the table" — it is confidently conflating diversion with consumptive use, or comparing a legal allocation to a measurement as though they were the same kind of thing.

---

## 2. The measure registry

`packages/registry/measures/<basin>/**/*.yaml`, validated by JSON Schema. **The registry is the source of truth**; the pipeline is generated from it, so semantics cannot drift.

**Measure IDs carry a basin prefix** (`colorado.`) — the product is basin-agnostic and the Colorado is the first basin, not the boundary. Unprefixed IDs like `basin.upper.consumptive_use` would be meaningless across watersheds.

```yaml
id: colorado.reservoir.mead.storage
label: Lake Mead storage
description: >
  Volume of water held in Lake Mead, derived from measured pool elevation
  via Reclamation's area-capacity table.

quantity_kind: Volume                 # QUDT vocabulary
canonical_unit: acre_foot
measurement_class: observed           # see §3
accounting_concept: storage           # see §3
temporal_semantics: instantaneous     # a stock, not a flux
grain: P1D                            # ISO 8601 duration
calendar: water_year
spatial_ref: { type: reservoir, id: usbr.lake_mead }

provenance:
  agency: USBR
  system: RISE
  catalog_record: 4370
  catalog_item: 6124
  endpoint: https://data.usbr.gov/rise/api/result?itemId=6124
  retrieved_via: http_json
  license: public_domain_us_gov
  citation: >
    U.S. Bureau of Reclamation, Reclamation Information Sharing Environment
    (RISE), Lake Mead storage, item 6124. Accessed {access_date}.

revision_policy:
  status: provisional
  detect_via: updateDate
  note: "Provisional and subject to revision unless otherwise noted."

freshness:
  expected_cadence: P1D
  sla_hours: 36

uncertainty: none_published

caveats:
  - >
    Storage is derived from elevation via an area-capacity table that is
    periodically re-surveyed; sedimentation shifts the curve over decades,
    so historical storage values are not strictly comparable to modern ones.

not_comparable_with:
  - measure: colorado.upper_basin.consumptive_use
    reason: "Stock vs. flux. Same unit, different quantity."
  - measure: colorado.state.arizona.allocation
    reason: >
      Allocation is a legal entitlement, not a measurement. Meaningful only
      as "use vs. entitlement" — never as a sum or a shared total.
```

### Required fields

| Field | Purpose |
|---|---|
| `id` | Stable dotted slug. Never reused, never renamed without an alias. |
| `quantity_kind` | Physical dimension (QUDT). Makes unit conversion safe by construction. |
| `canonical_unit` | Storage unit. All conversion derives from this. |
| `measurement_class` | Epistemic class — see §3. |
| `accounting_concept` | Water-accounting semantics — see §3. |
| `temporal_semantics` | Aggregation legality — see §3. |
| `grain` | Native time step (ISO 8601 duration, or `irregular`). |
| `calendar` | `calendar_year \| water_year \| irrigation_season \| compact_year`. |
| `spatial_ref` | Typed reference into the geography table. |
| `provenance` | Agency, system, endpoint, license, citation template. |
| `revision_policy` | Status and how a revision is detected. |
| `freshness` | Expected cadence + SLA, drives Dagster asset checks. |
| `uncertainty` | How uncertainty is expressed, if at all. |
| `caveats[]` | Free text, surfaced in the UI next to the number. |
| `not_comparable_with[]` | Anti-join edges **with reasons**. |

---

## 3. The three enumerations that carry the weight

### `accounting_concept`

```
diversion | withdrawal | consumptive_use | depletion | return_flow
         | delivery | storage | evaporation | loss | allocation
```

Two measures sharing a unit but differing here **can never be summed** without a declared bridge. This is the single highest-value field in the schema — it is the difference between a credible water product and a misleading one.

- **diversion / withdrawal** — water physically removed at a headgate or intake.
- **consumptive_use** — diversion minus return flow. Reclamation's primary metric; the Compact's operative unit.
- **depletion** — effect on the river system, including timing and location adjustments. Used in Upper Basin modeling.
- **return_flow** — water returning to the river after use. Estimating it is the largest source of disagreement between studies.
- **allocation** — a legal entitlement. Not a measurement of anything (see `measurement_class: administrative`).

### `measurement_class`

```
observed | estimated | modeled | forecast | reconstructed | administrative
```

- **observed** — reservoir elevation, gauge discharge.
- **estimated** — consumptive use, evaporation.
- **modeled** — our simulation output, CRSS output.
- **forecast** — CBRFC seasonal volumes, 24-Month Study projections.
- **reconstructed** — tree-ring paleoflow, Reclamation naturalized flow.
- **administrative** — apportionments, tier thresholds, treaty obligations.

Never mixed on a chart without explicit visual distinction. See `DESIGN_PRINCIPLES.md` §2.

### `temporal_semantics`

```
instantaneous | interval_total | interval_mean | end_of_period | period_max
```

You cannot average an instantaneous reading or sum an interval mean. Encoding this makes a whole class of aggregation bug impossible to express.

---

## 4. Physical storage

**Hybrid**: one canonical measure-keyed table as system of record, plus narrow marts generated by dbt for serving.

```sql
-- system of record
CREATE TABLE observation (
  measure_id        text        NOT NULL REFERENCES measure(id),
  valid_time        timestamptz NOT NULL,   -- when the phenomenon occurred
  geography_id      text        NOT NULL REFERENCES geography(id),
  value_canonical   double precision,       -- always in the measure's canonical unit
  measurement_class text        NOT NULL,   -- denormalized: model output shares measure_id
  quality_flag      text,                   -- provisional | approved | estimated | missing
  -- lineage
  source_version    text        NOT NULL,   -- upstream revision identifier
  publication_time  timestamptz,            -- when the source published it
  ingested_at       timestamptz NOT NULL,
  snapshot_uri      text        NOT NULL,   -- R2 path to the raw payload
  revision_of       bigint      REFERENCES observation(id),
  -- model provenance (null for observations)
  model_version     text,
  rulebook_version  text,
  scenario_id       text,
  trace_id          int,                    -- ensemble member
  PRIMARY KEY (measure_id, valid_time, geography_id, measurement_class,
               COALESCE(scenario_id,''), COALESCE(trace_id,-1), source_version)
);
```

**Three time dimensions, always distinct:** `valid_time` (when it happened), `publication_time` (when the agency said so), `ingested_at` (when we saw it). Revisions are new rows linked by `revision_of` — never in-place updates. This makes "what did we believe on date X?" answerable, which the backtest requires.

**Marts** are generated per serving need — `mart_reservoir_daily`, `mart_swe_basin_daily`, `mart_water_balance`, `mart_projection`. Wide, indexed, exactly what the API reads.

### Supporting entities

`measure` · `geography` (PostGIS, typed: reservoir/station/reach/basin/HUC/state/county/project) · `source` · `dataset` · `unit` + `unit_conversion` · `rulebook` + `rule` · `scenario` · `model_run` · `crop` · `sector` · `water_user` · `tribe` · `allocation` · `glossary_term`.

---

## 5. Codegen targets

One registry, seven outputs:

| Target | Artifact |
|---|---|
| Python | `packages/model/measures.py` — Pydantic models |
| TypeScript | `packages/contracts/` — types + Zod schemas |
| Postgres | `measure` dimension rows + unit conversion table |
| Dagster | asset metadata, freshness policies, asset checks |
| **dbt** | `schema.yml` — descriptions, `accepted_values` tests on the three enums, `not_null`, relationships |
| AI layer | `ai/tools.json` — retrieval tool schema + grounding glossary |
| Docs | The Data Explorer page renders directly from the registry |

Adding a measure is one YAML file that propagates to the pipeline, the tests, the docs, the API types, and the AI's retrieval schema. dbt is a **consumer** of the semantic layer, never a second place semantics are written down.

---

## 6. Model outputs are measures

A projection is `colorado.reservoir.mead.storage` with `measurement_class: modeled` plus `model_version`, `rulebook_version`, `scenario_id`, `trace_id`, and `input_data_version`.

Two things fall out free:

1. **Observed history and modeled projection can legitimately share an axis**, because the distinction is typed rather than styled.
2. **The backtest is a query**, not a bespoke pipeline: same measure, same period, `measurement_class = 'modeled'` from a run dated T versus `measurement_class = 'observed'`.

---

## 7. Water years are first-class

Water year = **October 1 – September 30**, named for the ending calendar year. WY2026 runs 2025-10-01 → 2026-09-30.

`calendar` is a required registry field. Dagster partitions on water year where the source is water-year-native. **Never derive water year ad hoc in a query** — it is a dimension, not an expression.

Also present: irrigation season (crop and region dependent), and the Compact's accounting year for the ten-year running-average delivery obligation at Lees Ferry.
