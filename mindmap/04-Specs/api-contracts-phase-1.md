# AI-Native MVP API Contract Index

## Status

`REWRITTEN — CURRENT CONTRACT PROJECTION; EXACT SCHEMAS REQUIRE SLICE LOCK`

## Global conventions

- Base path: `/api/v1`.
- JSON fields use camelCase.
- Instants use UTC; semantic local dates remain local dates.
- Success returns the resource/result body directly.
- Errors use RFC 9457 Problem Details with stable application codes and trace identity.
- Validation errors use HTTP 400; ownership-safe lookup uses HTTP 404.
- Current-user identity is exposed through `/users/me`.
- Mutating requests use authenticated ownership, expected versions where applicable, and an idempotency identity.

These conventions are retained by [[01-Closed-Discussions/001-008-legacy-surviving-decisions]].

## Resource families

### Canonical resources

Goal, Project, Task, Routine, and RoutineOccurrence are canonical resources. There is no canonical Plan resource. Their fields and invariants are owned by Discussions 012, 012A, 015–015B, and 019A.

### AI workflow resources

- `PlanningAttempt` represents bounded asynchronous orchestration.
- `PlanningDraft` is temporary, reviewable, revisioned, and never canonical.
- `ReconcileSession` captures deterministic evaluation and allowed recommendation state.
- `ActionConfirmation` binds a server preview, warning acknowledgement, selected entities, expected versions, and expiry.
- `CommandResult` is the authoritative mutation outcome.

Exact lifecycle and frontend states are owned by [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]].

## Required state distinctions

Clients and servers must keep these distinct:

```txt
attempt accepted
attempt running
valid output
reviewable resource created
user disposition
confirmation created
command accepted
command applied
command conflicted
command failed
command result recovered after lost response
```

Cancellation, expiration, late-result discard, refresh, retry, degraded/manual continuation, and lost-idempotency recovery are explicit states rather than generic failure.

## Mutation contract

Every consequential mutation requires:

1. authentication and ownership;
2. current canonical state and expected versions;
3. server-authoritative preview;
4. visible consequences and warnings;
5. explicit confirmation bound to the preview;
6. immediate commit-time revalidation;
7. deterministic all-or-nothing transaction;
8. canonical mutation plus outbox intent;
9. durable `CommandResult` recovery by idempotency identity.

Bulk commands are all-or-nothing. Stale confirmation never silently refreshes or applies. Matching terminal replay may return a no-op/domain success only under Discussion 019B rules and never emits duplicate semantic events.

## Authentication boundary

OTP/JWT endpoints and browser behavior remain specified by [[04-Specs/auth-phase-1]]. Exact operational values must be configured before production authentication is enabled.

## Required contract tests

- ownership and existence-leak prevention;
- schema and Problem Details compatibility;
- optimistic conflict and refresh;
- duplicate command/replay;
- lost-response recovery;
- cancellation/late result/expiry;
- immutable revision behavior;
- bulk atomicity;
- warning-version mismatch;
- unauthorized and stale confirmation rejection;
- frontend preservation of user input across failure and refresh.

No endpoint may be inferred from the deprecated Phase 1 contract or this index alone. Slice-specific schemas must be locked against Discussions 019B and 020B before integration.
