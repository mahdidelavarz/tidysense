# TidySense Reconcile UI/UX Specification

Status: **Canonical condensed projection**, amended by Discussions 025–026.

## Purpose

Reconcile turns deterministic divergence facts into a small set of understandable user decisions. It never blocks Today and never lets AI replace facts or mutation authority.

## Information architecture

- Overview: current deterministic eligibility/severity and entry to review.
- Execution lane: actionable work, grouped Project → Sequence → Task; blocked descendants are context, not actionable count/age.
- Commitment-review lane: Goal/Project review checkpoints and Goal Continuation Check.
- Capture lane: unresolved CaptureItems, counted separately from execution severity.
- Review & Apply: server preview, warnings, selected entities, expected versions, confirmation and authoritative result.

There is no Backlog lane, Task review checkpoint, Task placement action or dedicated crisis route.

## Actions

Task lifecycle actions follow the accepted Task contract. Sequence actions may include `CARRY_ALL`, `DROP_ALL`, `REVIEW_INDIVIDUALLY` and `REVIEW_WITH_AI`; application is atomic. A dropped predecessor requires explicit resolution of the remaining structure. Parent-owned undated Tasks resurface through direct parent review.

CaptureItem may be resolved into a newly created Task/Routine or discarded. The new work record has a separate identity and correlated events.

## AI boundary

AI receives only allowed structured deterministic evidence, may explain/organize permitted recommendations and returns strictly validated non-canonical output. Invalid, cancelled, late or unavailable results preserve the manual path. Hostile/imported content is inert; provider safeguards and minimized context apply.

## Required states and accessibility

Provide initial/background loading, empty, error, unavailable/degraded, skipped, conflict/stale, submitting, success and lost-response recovery. Preserve user selection/input across recoverable failures. Use Persian/RTL, semantic headings, keyboard operation, visible focus, announced errors/results, non-color severity cues and mobile-safe actions.

## Acceptance evidence

Test deterministic eligibility/cleanup, hierarchy/grouping, blocked-count exclusion, Capture separation, Today access, prompt suppression, protected items, parent consequences, stale confirmation, atomic bulk/sequence changes, correction/reversal, ownership, event evidence, manual escape, hostile input and zero unauthorized AI mutation.
