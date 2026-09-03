# The Report tab is retired; chapters become the landing's evidence appendix

**Date:** 2026-09-03 · **Status:** Proposed · **Scope:** site IA (nav, landing, /report, /current-state) · **Brief:** supersedes the nav portion of docs/IA.md v2; the backbone contract and surfaces are unchanged

The landing page grew into the executive report — six data-backed beats
with computed headings, charts, and a teaching layer — which left the
Report tab reading as a second, competing report. The decision: retire
**Report** from the nav; the eight chapters stay at their URLs and become
the evidence appendix behind the landing's claims, reached through a
uniform "go deeper" link on every landing beat. **Current state** stays a
separate operational surface. Nav becomes **Now · Explore · Data**.

## 1. Use cases and problems

- Use case: a first-time reader lands, reads the six-beat argument, and
  wants the full defense of one claim ("prove the supply number") — they
  should fall into the Supply chapter from the section that made the
  claim, not hunt a parallel tab.
- Use case: a returning reader checks conditions — reservoir levels,
  snowpack, the rules in force. That is Current state, unchanged.
- Problem (Kevin, 2026-09-02): "the landing page feels like an executive
  report so now it's unclear to me what the report tab adds/does" and "it
  almost feels like the report should be consolidated with the landing
  page and the current state."
- Problem: the landing's bottom CTA block says "Start the report →" —
  after landing v6–v8 that door leads to a shorter retelling of the page
  the reader just finished.
- Problem: §4 ("the two largest reservoirs are down…") now substantially
  overlaps §3's per-reservoir drawdown work (PR #88); the seam is a
  by-product of the same drift.

## 2. Why

The mission (docs/MISSION.md) is a public instrument: the front door
carries the argument, everything beneath it defends a number. IA v2
(2026-08-23) assumed the landing was a thin front door and the Report was
the argument; the 2026-09 landing iterations inverted that. Doing nothing
leaves two surfaces claiming the same job, which taxes every future
feature with a placement question ("landing or chapter?") — the §6
relocation debate was the first instance.

## 3. Proposed solution

Retire the tab, keep the chapters, wire them beat-by-beat.

**High-level design.**

- **Nav: Now · Explore · Data.** "Current state" is relabeled **Now**
  (IA v2 already named the journey Now → why → look myself → audit; the
  label catches up). The wordmark stays the route to the landing.
- **Every landing beat ends with one uniform evidence line** — "The full
  case: the Supply chapter →" — replacing today's mixed in-caption links.
  Mapping: §1 → Demand (+ Agriculture from the by-type block), §2 →
  Supply, §3 → Reservoirs (+ Infrastructure from the map), §5 → Water
  Rights, §6 → Demand. The System chapter and the WY2026 story link from
  the landing's close.
- **/report and /report/**\* stay live at their URLs** (no redirects, no
  link rot; external links and citations keep working). The /report index
  survives as the chapter table of contents, reachable from the landing's
  close and the footer — it is no longer a nav destination.
- **The landing's bottom CTA block** drops "Start the report →"; keeps
  Current state/Now and Explore; gains "All chapters →".
- **§4 folds into §3** ("Reservoirs cover the deficit" absorbs the
  combined-storage line and the %-of-capacity framing; the landing goes
  to five beats plus the response).
- **Chapters gain a standing header line**: "This chapter is the evidence
  behind §N of the front page" with a link back — the reverse edge of the
  appendix relationship.

**Out of scope.** Chapter content itself (no chapter is rewritten here);
the Explore instruments; the Data surface; growing §6 into a full
"what's being done" beat (separate brief); any URL changes.

## 4. Options considered

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A. Retire the tab; chapters = evidence appendix** (chosen) | Nav Now · Explore · Data; uniform per-beat chapter links; URLs unchanged | Resolves the duplication without destroying depth; zero link rot; smallest honest change | Chapter discoverability now depends on the landing's links |
| B. Merge chapters into the landing | One long page, chapters as expandable sections | One surface | A 9-chapter page is unreadable and slow; destroys chapter URLs/citations; landing stops being an executive summary |
| C. Merge Report into Current state | Chapters live under /current-state | One fewer tab | Wrong altitude — operational "now" and explanatory "why" have different cadences and readers; muddies both |
| D. Keep the tab, rename it ("Chapters") | Cosmetic reframe | Cheapest | Doesn't resolve the redundancy Kevin named; two doors to one argument remain |
| E. Do nothing | Status quo | Free | Every future feature re-litigates placement; the front door advertises a redundant report |

A wins because the chapters' value is depth-behind-a-claim, not
destination-ness. B would win only if chapters were short; C only if
chapters were live dashboards.

## 5. Design principles

- The landing is the argument; everything else is evidence, instruments,
  or audit. No second surface may claim the argument job.
- Every landing claim links the chapter that defends it; every chapter
  names the claim it defends. The edge is bidirectional and uniform.
- URLs are commitments: consolidation never breaks a link.
- Nav mirrors the journey (now → look myself → audit); depth is reached
  through content, not chrome.

## 6. Risks

| Risk | Likelihood / impact | Mitigation | Early signal |
|---|---|---|---|
| Chapter traffic collapses (nobody finds the depth) | med / med | Uniform, visible evidence lines on every beat; TOC in the close + footer | Vercel analytics: /report/* views drop >70% post-ship |
| Readers still look for a "Report" tab (habit) | low / low | "All chapters →" in the close; /report unchanged for bookmarks | Support questions / Kevin noticing |
| §4-into-§3 fold loses the %-of-capacity framing | low / med | The fold keeps the combined line and the 92%→24% claim inside §3 | Review of the fold PR against this record |
| The relabel "Now" confuses vs "Current state" links elsewhere | med / low | Sweep copy for the old label in the same PR (grep, per the positional-reference lesson) | Stale-label greps in review |

## 7. Consequences and revisit triggers

Easier: placement decisions (claims land on the landing; defenses land in
chapters); the front door reads as one argument. Harder: a new chapter now
needs a beat to hang from, or it goes unlinked — that friction is a
feature (it forces the mission conversation). Revisit if: a reader class
emerges that starts at chapters (e.g., search traffic dominates), if the
landing grows past ~7 beats, or if a second basin ships and the
per-basin landing/chapters relationship needs to generalize.
