# TidySense AI-Native MVP Baseline

Status: **Canonical projection of accepted Discussions 001–026**, consolidated 2026-09-19.

## 1. Product loop

```text
Intent → bounded Planning → reviewed proposal → deterministic apply
       → Today execution evidence → deterministic Reconcile
       → reviewed adaptation → deterministic apply
```

Manual planning and execution remain available when AI is unavailable or unwanted.

## 2. Canonical model

| Record | Canonical purpose and key rules |
|---|---|
| Goal | User-owned desired outcome; may own Projects, Tasks and Routines; system-managed review snapshot; lifecycle outcome is user-authorized. |
| Project | User-owned bounded effort, optionally under a Goal; may own Tasks/Routines; system-managed review snapshot. |
| Task | User-owned one-time item; owned directly by Project, Goal or neither. Standalone active requires `plannedDate`; parent-owned may be undated. Optional same-scope `sequenceId` + `sequenceOrder`. No Backlog/placement/Task review date. |
| Routine | User-owned recurring intent; local-calendar recurrence, timezone, effective date bounds, zero or more unique `timesOfDay`; `ACTIVE → STOPPED`; continuation creates a new linked Routine. |
| RoutineOccurrence | Execution fact. Timed key `(routineId,date,time)`; untimed key `(routineId,date)`. `PENDING → DONE | MISSED`; never carried as debt. |
| PlanningFact | Durable approved structured constraint belonging to exactly one Goal or standalone Project; used in bounded AI planning context. |
| CaptureItem | User-owned unresolved quick capture. Resolution creates a separate Task/Routine identity; `UNRESOLVED → RESOLVED | DISCARDED`. |

All canonical identities/FKs are UUID/.NET `Guid`; persisted records use optimistic versions where concurrent consequential change requires it.

## 3. Required product behavior

- Planning entry may be global or contextual and uses bounded clarification.
- `PlanningDraft` is structured, editable, validated and non-canonical until explicit apply.
- PlanningFact extraction requires individual approval; manual creation does not depend on it.
- Detailed AI planning is limited to seven days and receives only bounded current/previous weekly context.
- Today is derived from active Tasks planned for the configured local today plus due Routine occurrences. Blocked planned Tasks may appear as non-actionable context.
- Reconcile computes deterministic facts/severity first, groups Project → Sequence → Task, and keeps Capture as a separate non-severity lane.
- Consequential changes show a server-authoritative preview, require explicit confirmation, revalidate ownership/version/invariants at commit and write atomically with semantic event intent.
- Bulk and sequence actions are all-or-nothing.
- AI failures, invalid output, cancellation and late results are explicit and cannot mutate state.

## 4. Guardrails that remain

- no direct AI repository, command, mutation or model-tool authority;
- no diagnosis, hidden capacity/motivation inference, Goal achievement inference or causal claims;
- imported/hostile content is inert data and cannot override instructions;
- minimized allowlisted context and defined retention/access boundaries;
- strict structured-output validation and only allowlisted non-semantic repair;
- provider safety/moderation safeguards, rate/timeout/circuit/spend limits, observability and incident procedures;
- backend authentication, permission and domain-defined ownership enforcement;
- manual/deterministic path remains available.

There is **no dedicated crisis UX, crisis routing flow, emergency-resource page, crisis-specific data product or crisis release gate**.

## 5. Technical baseline

- Root layout: `/frontend`, `/backend`.
- Backend: .NET 10, ASP.NET Core, EF Core with Npgsql/PostgreSQL.
- API: `/api/v1`, camelCase JSON, RFC 9457 Problem Details.
- Auth: JWT in HttpOnly cookie with `sessionEpoch`; no refresh/per-device/session-list/individual-revoke architecture.
- SMS: Kavenegar production adapter behind a narrow provider boundary.
- Time: `DateTimeOffset` instants, `DateOnly` local dates, one configured pilot IANA timezone.
- Persistence: provider-neutral domain/application/API contracts; current EF/PostgreSQL naming retained; PostgreSQL migrations remain infrastructure artifacts.
- Frontend: React/TypeScript, TanStack Router file routes, TanStack Query, generated OpenAPI types, Zod for forms/client validation.

## 6. Pilot evidence and readiness

H1 measures useful bounded AI-assisted creation; H2 measures understandable user-approved Reconcile. Authorization, privacy, reliability, event completeness, provider safeguards and manual escape remain hard readiness concerns. They are evaluated through ordinary security/AI/operations evidence, not a dedicated crisis gate.

Implementation scaffolding exists, but milestone gates remain unverified until their explicit tests/evidence pass. Pilot/release are not ready.

## 7. Post-pilot

- true `EVERY_N_HOURS` and broader recurrence;
- automatic cross-provider AI fallback and model tool calling;
- per-user IANA timezone selection;
- PWA/offline-first, calendar integration, reminders/time blocks;
- permanent deletion/archive UX and advanced recovery;
- full local/CI/deployment orchestration decision (`DEC-011`).

Multiple daily Routine slots and Task sequences are **MVP**, not post-pilot.

## 8. Removed

- canonical Plan entity;
- Backlog and all Task placement/review-date behavior;
- direct/partial AI mutation, fuzzy intent-changing repair, raw Reconcile text;
- inferred lifecycle outcomes or stored derived Goal progress;
- dedicated crisis UX/gate/records;
- refresh tokens and per-device/session inventory;
- prototype integer identity, opaque DB sessions, IPPanel and unversioned routes as future architecture;
- Java/Spring stack and `/app` repository relocation.

## 9. Open configuration, not product semantics

Pilot cohort/thresholds, exact OTP/JWT operational values, provider/model versions and budgets, retry/rate limits, retention/legal schedule, reviewed final copy, package versions and operational owners remain configuration work. `DEC-011` remains intentionally deferred. None reopens Discussions 023–026.
