# AI-Native First-Run and Planning Entry

## Status

`REWRITTEN — CURRENT UX PROJECTION`

## Purpose

Let a participant bring a real intention into the complete `Plan → Execute → Adapt` loop without forcing diagnosis, personality inference, or a rigid setup ritual.

## Entry paths

- Global AI Planning entry accepts a free intention.
- Contextual entry starts from an existing Goal, Project, Task, or eligible Reconcile context.
- Manual creation remains first-class and available when AI is disabled or unwanted.
- Empty Today remains usable and never forces AI or Reconcile.

## Planning conversation

- Clarify only when missing information materially affects a valid proposal.
- Normally use no more than three clarification rounds.
- Never invent deadline, recurrence, ownership, user capacity, or high-risk facts.
- The user can choose Draft Now, edit the request, cancel, restart, or continue manually.
- Crisis or immediate-danger input exits to the fixed safety fallback and produces no proposal.

## Draft review

The result is a temporary, structured, editable PlanningDraft. It visibly separates assumptions, warnings, hierarchy, dates, recurrence, and unresolved choices. It is not canonical and has no mutation authority.

Application requires server preview, visible consequences, warning acknowledgement, explicit confirmation, current versions, commit-time revalidation, deterministic mutation, and CommandResult.

## Required interface states

```txt
manual entry
empty
clarifying
drafting
reviewable
editing
confirming
applying
applied
cancelled
expired
stale/conflict
invalid output
provider degraded
manual continuation
crisis fallback
```

Design must preserve user input through recoverable failure and provide accessible loading, error, cancellation, and responsive states.

Authority: Discussions 010, 013, 014, 014A, 018A, and 020B.
