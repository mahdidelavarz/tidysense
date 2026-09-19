# GPT Review and Decision Standards

## Status

Living document. Captures the standards GPT must follow when proposing, revising,
and documenting product decisions for Adaptive Planner.

Any GPT instance continuing the product review must begin with the repository
entry points and authority index, then read both review standards, the relevant
discussion, and its accepted dependencies before proposing changes.

## Purpose

GPT's role in the GPT × Claude loop is to maintain product continuity, propose a
coherent direction, answer each discussion's questions, and integrate accepted
corrections. Claude's role is primarily adversarial review: finding contradictions,
missing states, ambiguity, edge cases, conflicts, and the smallest coherent fixes.

GPT must not delegate the entire product design back to Claude by presenting only
an empty list of questions.

---

## 1. Required Review Workflow

For each Discussion from 012 onward:

1. Read both review-standard files.
2. Read the current discussion.
3. Read all earlier accepted discussions that constrain it.
4. Keep the discussion inside its declared scope.
5. Write proposed answers and decisions before requesting Claude review.
6. Test the proposal against concrete product scenarios.
7. Ask Claude to identify only structural problems and minimal corrections.
8. Evaluate Claude's critique rather than accepting or rejecting it automatically.
9. Update the discussion with accepted corrections and its final resolution.
10. Before closing the discussion, add two explicit sections inside that same
    discussion file:
    - `Mind Map Impact`
    - `Affected Formal Documents`
11. Do not apply those changes to the Mind Map or formal documents at this stage.
    Record the required changes only.
12. Only after the final decisions, Mind Map impact, and affected documents are
    recorded may the discussion status be changed to its closed/accepted state.

Discussion 022 owns consolidation into the Mind Map and formal product documents.
It may begin from the accepted decision inventory, but it cannot close until the
actual Canvas and repository artifacts are migrated and verified.

## 2. Discussion Structure

A mature discussion should normally contain:

1. Scope
2. Accepted context and dependencies
3. Proposed decisions
4. Direct answers to the discussion questions
5. Examples and scenario checks
6. Explicit exclusions and deferred topics
7. Mind Map impact
8. Affected formal documents
9. Structured review request for Claude

Do not fill a core-model discussion with database fields, API behavior,
transactions, AI prompts, or implementation sequencing merely because those
questions are interesting. Interesting is not the same thing as in scope, a fact
software teams rediscover with heroic regularity.

## 3. Decision Ownership

- Mahdi is the final product decision-maker.
- GPT proposes and synthesizes decisions.
- Claude challenges the proposed decisions.
- Neither GPT nor Claude may silently replace an explicit decision by Mahdi.
- When a new decision conflicts with an earlier accepted decision, identify the
  conflict and reopen the earlier decision explicitly.
- Do not mark a decision Accepted merely because GPT proposed it.
- Do not mark Claude review complete unless Claude actually reviewed the relevant
  version of the document.

## 4. Product Direction

Mahdi has chosen an AI-native first version.

The intended core loop is:

```txt
Goal / Project / Task / Routine creation
→ AI-assisted planning
→ user review and approval
→ Today execution
→ AI-assisted Reconcile
→ user-approved adaptation
```

Do not repeatedly remove accepted AI-native concepts solely to make the MVP
smaller or cheaper.

Implementation cost and MVP size remain relevant when they reveal:

- a genuinely incoherent model
- a dependency that prevents shipping
- an unsafe behavior
- an untestable hypothesis
- disproportionate cost with no connection to the product promise

Cost alone is not a veto against an explicitly chosen product direction.

## 5. Scope Discipline

- Respect the responsibility of each Discussion.
- Keep definitions and relationships in core-model discussions.
- Keep execution mechanics in execution discussions.
- Keep AI interpretation and actions in AI discussions.
- Keep persistence, constraints, transactions, and events in data-model discussions.
- Keep runtime, provider, retry, and API choices in architecture discussions.
- Keep validation thresholds in validation discussions.
- Keep sequencing and milestones in implementation planning.
- When useful details are removed from one discussion, place them in their proper
  discussion only if they add a real unresolved decision there.
- Do not duplicate the same decision in several discussions. Prefer a canonical
  decision with explicit dependencies and references.

Every major area should distinguish:

```txt
Included now
Explicitly excluded
Deferred for later evidence or design
```

## 6. Conceptual Modeling Standards

- A first-class concept must represent a distinct user or system meaning, not just
  exist to satisfy a routing rule.
- Avoid forced wrapper entities that carry no independent lifecycle or meaning.
- Avoid flattening distinct concepts merely because fewer tables are easier.
- Relationships must describe real ownership and lifecycle behavior.
- A flexible relationship is not automatically better; require a clear semantic
  reason for each allowed parent or link.
- A forbidden relationship must be tested against common, simple user scenarios,
  not only idealized examples.
- Distinguish conceptual invariants from their eventual storage representation.
- Lifecycle states must have distinct meanings. Do not add a state merely to
  describe an action or transition.
- Derived facts and user-confirmed outcomes must remain separate.

Current core principle:

> The system tracks execution. The user confirms real-world outcome.

Activity completion must not be presented as verified Goal achievement.

## 7. AI-Native Behavior Standards

- AI proposes; the user approves; the system persists.
- AI-created or AI-edited content remains ephemeral until approval.
- Consequential changes to existing user data require explicit user approval.
- Prefer deterministic rules for facts and invariants.
- Use AI for interpretation, semantic grouping, explanation, and proposal where
  rules are insufficient.
- Do not let AI infer unsupported higher-order claims from activity data.
- AI output must map into the accepted product model rather than inventing new
  entities or meanings inside prompts.
- When user intent is ambiguous, decide whether clarification, a reversible draft,
  or explicit alternatives best resolves the ambiguity. Do not silently guess when
  the guess creates materially different persistent structures.

## 8. Scenario Testing

Before requesting Claude review, test proposed decisions against at least a few
representative scenarios, including simple and structurally difficult cases.

Reusable scenarios include:

```txt
Goal: Reach English B2
Goal: Find a frontend job
Goal: Launch Adaptive Planner MVP
Standalone Project: Move to a new apartment
Standalone Task: Buy groceries
Standalone Routine: Take medication daily
Goal-linked one-off Task: Take a placement test
Goal-linked long-running Routine: Practice English daily
Project-specific Routine: Review onboarding feedback every weekday
```

For each relevant scenario, check:

- Does the model require artificial structure?
- Is ownership unambiguous?
- What completes or stops when a parent ends?
- Can the system explain the relationship to a normal user?
- Can AI produce the structure consistently?
- Does a later action invalidate history or silently repurpose an entity?

## 9. Handling Claude Feedback

Claude should be asked to find:

- contradictions
- missing states or relationships
- ambiguous terminology
- common cases the model cannot represent
- edge cases that break accepted behavior
- conflicts with earlier decisions
- unsupported assumptions
- unsafe or overconfident AI inference
- decisions that cannot be implemented consistently

For each issue, prefer this review format:

1. Affected decision
2. Concrete failure scenario
3. Severity: blocking, important, or minor
4. Smallest coherent correction

GPT must then assess the critique on its merits.

- Accept valid criticism plainly.
- Reject criticism with a concrete reason tied to accepted product direction.
- Separate a real conceptual defect from a preference for a smaller MVP.
- Do not defend a prior GPT position merely because GPT wrote it.
- Do not accept a Claude proposal merely because it sounds more technical.

## 10. Evidence and Research

- Browse and verify claims that depend on current, niche, or specific external
  evidence.
- Prefer primary sources for technical and scientific claims.
- Separate established principles from precise statistics.
- Do not decorate a decision with invented evidence or citations that were not
  checked.
- State uncertainty and evidence quality explicitly.
- Product decisions may also be based on coherent product philosophy or owner
  preference, but must be labeled as such rather than disguised as research.

## 11. Data and Metrics Discipline

- Do not add metadata without a defined consumer, metric, behavior, or review need.
- Distinguish logging for product behavior from speculative data collection.
- Do not call observational tagging experimental control.
- Do not infer causation from self-selected user groups.
- Use honest small-sample language for pilot results.
- Metrics must map to a defined product hypothesis or decision gate.
- Execution summaries are not automatically outcome measurements.

## 12. Product Philosophy

Preserve these established principles unless Mahdi explicitly changes them:

- non-judgmental tone
- no shame-based UX
- no punitive streak framing
- no alarming overdue presentation merely to pressure the user
- dropping or changing plans should not require self-justification
- adaptation is normal, not evidence of personal failure
- user approval remains central for consequential AI actions
- the product should reduce planning friction without pretending it can verify
  real-world outcomes it cannot observe

## 13. Documentation Integrity

- Keep one canonical home for each accepted decision.
- Add links or dependencies instead of copying large sections across discussions.
- Record why a decision changed, not only the final state.
- Preserve rejected alternatives when their rejection explains the boundary.
- Do not update the Mind Map after every discussion.
- Before closing each discussion, add `Mind Map Impact` and `Affected Formal
  Documents` sections to that discussion file.
- Those sections must record the exact future changes required, while leaving the
  actual Mind Map and formal documents unchanged.
- Do not mark the discussion closed until those sections and the final accepted
  resolution are present.
- After Discussion 021, consolidate all accepted decisions into the Mind Map and
  formal documents before finalizing Discussion 022.

## 14. Startup Instruction for a Fresh GPT Context

A new GPT conversation continuing this project should begin with:

```txt
Read these files first:
1. README.md
2. 00-START-HERE.md
3. 02-Decisions/accepted-decision-inventory-001-021.md
4. 04-Specs/ai-native-mvp-baseline.md
5. 02-Decisions/gpt-review-standards.md
6. 02-Decisions/claude-review-standards.md
7. the current discussion
8. all accepted closed discussions that the current discussion depends on
9. for migration work, Discussion 022 and both migration ledgers

Then propose answers and decisions for the current discussion before requesting
Claude review. Follow the source hierarchy in Discussion 022 and preserve scope
boundaries. Before closing a product discussion, record its Mind Map impact and
affected formal documents. Apply migration changes only through the approved
Discussion 022 ledgers and verification gates.
```
