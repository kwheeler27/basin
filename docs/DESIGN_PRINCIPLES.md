# Design Principles — Communicating Uncertainty and Scale

Two failure modes to design against. **Distortion**: making a number intuitive by making it wrong. **Paralysis**: hedging so thoroughly the reader learns nothing. Both are avoidable.

Contents: §1 charts answer questions · §2 epistemic encoding · §3
uncertainty shown · §4 scale anchors · §5 accounting concepts stay
separate · §6 overview to detail · §7 non-partisan framing · §8 visible
provenance · §9 bounded authority · §10 plain language · §11 no prior
knowledge assumed · §12 findings-first headings · §13 chart mechanics ·
§14 information architecture · §15 one visual language.

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

---

## 10. Plain language (Kevin's standing rule, 2026-08-23)

The register to aim for is Matt Levine's Money Stuff: complex things
explained simply, precisely, and directly — like a smart friend who happens
to know the material. Clarity is the value; cleverness is not. This ranks
alongside §7 and applies to every piece of narrative copy on the site.

- **Say the thing.** Lead with the point, then support it. If a sentence
  needs a second read, rewrite it.
- **Short declarative sentences.** One idea per sentence. Prefer the period
  to the semicolon.
- **Plain words wherever precision survives.** "Water left in storage," not
  "residual storage volumes." Where a technical term is load-bearing
  (consumptive use, priority date), keep it — and define it inline on first
  use, in one clause, without a detour.
- **Concrete over abstract.** Name the number, the place, the document.
- **No elegant variation.** The same thing gets the same name everywhere.
- **Clarity is not simplification.** Never make a number wrong to make it
  friendly — the scale anchors (§4) and accounting concepts (§5) still bind.
  Plain language is how the rigor stays readable.

Test: read the sentence aloud. If you wouldn't say it to a smart friend
across a table, rewrite it.

---

## 11. Assume no prior water knowledge (Kevin's standing rule, 2026-09-02)

The reader is smart but new: they don't know what an acre-foot is, who
"Reclamation" is, or that the basin has an Upper and a Lower half. Every
page must work for that reader without dumbing anything down (§10's
"clarity is not simplification" still binds).

- **First use teaches.** The first time a page leans on a term of art, the
  sentence carries the meaning — inline, in one clause — or the term wears
  a glossary card (the hover/tap definitions in `lib/glossary.ts`).
- **The glossary is the shared teaching layer.** One definition per
  concept, written once, surfaced everywhere (term cards in prose, chips in
  detail sheets, the /glossary page). Never fork a second wording of the
  same concept in page copy.
- **Numbers get human anchors.** Big volumes carry a household-scale or
  comparable everyday equivalent where the arithmetic is honest (the
  125,000-gallon household is the standing anchor).
- **Abbreviations are introduced, not assumed.** "13.15 million acre-feet"
  before "13.15 MAF" on any page where both appear.
- **Jargon that carries no precision dies.** If a plain word survives
  review by §5 (accounting concepts) and §10, use the plain word.

Test: hand the page to someone who has never read about the Colorado
River. If any sentence requires knowledge the page hasn't given them,
that sentence is a bug.

---

## 12. Lead with the finding, not the label (Kevin's standing rule, 2026-09-02)

Every heading over a chart, map, table, or section states the observation
the reader should walk away with — never the category of content. "Use is
falling," not "How it's changed." "A few desert counties take most of it,"
not "Where it happens." The label's job (what kind of thing this is) moves
into the supporting sentence.

- **Compute the claim from the data it sits above wherever possible**, and
  write conditional clauses to drop out when the data stops supporting
  them ("the lowest year in the record" must self-retract in a year that
  isn't). A heading that could silently go stale is a bug.
- **The finding is an observation, not a judgment.** §7 neutrality binds:
  "Two accounts paid 95% of it" passes; "reckless overdrawing" does not.
- **One finding per heading.** If the data shows two things, that's two
  sections or a subordinate clause — not a compound headline.
- **The finding must be visible in the figure beneath it.** If the reader
  can't confirm the claim by looking down, either the chart or the heading
  is wrong.

Test: cover the figure and read only the headings — they should retell the
page's argument on their own.

---

## 13. Chart mechanics (formalized 2026-09-03, from the landing-v8 practice)

§1 says what a chart is for, §2 how it encodes what we know, §12 what its
heading says. This section is the rest of the contract — the mechanics
that made PRs #87–#97 consistent, now binding.

- **An entity keeps its hue everywhere.** Powell is `#2b7fb8` and Mead is
  `#0c8f6b` on every chart on the site; a series never changes color
  because the view changed or a filter removed its neighbors. New entities
  claim a hue once, in CSS, with a dark-mode variant.
- **Identity never rides on color alone.** Two or more series get a
  legend AND direct labels at the line ends; a single series is named by
  the heading. Dark-mode variants are chosen, not inverted.
- **One accounting concept per chart** (§5's rule, restated where it
  bites): withdrawals, consumptive use, storage, and indexes never share
  an axis. Two views of the same books must *compute* their
  reconciliation in the caption ("the 6.50 MAF bar is the 2020–24 average
  of this line — 6.48 MAF here; the difference is rounding"), not assert
  it.
- **Gaps render as gaps.** A missing year breaks the line. The caption
  names why the gap exists and never lets an interpolation, a zero, or a
  partial sum stand in (a summed series with one missing member is a gap,
  not a smaller number).
- **Axes are honest by construction.** Multi-series charts start at zero.
  A single-series chart may truncate its axis only if the axis label says
  so in words ("y-axis starts at 5.2M, not zero"). Comparisons are
  same-span: a year-to-date is compared to the same span of the prior
  year, never to its full year.
- **Hover is a contract, not a decoration.** Hovering shows the value
  beside the mark it belongs to — never only in a remote readout. Hover
  and tap open the same detail; touch users lose nothing. Every detail
  surface carries source, vintage, unit, and accounting concept (§8).
- **Aspect serves the shape of the data.** Cap chart width before a
  panorama flattens the record; a chart's height is chosen from its
  domain, not from whatever the container allows.

Test: recolor-proof (cover the legend — end labels still identify every
line), gap-proof (delete one year from the data — the chart shows a hole
and the caption explains it), and reconciliation-proof (every number that
also appears in another chart can be recomputed from this one's caption).

---

## 14. Information architecture (formalized 2026-09-03; IA v3 record)

The standing rules that survive IA versions — docs/IA.md and the
decision records say what the current structure *is*; this says what any
structure must obey.

- **The landing is the argument.** One surface owns the narrative; no
  second surface may claim that job. Everything else is one of four
  kinds: evidence (chapters), operations (Now), instruments (Explore),
  or audit (Data). A new feature names its kind before it gets a home.
- **Edges are bidirectional and uniform.** Every landing claim links the
  chapter that defends it, with one wording and one style; every chapter
  names the claim it defends and offers the way back. An unlinked chapter
  is a scope conversation, not a nav entry.
- **URLs are commitments.** Restructures relabel and rewire; they never
  break a link. Retired routes redirect (308) or stay as-is — external
  citations must keep resolving.
- **Nav mirrors the reader's journey, not the org chart of the code.**
  Depth is reached through content (the evidence lines), not chrome
  (more tabs). Adding a tab requires showing the journey has a new stage.
- **After any move, sweep for positional copy.** "Below," "above," "this
  page," and old surface names go stale silently — grep for them in the
  same PR (the lesson has bitten twice).

Test: read the nav aloud as a journey ("what's happening → let me look →
show me the raw material") — if a tab doesn't fit the sentence, it
doesn't belong. And: every page answers "what kind of surface am I?" in
its first screenful.

---

## 15. One visual language (formalized 2026-09-03)

The site's style is a small grammar, applied everywhere — not a theme
per page.

- **Meaning owns the line style** (§2 is the authority): solid = observed;
  dashed = administrative reference, modeled, or a summed "rest" bucket —
  never a decorative choice. Warm accent (`#b45309` family) marks
  administrative references; status and series hues stay separate.
- **Text wears text colors.** Values, labels, and captions render in the
  ink/muted/faint scale; a colored mark beside them carries identity.
  Series color appears in text only for direct labels and hover values,
  always with a surface halo (`paint-order: stroke`) over busy ground.
- **The teaching layer has one look**: dashed underline = a term with a
  glossary card; superscript `[ref]` = a citation; a dashed-underlined
  kicker = a number with a source card. Three affordances, never mixed.
- **Badges are a closed set**: DISPUTED (two federal sources), data-clock
  (LIVE / ANNUAL / CENSUS / MODEL), and scope flags ("not a human use").
  A new badge kind needs a principle, not just a style.
- **Uppercase + letterspacing is structure** (kickers, section numbers,
  map layer labels) and never emphasis; emphasis is bold ink, used for
  the numbers and findings the beat exists to deliver.
- **Both themes are designed.** Colors live as tokens with explicit dark
  values; nothing is defined only for one theme; charts pick dark-mode
  hues deliberately (§13).

Test: screenshot any two pages side by side — a reader should be unable
to tell which shipped first.
