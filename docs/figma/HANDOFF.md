# Basin × Figma — session hand-off

**Written:** 2026-09-09, from the session that created the Basin Figma file and captured the site into it.
**For:** the next session doing Basin design and design-to-code work. Self-contained: it does not rely on the previous session's memory.
**Read next, in this order:** `CLAUDE.md` (repo rules), `docs/DESIGN_PRINCIPLES.md` (house design doctrine, Basin binding), `~/projects/DESIGN_FOUNDATIONS.md` (the 12 universal principles, agent-readable), `docs/MISSION.md`, `docs/IA.md`.

---

## 1. Scope of the new session

**In scope**
1. Generate Basin's design system in Figma from the codebase: variables (with Light and Dark modes), text styles, and components.
2. Rebuild the landing page (desktop + phone) and one chapter (Reservoirs) in Figma from those components, using the existing pixel captures as layout references, then delete the captures.
3. Map Figma components to code with Code Connect so design reads return Basin's component names.
4. Run the first design-to-code loop on a real Basin feature (candidates in §7).
5. Small repo fixes listed in §6 (each its own PR; Kevin merges).

**Out of scope here:** Ledger's Figma work (separate tutorial, separate file), Penny, and anything that touches the data model, registry, or Python packages.

---

## 2. Figma: current state

| Item | Value |
|---|---|
| File | **Basin** — https://www.figma.com/design/o4uvAOk20uMQ4u1u97JNNW |
| File key | `o4uvAOk20uMQ4u1u97JNNW` |
| Where it lives | The connected account's **Professional** team (a household Full seat, not Kevin's own account). Run `whoami` to see the plan key; the same account also has a Starter team with only a View seat, which cannot be written to. |
| Seat implications | Full seat on Professional: writing via `use_figma` works, variable collections may have up to 10 modes (so Light + Dark in one collection), pages are unlimited, and libraries can be published. Read calls are rate-limited (roughly 200/day, 15/min); write calls are exempt during the beta. |
| Pages | One page, still named `Page 1` (id `0:1`). No variables, styles, or components exist yet. |

**Frames on Page 1** (all raw captures, no components):

| Node id | Name | Size | Notes |
|---|---|---|---|
| `15:2` | Landing · 1440 · capture | 1440 × 8150 | Complete. Charts, §1 consumption minimap, §3 basin map all in their real colors. |
| `16:2` | Landing · phone 385 · capture | 385 × 9388 | Complete, same fixes, true phone emulation. |
| `2:2` | Reservoirs · 1440 · capture | 1440 × 1884 | `/report/reservoirs`. Good as captured (the drawdown chart's lines are editable vectors). |

Figma's own guidance for these: use them as layout references while rebuilding screens from components, then delete them.

**Tools and skills (Figma plugin `figma@claude-plugins-official`, already installed and authenticated):**
- Read: `get_metadata` (no `nodeId` = list pages), `get_design_context`, `get_screenshot` (returns a URL; `curl` it), `get_variable_defs`.
- Write: `use_figma` (Plugin API JS). **Load the `figma-use` skill first, every session.** For the library also load `figma-generate-library`; for screens also `figma-generate-design`; for mapping `figma-code-connect`.
- Capture: `generate_figma_design` (see the routine in §5).
- Rules learned the hard way: `use_figma` scripts must `return` data (no `console.log`, no `figma.notify`), colors are 0–1 floats, fills are read-only arrays (clone and reassign), fonts must be loaded before touching text, keep each script to about 10 operations, page switches use `await figma.setCurrentPageAsync(page)`.

---

## 3. Basin repo facts the design work needs

- **Path:** `~/projects/basin`, pnpm workspace. Web app: `apps/web` (`@basin/web`, Next.js 16, React 19). Scripts: `dev`, `build`, `start`, `typecheck`, `qa:map`.
- **Branch state at hand-off:** checked out on `feat/runoff-efficiency` with one commit ahead of `origin/main` ("Runoff efficiency: the same snow now buys less river"). Do not build on it; branch from `main` for anything new. A stray `shot-hover.tmp.mjs` sits at the repo root; check whether it is meant to exist.
- **Routes:** `/` (landing, the argument), `/current-state` (Now), `/explore`, `/explore/map`, `/data`, `/glossary`, `/references`, `/report`, `/report/{demand,agriculture,supply,reservoirs,water-rights,the-system,wy2026,...}` (8 chapters).
- **Components (`apps/web/components`):** Nav, Chapter, Figure, KickerNote, Term, Cite, SourceBadge, DetailSheet, ReservoirCard, StorageTopline, StorageByReservoir, StorageHistoryLine, DrawdownChart, ConsumptionLine, ConsumptionMiniMap, BasinStory (the landing map), RightsMap, RightsPointsMap, RightsDrillIn, AzExportMap, MachineExplorer, WhatIf, WyStory, RankedBars, DeliveryPareto, CropMix, CanalChart, ElevationProfile, ElevationSeries, InflowTopline, MiniSeries, SnowFlowScatter, SnowPrecipHistory, SupplySeries, SystemChain, UseVsEntitlement, RulesToday, DroughtPanel.
- **Design tokens (`apps/web/app/globals.css`, `:root`):** `--bg #f7f8f7`, `--surface #ffffff`, `--surface-2 #f0f2f1`, `--border #dfe3e1`, `--text #14201c`, `--muted #5d6b66`, `--faint #8a9691`, `--accent #0d6e63`, `--water #2b7fb8`, `--warn #b4560f`, `--danger #a32c1d`, `--grid #e6eae8`, `--radius 10px`, `--mono` stack. Dark values live in `@media (prefers-color-scheme: dark)` blocks (lines ~18, ~684, ~702, ~755). Map layers are classes: `.st-state`, `.st-state.basin`, `.st-watershed`, `.st-river`, `.st-store`, `.st-label…` (landing map) and `.mm-*` (consumption minimap).
- **Entity hues** (fixed per reservoir across every chart, per DESIGN_PRINCIPLES §13): not defined as `--` variables in `:root`; locate them (component files or class rules) before creating Figma variables, and treat wherever they live as the single source.
- **Docs:** `docs/DESIGN_PRINCIPLES.md`, `docs/IA.md`, `docs/MAP_DESIGN.md`, `docs/MISSION.md`, `docs/decisions/` (README + `2026-09-03-ia-v3-report-consolidation.md`). Key decisions get a record in `docs/decisions/` before the build (template in `~/.claude/skills/new-project/templates/DECISION.template.md`).
- **Change flow:** GitHub `kwheeler27/basin` is public and Apache-2.0. Feature branch → PR → **Kevin merges** anything with product judgment or public-facing claims. Every PR gets a Vercel preview; review visual changes there. Never commit secrets.

---

## 4. Findings and learnings

**About Figma's capture (Code to Canvas) on Kevin's sites**
1. The tool insists external URLs need Playwright. Kevin's own sites have no Content-Security-Policy, so injecting `<script src="https://mcp.figma.com/mcp/html-to-design/capture.js">` from a browser tool and loading the page with the `#figmacapture=…&figmaendpoint=…&figmadelay=…` hash works. Add a throwaway query string (`?capture=x`) so a fragment-only change still reloads the page.
2. **The capture only runs in a visible tab.** Hidden tabs never finish, never resize, and never mount lazy content. The in-app Browser pane (opened by Kevin) is the reliable surface; it also emulates a real 375-px phone. The Chrome extension's own window can sit minimized (it reported 117×59 px) and everything silently stalls.
3. **Class-based SVG fills are dropped.** Basin's map shapes carry only class names; their fills come from CSS rules built on `var(--surface)` and `color-mix()`. The capture keeps fills written on the element and loses these, so paths import with SVG's default fill, black. Circles with a literal-hex `color-mix()` survived. Fix used: before capture, copy each SVG element's computed `fill`/`stroke`/`stroke-width` onto the element as attributes and inline style, converting `color(srgb r g b / a)` to `rgba()`.
4. **Lazily mounted content is missing unless the page was scrolled.** Charts and the §1 minimap mount when they scroll into view (`BasinStory.tsx` and `WyStory.tsx` use IntersectionObserver; the chart components render client-side). Unscrolled captures came out 6354 px tall with blank chart areas; primed captures are 8150 px.
5. Captures land as **frames on the current page**, not new pages, and get the page `<title>` as their name. Each capture ID is single-use; a duplicate submit returns 409 harmlessly. Navigating away before the POST completes kills the capture. The in-app pane's network monitor records nothing; poll `generate_figma_design` instead.
6. Paragraphs dense with inline `Term` spans render with overlapping text in Figma. The `Term` card itself is not in the DOM when closed, so this is the capture's handling of wrapped inline spans, not a site bug. Expect to retype those paragraphs when rebuilding from components.
7. The map's label halos (`paint-order: stroke`) import as text outlines. Acceptable in a reference frame; rebuild labels as text with a background in the component version.

**About Basin's front end (from the capture work)**
8. The token layer is clean and small (12 color/size tokens plus dark blocks) and maps directly onto a Figma variable collection with two modes.
9. Everything user-facing is CSS-var driven, which is right for the site and wrong for any consumer that reads raw SVG (Figma import, Open Graph images, print-to-PDF, RSS). Anything that exports Basin visuals needs a "resolve the CSS onto the SVG" step; see §6.

---

## 5. The capture routine that works (keep for future pages)

Requires the in-app Browser pane to be open and visible. One capture per page.

1. `generate_figma_design({ fileKey })` → capture ID + hash URL.
2. `preview_start({ url: "<page>?capture=<tag>#figmacapture=<id>&figmaendpoint=<encoded submit url>&figmadelay=3000" })`. Plain `navigate` was refused while the pane was closed; `preview_start` opened it.
3. `resize_window` — `{width: 1440, height: 900}` for desktop, `{preset: "mobile"}` for phone. Wait ~5 s.
4. Scroll-prime (JavaScript in page): step `window.scrollTo(0, y)` by 450 px to the bottom with ~140 ms pauses, then back to top, wait 1.5 s. Confirm `document.documentElement.scrollHeight` grew (≈8150 at 1440).
5. Inline SVG colors (JavaScript in page): for every `svg, svg *`, read `getComputedStyle`, convert `color(srgb …)` → `rgba()`, set `fill`, `stroke`, `stroke-width` as attributes and inline style, plus `fill-opacity`/`stroke-opacity` when not 1.
6. Inject capture.js (`<script src=…>`, await `onload`). The hash makes it auto-submit after `figmadelay`.
7. Wait ~20 s, then poll `generate_figma_design({ fileKey, captureId })` until it returns the node id. Rename the frame with `use_figma`.

---

## 6. Recommended improvements and fixes

Ordered by value. Each repo item is a small PR; Kevin merges.

1. **Add a "capture mode" to the web app** (`?capture=1`, read once in `app/layout.tsx` or a tiny client component). In this mode: disable lazy mounting so every chart and map renders immediately; run the SVG style-inlining routine from §5 after hydration; and include the Figma capture script. Keep the flag out of normal traffic (never on by default; consider preview-only). This turns the seven-step routine into "open the URL with the flag" and also serves Playwright QA and any future screenshot pipeline.
2. **Make SVG exports self-describing.** Wherever Basin renders SVG that leaves the browser (OG images, downloads, print), resolve tokens to literal colors at render time. The capture-mode inliner is the same code; factor it as `apps/web/lib/inlineSvgStyles.ts` and reuse.
3. **Centralize the entity hue registry** if it is not already one object: a single `lib/hues.ts` (or a `:root` block) that both the charts and the Figma variables are generated from. DESIGN_PRINCIPLES §13 requires fixed hues everywhere; a single source makes the Figma library provably consistent.
4. **In the Figma file:** rename `Page 1` → `00 Captures (reference)`; create `01 Tokens & Components` and `02 Screens`. Generate the library with Light and Dark as two modes of one `Color` collection (the Professional seat allows it), `Space` and `Radius` collections, and text styles matching `globals.css`. Then rebuild screens on `02 Screens` and delete the captures.
5. **Repo hygiene:** decide the fate of `shot-hover.tmp.mjs`; land or close the `feat/runoff-efficiency` branch before starting design PRs so nothing stacks.
6. **Process:** add this file's §5 routine to `docs/figma/` permanently (this hand-off can be trimmed into `docs/figma/CAPTURE.md` once the capture mode exists) and record the "Figma as design tool of record" decision in `docs/decisions/` when the library lands, since it is a tooling choice that is expensive to reverse.

---

## 7. Plan for the session

1. **Orient (read-only):** `get_metadata` on the file; `use_figma` inspection script listing pages, frames, variable collections. Grep `apps/web/app/globals.css` and the chart components for hues.
2. **Library (Prompt A below):** variables with Light/Dark modes, text styles, then components one at a time: Nav, Figure frame (heading + figure + caption + source badge), Stat tile (`13.15 MAF` topline), Ranked bar row, Chip (Storage/Deliveries…), Term underline, Cite superscript, Source badge, Chapter footer nav, Kicker note, Detail sheet. Validate each with `get_metadata` + a screenshot.
3. **Screens (Prompt B):** landing 1440, landing phone, Reservoirs chapter, assembled from components with the captures beside them as references. Charts as vector placeholders bound to the entity hues. Delete captures when Kevin approves.
4. **Code Connect (Prompt C):** map components to `apps/web/components/*`; verify `get_design_context` returns component names.
5. **First loop:** pick a pending brief and design it in Figma before code. Candidates from earlier sessions: the §5 "response growth" panel and the runoff-efficiency figure (a `feat/runoff-efficiency` branch already exists; check its state first).
6. **Repo PRs** from §6, items 1–3, as separate small PRs.

**Prompt A (library)**
> Load figma-use and figma-generate-library. In the Basin Figma file (key `o4uvAOk20uMQ4u1u97JNNW`), create pages `01 Tokens & Components` and `02 Screens`, rename `Page 1` to `00 Captures (reference)`. On `01`, create a `Color` collection with modes Light and Dark from the `:root` and `prefers-color-scheme: dark` tokens in `apps/web/app/globals.css` (bg, surface, surface-2, border, text, muted, faint, accent, water, warn, danger, grid) plus one variable per reservoir entity hue once located; `Space` (4, 8, 12, 16, 24, 32, 48) and `Radius` (10) collections; text styles matching the site's type ramp. Then build components one at a time, every color bound to a variable, and validate each before the next.

**Prompt B (screens)**
> Load figma-use and figma-generate-design. On `02 Screens`, rebuild the landing page at 1440 and 385 and the Reservoirs chapter at 1440 from the `01` components, using frames `15:2`, `16:2`, `2:2` on `00 Captures` as layout references. Do not invent colors; charts are vector placeholders bound to entity hues. Work section by section and screenshot after each.

**Prompt C (Code Connect)**
> Load figma-code-connect. Map the `01` components to `apps/web/components` (Nav→Nav.tsx, Term→Term.tsx, Cite→Cite.tsx, SourceBadge→SourceBadge.tsx, Figure→Figure.tsx, Chapter footer→Chapter.tsx, Stat tile→StorageTopline.tsx, Ranked bar row→RankedBars.tsx, Detail sheet→DetailSheet.tsx). Then read design context on one instance and confirm it names the file.

---

## 8. Working rules that apply (pointers, not copies)

- Brief before building; Kevin reads the brief first (`~/projects/CLAUDE.md`). Design approval happens in Figma before build agents run.
- Key decisions get a record in `docs/decisions/` before the build.
- Plain language, neutral register, findings-first headings, provenance on every number (`docs/DESIGN_PRINCIPLES.md`). Interaction floor: `~/projects/DESIGN_FOUNDATIONS.md` §3, §7, §8, §11.
- 8 GB MacBook: no simulator, no long-lived dev servers unless asked; use Vercel previews and the in-app Browser pane.
- Long-form gotcha log from the previous sessions, if the new session can read it: `~/.claude/projects/-Users-kevinwheeler-projects/memory/figma-design-to-code.md`. Note: a session launched inside `~/projects/basin` keeps its own memory directory and will not load that file automatically.
