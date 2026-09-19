# Claude Review Standards

## Status

Living document. Captures recurring standards that emerged across the GPT × Claude
review loop for this project. Any Claude instance reviewing a discussion in this
repo should read this file first.

For current repository work, first read [[README]], [[00-START-HERE]],
[[02-Decisions/accepted-decision-inventory-001-021]], and
[[04-Specs/ai-native-mvp-baseline]], then both review standards, the relevant
closed discussions, and—when migrating artifacts—Discussion 022 and both
migration ledgers. Use Discussion 022's source hierarchy; legacy formal artifacts
do not outrank accepted closed decisions merely because they remain in the vault.

## Purpose

Long review threads develop implicit standards that a fresh context won't have.
This file makes them explicit so review quality doesn't depend on which
conversation thread is doing the reviewing.

---

## 1. Evidence Standards

- Every research claim, statistic, or "study shows X" must be independently
  verified via search before being accepted or rejected — not taken on faith,
  not dismissed as baseless without checking.
- Distinguish the **general phenomenon** (often well-established) from
  **specific statistics** (often unverifiable or fabricated). Accept one
  without automatically accepting the other.
- Every piece of evidence gets a confidence label, applied consistently:
  - **Verified** — directly searched/read by Claude, with a real citable source
  - **Field evidence** — real but small-sample or non-random (e.g. social
    media posts, competitor behavior)
  - **Anecdotal but direct** — plausible, sourced, but unverified by Claude
    (e.g. pulled by a tool Claude has no independent access to)
  - **Theoretical support** — an established framework/theory not
    independently checked against this project's specific hypotheses
- A single recent, single-author, or synthetic-data-only paper is a real
  source, but its exact numbers should not be treated as settled — only the
  general principle behind it, if that principle is independently sound.

## 2. Small-Sample Discipline

- With n < 8–10 evaluable users, any single person can flip a result category.
  State this explicitly when discussing pilot results — don't let a
  Pass/Fail/Weak-Pass label imply more precision than the sample supports.
- A pattern claim (e.g. "X causes Y") needs a minimum repeat count (2–3
  independent occurrences) before being surfaced, not a single coincidence.
  A cheap permutation/shuffle test ("how often would this gap appear by pure
  chance?") is preferred over trusting a raw percentage difference.
- Tagging a variable (e.g. `source: manual | ai_assisted`) is **not**
  experimental control. Self-selected groups are observational data, not a
  clean causal comparison, regardless of how the data is labeled afterward.
- Confidence in any inferred pattern should scale with **active
  observations**, not calendar time. A week of no usage should pause a
  confidence score, not degrade it.

## 3. Scope Discipline

- Don't build for a hypothetical future need without evidence it's common.
  If a scenario is compelling but unvalidated, document it for later
  (research log / future reference), don't architect for it now.
- MVP scope should have an explicit Includes / Excludes / Later split for
  every major decision area, kept current.
- When a new requirement is proposed, ask what it costs in *already-accepted,
  formalized documents* — not just new build effort. Reopening a closed spec
  is a real cost even when the new idea is individually cheap to implement.
- Watch for scope creep that arrives one "reasonable" step at a time. Each
  individual step can look justified while the cumulative direction ends up
  exactly where an earlier, explicit decision already rejected.
- Cut mechanisms that solve a problem nobody has measured yet. Prefer:
  observe → detect a real pattern → only then build the fix.

## 4. Safety and Domain Boundaries

- For any pilot with real users, safety-relevant domain boundaries (medical,
  legal, financial, mental-health crisis, physical danger) must be a **hard
  boundary with a fixed fallback response**, not "AI may proceed with
  guardrails" where the guardrails are still undefined elsewhere.
- Do not widen a domain boundary to include crisis-adjacent territory in one
  discussion while deferring the actual protective mechanism to a later,
  unwritten discussion. The boundary and its enforcement mechanism must be
  resolved together, not sequenced apart with a promise to reconcile later.
- Self-harm, crisis, or mental-health-crisis input should route to a fixed,
  pre-written response (including real crisis resources where appropriate),
  never to open-ended AI reasoning about how to handle the boundary.

## 5. Data Model Discipline

- Store only metadata tied to a metric or event that's already defined.
  "Might be useful later" is not sufficient justification for a field.
- Prefer computing aggregates live over a small event log rather than
  maintaining a separate stored rollup table, unless volume genuinely
  requires it.
- Push documented invariants down into actual database constraints
  (CHECK constraints, unique constraints) in addition to application-level
  validation — don't rely on application code alone to enforce a rule stated
  in a spec.
- State mutation + its corresponding event log entry must be atomic in the
  same transaction. This protects every metric downstream of the event log.

## 6. AI Behavior Discipline

- AI proposes, user approves, system creates. AI-generated content is
  ephemeral until explicitly approved — never auto-persisted, never
  auto-applied to existing user data.
- AI must not infer higher-order conclusions (goal progress, personality,
  causal explanations) from lower-level activity data unless that inference
  is explicitly designed, bounded, and reviewed on its own.
- Rule-based logic before ML/AI logic, always, until rule-based is
  demonstrably insufficient with real data.

## 7. Review Process Integrity

- A discussion's "Accepted" or "Reviewed" status must reflect an actual
  review that happened. If Claude has not seen a document, its status must
  not claim Claude reviewed or confirmed it.
- Claude has no memory across separate chat threads. A new conversation
  reviewing this repo has no knowledge of prior review threads unless this
  file (and the repo's own discussion history) is read first.
- A later discussion must not silently override an earlier accepted
  decision. Any conflict reopens the earlier discussion explicitly.
- When Claude or GPT is shown to be wrong by the other, the correction
  should be stated plainly and the position updated — not defended for its
  own sake. This applies symmetrically to both reviewers.

## 8. Product Philosophy (carried from Phase 0)

- Non-judgmental tone throughout: no shame UI, no streaks, no red overdue
  indicators, no forced justification for dropping something.
- When two designs solve the same problem, prefer the one that requires
  fewer new formal documents to be reopened, all else equal.
- Sequential validation (cheapest test that could falsify the hypothesis)
  beats simultaneous testing of multiple unproven hypotheses at once, unless
  the hypotheses can be cleanly separated (e.g. by tagging with honest
  acknowledgment that tagging alone doesn't equal causal proof).
