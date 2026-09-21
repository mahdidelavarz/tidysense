# ADR-002 — AI-Native MVP Technical Foundation

## Status

Stack amendment (2026-09-19): the repository owner's implementation choice replaces the earlier Java/Spring direction with the existing .NET 10/ASP.NET Core/EF Core foundation. Product behavior and architecture boundaries are unchanged.

`AMENDED — STACK RETAINED; TECHNICAL DETAILS DEFER TO /devmap`

## Decision

The implementation foundation uses:

- React, strict TypeScript, and Vite for the frontend;
- C# and ASP.NET Core on .NET 10 for the backend;
- Entity Framework Core with Npgsql and versioned PostgreSQL migrations; temporary DevMap ADR-006 is superseded;
- versioned JSON/REST contracts using camelCase;
- RFC 9457 Problem Details for errors;
- secure phone OTP and JWT cookie authentication;
- optimistic concurrency by default and scoped locks for cross-row invariants;
- idempotent commands and atomic transactional outbox intent;
- deployment/orchestration details are deferred under DevMap `DEC-011`; no Docker/Nginx topology is locked here.

These choices are retained through `LEG-02`–`LEG-08` in [[01-Closed-Discussions/001-008-legacy-surviving-decisions]] and constrained by Discussions 019A–020C.

## Architecture boundaries

- Canonical state is owned by deterministic domain/application services.
- AI providers sit behind separate Planning and Reconcile ports.
- Models receive bounded, versioned context and no tools, repositories, or commands.
- AI output must pass transport, syntax, schema, semantic, temporal, reference, policy, and budget gates before it can become reviewable.
- A reviewable proposal is not permission; confirmation is not proof of successful mutation.
- Every consequential command revalidates ownership, versions, warnings, and selected entities at commit time.
- Events/outbox intent commit atomically with canonical mutation.

## Security and privacy baseline

- Ownership-safe not-found behavior prevents existence leakage.
- Authentication, authorization, CSRF, cookie, revocation, retention, restricted-event access, and deletion rules are first-slice requirements.
- Imported/user content is data, never runtime instruction.
- General provider/AI failure paths cannot mutate state and preserve manual/deterministic use; there is no dedicated crisis UX or gate.

## Explicit exclusions

- canonical Plan entity;
- direct AI mutation or model tools;
- automatic provider fallback during pilot;
- partial-success bulk mutation;
- PWA/offline mutation sync;
- refresh-token/per-device session system;
- calendar/time-block integrations.

## Configuration before lock

Exact framework versions, database migrations, provider/model artifacts, timeouts, retry/rate/circuit limits, budgets, OTP/JWT values, and operational owners remain configuration packages tracked by [[02-Decisions/repository-artifact-migration-ledger]]. They must be resolved before their applicable slice or pilot lock.

## Consequence

This ADR establishes reusable technical direction, not implementation readiness. The accepted planning sequence and remaining gates are governed by [[01-Closed-Discussions/022-updated-mvp-implementation-plan]].
