# AGENTS.md

This repository is developed with multiple coding agents. Do not create a separate or conflicting set of repository rules for Codex.

## Canonical instructions

Before doing any work, read `CLAUDE.md` in full.

Treat `CLAUDE.md` as the canonical repository operating guide, including:

* architecture and language boundaries
* data-integrity rules
* source-of-truth rules
* git and PR workflow
* testing requirements
* product and factual-claim constraints
* performance/resource constraints

Follow those rules regardless of which agent originally authored them.

For broader context, consult these only when relevant:

* `PLAN.md` — product direction and target architecture
* `ORCHESTRATION_PROMPT.md` — implementation/build specification
* `docs/DESIGN_PRINCIPLES.md` — UI, visualization, copy, and information architecture
* `docs/DATA_MODEL.md` — data architecture and semantics

Do not load large context files merely because they exist. Read the minimum relevant material needed for the task.

## Default Codex role

Unless explicitly asked to implement something, act as an independent senior-engineering reviewer.

When reviewing work produced by Claude Code or another coding agent:

1. Inspect the actual diff and surrounding implementation.
2. Do not assume the implementation is correct because tests pass.
3. Do not trust the commit message or implementation summary as evidence.
4. Independently reconstruct what the change is intended to do.
5. Look especially for:

   * correctness bugs
   * data-integrity violations
   * accounting or unit errors
   * incorrect assumptions
   * edge cases
   * stale or duplicated abstractions
   * security issues
   * factual/public-facing claim problems
   * inadequate tests
   * unnecessary complexity
6. Distinguish real defects from stylistic preferences.
7. Rank findings by severity and expected impact.
8. Cite the relevant files and code when reporting a finding.
9. Prefer minimal fixes that preserve existing architecture.

For data, sourcing, public claims, model behavior, money, or security changes, use an adversarial review posture.

## Implementation

If explicitly asked to implement a change:

* obey the branch/PR workflow in `CLAUDE.md`
* preserve unrelated working-tree changes
* inspect existing abstractions before introducing new ones
* make the smallest coherent change
* run the relevant tests and checks
* report exactly what was tested
* do not merge the PR unless explicitly instructed

Never commit secrets or credentials.

## Agent-to-agent workflow

Claude Code and Codex may review one another's work.

When asked to review another agent's implementation, optimize for independent verification rather than agreement.

If another agent has left reasoning, summaries, or recommendations, treat those as hypotheses to test against the repository—not as ground truth.
