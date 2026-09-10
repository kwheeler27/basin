---
paths:
  - "apps/web/**"
  - "docs/**"
---

# Copy, headings, charts, and IA

Loaded when you touch `apps/web/**` or `docs/**`. These restate `docs/DESIGN_PRINCIPLES.md` §7 and §10–§15 (the shared rationale is the `design-doctrine` skill); read the section itself when a rule below is not enough.

- **Neutral register** (§7): no editorial color, no imputed motive; characterizations must be attributed or self-descriptions; the facts carry the argument. Test: every sentence survives being read aloud by any party it describes.
- **Plain language** (§10): simple, direct, unambiguous — Money Stuff register. Say the thing, short declarative sentences, plain words wherever precision survives, define load-bearing terms inline. Test: you'd say the sentence out loud to a smart friend.
- **Assume no prior water knowledge** (§11): first use of a term of art teaches it — inline or via a glossary card (`apps/web/lib/glossary.ts` is the single teaching layer; never fork a second wording); abbreviations introduced before used; big volumes carry the household anchor where honest.
- **Headings lead with the finding, not the label** (§12): every chart/map/section heading states the observation ("Use is falling"), computed from the data beneath it where possible and written to self-retract when the data stops supporting it — never a generic label ("How it's changed", "Where it happens").
- **Chart mechanics, IA, and visual style are principled** (§13–§15): fixed entity hues everywhere; identity never by color alone; one accounting concept per chart with computed reconciliation captions; gaps render as gaps; honest axes; hover = tap; the landing owns the argument (evidence/operations/instruments/audit are the only other surface kinds); URLs are commitments; the teaching-layer affordances and badge set are closed grammars.
