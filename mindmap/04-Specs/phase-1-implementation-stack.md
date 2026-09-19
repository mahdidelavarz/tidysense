# AI-Native MVP Implementation Stack

## Status

`AMENDED — M1 CONFIGURATION PROPOSED; NOT SLICE LOCKED`

## Retained baseline

### Frontend

- React + strict TypeScript + Vite
- versioned REST client and explicit state machines
- accessible form, review, confirmation, failure, cancellation, stale/conflict, and degraded states
- unit/component/contract/E2E testing

### Backend

- C# + ASP.NET Core on .NET 10
- feature-oriented domain/application boundaries
- Entity Framework Core 10 with Npgsql
- PostgreSQL + versioned EF Core migrations
- explicit DTO/schema validation
- RFC 9457 Problem Details and trace identity
- transaction, concurrency, idempotency, outbox, and observability support
- integration tests with real PostgreSQL behavior

### Infrastructure

- Dockerized services
- Nginx retained as the edge/deployment baseline
- health/ready checks, external monitoring, structured logs, traces, alerts, backups, rollback, and incident procedures

## AI runtime requirements

- separate Planning and Reconcile ports;
- bounded/versioned context builders and Context Scope Manifest;
- no model tools;
- pinned provider/model/prompt/schema/policy artifacts;
- strict structured-output gates;
- bounded retry, timeout, rate, circuit, token, and spend controls;
- cancellation, late-result discard, kill switches, and deterministic mock provider;
- restricted safety/privacy observability.

## Deliberately excluded

- PWA/offline-first mutation sync;
- model tool/function calling;
- automatic provider fallback during pilot;
- refresh-token/per-device sessions;
- calendar, exact time blocks, and broad integrations.

## Values required before scaffold lock

The proposed release lines, repository layout, named owners, environment boundary, migration convention, and Kavenegar boundary are recorded in [[05-Implementation/m1-entry-package]] and [[05-Implementation/m1-configuration-register]]. They remain proposals until the required owners approve that register. Exact patch versions belong in generated manifests and lockfiles and must be reviewed before scaffold commit.

Authority: `LEG-02`, `LEG-07`, Discussions 019A–020C, and the authoritative M1–M8 sequencing in closed Discussion 022.
