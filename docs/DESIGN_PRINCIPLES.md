# Design Principles — Communicating Uncertainty and Scale

Two failure modes to design against. **Distortion**: making a number intuitive by making it wrong. **Paralysis**: hedging so thoroughly the reader learns nothing. Both are avoidable.

---

## 1. Every chart answers a question

Chart titles are **questions or claims**, never noun phrases. "Is Lake Mead recovering?" or "Lake Mead has lost 60% of its storage since 2000" — not "Lake Mead Storage 2000–2026." If a chart cannot be titled with a question the reader actually has, cut it.

Corollary: **prefer a cohesive story over a wall of dashboards.** Every view should connect to the system model, not float independently.

---

## 2. Epistemic class is visually encoded, always

`measurement_class` gets a consistent visual language across the entire product. A reader should be able to tell observation from projection without reading a legend.

| Class | Encoding |
|---|---|
| `observed` | Solid line, full opacity |
| `estimated` | Solid line, hatched fill, "est." in tooltip |
| `reconstructed` | Muted palette, distinct texture, always with method note |
| `forecast` | Dashed line + uncertainty band, hard visual break at "now" |
| `modeled` | Dashed line + band, plus model version and rulebook in the tooltip |
| `administrative` | Reference line or annotation — **never a data series** |

**Never plot an allocation as a time series alongside measured use** without explicit framing as "use vs. entitlement." They are different kinds of object.

**The "now" boundary is a hard visual break** — a vertical rule, a background shift, or both. The reader must never wonder whether they are looking at the past or the future.

---

## 3. Uncertainty is shown, not hidden

- **Ensemble output is a band, never a line.** P10/P50/P90 minimum. A single projection line implies precision the model does not have.
- **The band is labeled with what it means** — "80% of simulated traces fall in this range," not a bare shaded region.
- **Forecast skill is published.** The backtest page is not an appendix; it is a credibility feature. Show the error distribution against published 24-Month Studies, including the cases where we did worse.
- **Where agencies disagree, show both.** Upper Basin consumptive use appears as 3.8 and 4.3 MAF in different federal documents. Show both with a methodology note. Silently picking one is the failure mode.
- **Distinguish "unknown" from "zero."** Missing data is rendered as a gap, never interpolated silently. If interpolation is used anywhere, it is labeled.
- **Unquantified is a valid, displayable state.** Roughly 12 basin tribes have wholly unresolved claims. "Unquantified" is the honest value — not a blank cell, not zero.

---

## 4. The scale-anchor engine

One component, `<ScaleAnchor value={acreFeet} />`, used on every large number in the product. Anchors are computed from the registry's unit conversions, never hardcoded per-page.

### Conversions

```
1 acre-foot = 325,851 gallons
            = 43,560 cubic feet
            ≈ 1.233 million liters
1 square mile = 640 acres
```

### Anchors

| Anchor | Basis |
|---|---|
| **Household-years** | 125,000 gal/yr midpoint (range 110,000–140,000) ≈ **0.38 AF/yr** |
| **City equivalents** | Municipal deliveries from provider reporting |
| **Acres of alfalfa** | Water applied per acre from the USDA Irrigation & Water Management Survey |
| **Percent of river flow** | Against a stated baseline period — *always name the period* |
| **Percent of reservoir capacity** | Against full pool |
| **Area under depth** | For volume intuition |

### Worked example — a 3 MAF reduction

| Framing | Value |
|---|---|
| Gallons | ~978 billion |
| Liters | ~3.7 trillion |
| Share of modern annual flow | ~25% (against the ~12.4 MAF 2000–2025 average) |
| Share of the Lower Basin's nominal 7.5 MAF apportionment | ~40% |
| Household-years | ~7.9 million households for a year |
| Share of full Lake Mead storage | ~10% |
| Rhode Island under water | ~4.5 ft (land area, 1,034 mi²) |

**Rules for anchors:**
1. **State the basis.** "25% of the river" is meaningless without naming the baseline period — the 1906–2024 average and the 2000–2025 average differ by ~2 MAF.
2. **Never let the anchor replace the number.** Anchor and canonical value appear together, with the unit.
3. **At least two anchors of different kinds** for any headline figure — one human (households), one physical (depth, area). A single anchor invites over-anchoring.
4. **Anchors are approximate and say so.** Household use varies by region, lot size, and season.

---

## 5. Keep the water-accounting concepts separate

Diversion, withdrawal, consumptive use, depletion, return flow, and allocation are **never interchangeable and never silently summed**. This is enforced structurally by `accounting_concept` in the registry — but it also has to hold visually:

- Every number displays its accounting concept, not just its unit. "1.2 MAF" is incomplete; "1.2 MAF consumptive use" is a fact.
- Attempting to combine incompatible concepts surfaces the `not_comparable_with` reason string to the user rather than silently producing a number.
- The glossary is one click from any term, sourced from the registry so it cannot drift from the pipeline.

---

## 6. Overview to detail, always available

Every aggregate is decomposable. A basin figure opens to states; a state opens to sectors; a sector opens to users or crops where data allows. Where it *doesn't* allow — county-level NASS suppression, unquantified tribal rights — **the product says so** rather than showing a smooth aggregate that implies detail exists.

Raw values are preserved alongside simplified explanations. The Data Explorer is a first-class page, not a footer link.

---

## 7. Non-partisan framing

The subject is politically live: an unsigned Record of Decision, no seven-state consensus, active litigation posturing. Rules:

- **Attribute positions, don't adopt them.** "Arizona characterized the sideboards as unacceptable" — not "the sideboards are inadequate."
- **No villain framing.** Not "agriculture is wasteful," not "cities are the problem." Alfalfa persists because it is high-yielding, nutrient-dense, perennial, nitrogen-fixing, marketable, and suited to livestock systems — the product explains *why* a practice exists before quantifying its cost.
- **Tribal water rights are structural, not a callout box.** 30 federally recognized tribes; ~3.2 MAF of quantified entitlement (~22–26% of supply); roughly 12 tribes with unresolved claims; the Northeastern Arizona settlement pending in Congress, **not enacted**. Present quantified, unquantified, and pending as first-class states.
- **Policy levers are presented with tradeoffs, not rankings.** Crop switching, deficit irrigation, fallowing, water markets, and genetics each have costs borne by someone specific. Name who.
- **Neutral register — the facts carry the argument** (made explicit 2026-08-06, prompted by Markets-page copy). Narrative prose states what the record shows, in the words the record supports, and nothing more:
  - No editorial color: not "a company no one had heard of," not "went shopping for water" — write "GSC Farm, LLC contracted for…," "acquired…"
  - No imputed motive, ever. Intent appears in no filing. Fact patterns (buy → hold → transfer application) are presented; the reader draws conclusions.
  - Characterizations are attributed or self-descriptions: "which describes itself as…," "the Republic identifies it as…" — never our own epithet for an entity.
  - Analytic claims ("the strongest tracker," "the only basins that can legally export") are allowed only when they restate a verifiable, sourced comparison — of data or law, not of actors' character.
  - The test: every sentence should survive being read aloud by any party to the transaction. If a sentence would sound like an accusation or an endorsement to one of them, rewrite it as what the record says.

---

## 8. Provenance is visible, not buried

Every number carries source, timestamp, unit, and definition — reachable without leaving the page. A hover reveals: source agency, dataset, retrieval time, publication time, measurement class, revision status, and caveats.

**"Provisional" is a visible badge**, not a footnote. It is the default state across Reclamation and USGS data — including figures years old. Reclamation revised Powell's WY2026 release from 7.48 to 6.00 MAF mid-year; the UI must make clear that today's number may not be tomorrow's.

Freshness is displayed per source, with staleness surfaced when a source misses its SLA. A silent stale number is worse than a visible gap.

---

## 9. The twin never claims more authority than it has

- Our projection **always** appears alongside the official one where an official one exists.
- "Reduced-form" appears in the interface, not just the about page.
- The backtest is linked from every projection view.
- The rulebook version in force is stated on every scenario output.
- When the model disagrees with Reclamation, that is **shown and explained**, not smoothed.
