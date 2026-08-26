# Mission, Vision, Values

The top of the pyramid: every feature brief's "Why" should trace to this
document. Doctrine lives in `DESIGN_PRINCIPLES.md`, `docs/IA.md`, and the
repo `CLAUDE.md` hard rules; this page states what all of it is *for*.

## Mission

**Make the Colorado River system legible: what state it's in, why, and what
happens next — built from the primary record, readable by anyone, and
auditable down to every number.**

## Vision

The record of the river is public but scattered — PDF-only studies, agency
map servers, paywalled papers, seven states' incompatible filing systems,
and accounting concepts that don't add up unless you know which is which.
Nobody can read it whole. News coverage is episodic; official models are
authoritative but opaque.

Basin is the public's instrument for understanding a river system under
stress. One trustworthy place where a reader can:

- **check the river's state in a minute** — live, dated, provisional-when-provisional;
- **understand the forces driving it in an hour** — a readable report, not a wall of dashboards;
- **test the future for themselves** — a model you can push on, always shown beside the official projection;
- **and never take our word for a number** — every figure traceable to the agency of record.

Colorado River first. The architecture — basin-prefixed measures,
basin-scoped rulebooks, watershed-generic maps — is deliberately
basin-agnostic, so the second river system is a configuration, not a
rewrite.

## Values

1. **Trust is the product.** Everything else on this list serves it. A
   reader who catches us once being wrong-and-silent loses the site forever.
2. **The facts carry the argument.** No villains, no imputed motives, no
   editorial color. Positions are attributed; practices are explained before
   they are quantified. Every sentence should survive being read aloud by
   any party it describes.
3. **Honesty about what we don't know.** Missing data is a gap, never a
   zero. Projections are bands, never lines. Provisional says provisional.
   Where agencies disagree, both numbers appear. "Unquantified" is a valid,
   displayable state.
4. **Plain language.** Complex things explained simply and precisely — the
   Money Stuff register. Clarity is the value; cleverness is not. Never make
   a number wrong to make it friendly.
5. **The reader's independence.** The goal is not that readers believe us —
   it's that they can verify us. Sources, methods, and code are open;
   deep links make every view shareable and checkable.

## Operating principles

1. **Primary sources only.** Data comes from the agency of record — never
   through aggregators. Exceptions are named in `CLAUDE.md` and carry
   migration plans.
2. **The backbone before the surface.** One rigor contract for every
   dataset regardless of store: source, valid time, accounting concept,
   measurement class, revision history, freshness. Surfaces (monitor,
   report, instruments) draw from it; none owns private facts.
3. **Accounting concepts never mix silently.** Diversion, withdrawal,
   consumptive use, delivery, allocation — declared bridges or side-by-side
   display, never a silent sum. Same for measurement classes.
4. **Rules are data, verified.** Operating rules are versioned rulebooks
   encoded from the primary documents, adversarially reviewed, and evaluated
   by twin engines that cannot drift (Python computes, TypeScript replays,
   CI fails on mismatch).
5. **The twin never claims more authority than it has.** Reduced-form and
   says so; our projection always beside the official one; the backtest is a
   feature, not an appendix.
6. **Watch the record, don't assume it.** Publications and rule changes are
   detected by automated lookouts and verified against the agency page
   before a word on the site changes.
7. **Brief before build.** Features start with what/why/use-cases/solution,
   traced to this mission, reviewed before build time (see
   `~/projects/CLAUDE.md`, "Feature briefs").
8. **Ship small, same-day, verified.** Small PRs; CI green before merge;
   production verified after; both viewports eyeballed for anything visual.

## What Basin is not

Not an advocacy site — we don't rank policy options, we price them. Not a
news site — we cover the record, not the discourse. Not affiliated with the
Bureau of Reclamation or any agency — independence is load-bearing. Not a
replacement for CRSS/CRMMS — a reduced-form complement that says so on
every output.
