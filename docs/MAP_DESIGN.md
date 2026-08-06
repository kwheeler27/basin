# Map Design Doctrine

Extracted from practitioner sources 2026-08-03 (NYT graphics practice — Archie Tse's
Malofiej 2016 talk, Amanda Cox's Datawrapper interview; Axis Maps; ColorBrewer/Brewer;
British Cartographic Society 1999; Penn State cartography curriculum). Full sourced
research with confidence ratings lives in the planning transcript; items marked (inf.)
are reasoned synthesis, not direct citation.

**Every map view in Basin is checked against this list before it ships.**

## Message & structure
1. **One view, one message.** Each map state makes a single argument. (Cox: "one good chart is better than seven okay charts.")
2. **Scroll beats click.** Readers scroll; content gated behind steppers/tabs is mostly never seen. Story steps advance on scroll. (Tse)
3. **Never hide essentials in hover UI.** Tooltips are bonus color, not the message. (Tse)
4. **Concept before compilation.** Choose the message, then the layers — never "show what we have." (BCS 1999)

## Hierarchy & marks
5. **Squint test.** The first thing the eye hits must be the most important thing. (Axis Maps)
6. **One symbol system per view.** Never choropleth + multiple point shapes + flows at once — each added mark type multiplies decoding cost.
7. **Match technique to data:** graduated circles for magnitudes at points; flow lines (width ∝ volume) for movement; choropleth only for normalized rates.
8. **Figure-ground:** basemap pushed to near-white/gray "ground"; only the hero layer gets contrast.

## Color
9. **Sequential for ordered, diverging for midpointed, qualitative for categories.** Darker = more. Never rainbow. (Brewer)
10. **One saturated hue per view** — the hero layer. Everything else recedes.
11. **Don't be timid:** if two values differ meaningfully, the visual difference must be unmistakable. (Groger via Cox)

## Labels & annotation
12. **Halos, not outlines**, on labels over busy ground.
13. **Leader lines sparingly:** thin, consistent, no arrowheads, never touching the symbol.
14. **Verb-led headlines.** The biggest text is a claim ("Two reservoirs hold the savings — three-quarters empty"), not a topic label. (Cox)
15. **Words carry the argument** — annotate what to notice and why, on the map, not only around it.

## Motion
16. **Animate only when motion is the data** (wind maps animate a literal vector field). Ambient looping motion competes with reading. (inf. from Tse + wind-map genre)
17. **Motion at rest: none.** Transitions are triggered, one-shot, and settle. A flow path may draw in once when its step activates — then holds still.

## Interaction
18. **Assume tooltips are missed** — doubly so on touch.
19. **Mobile is a redesign, not a reflow:** fewer labels, fewer affordances, tap not hover.
20. **Zoom-dependent detail:** density reveals progressively.
21. **Guided steps first; free exploration unlocks at the end** — never the reverse.

## Applied to Basin's map
- Story spine, one hero layer per step: basin → storage → deliveries → people → farms → explore.
- Mark vocabulary capped at: **graduated circles** (with a ring+fill glyph for reservoirs), **lines** (solid river, dashed canal), and **text**. City squares and ag diamonds are deleted; their stories move into steps and annotations.
- One hue per step: blue (water/storage), orange (engineered deliveries), violet (people), teal (irrigation). Ink for text; land near-white.
- The county irrigation layer replaces curated ag markers (real data over hand-placed).
- Explore mode is one-layer-at-a-time (radio), not stacking toggles.
