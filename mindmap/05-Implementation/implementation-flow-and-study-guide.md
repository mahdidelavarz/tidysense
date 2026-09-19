# Implementation Flow and Study Guide

Status: **Canonical companion to Discussion 022**.

1. Read the consolidated inventory/baseline and the focused 023–026 discussion.
2. Read the relevant DevMap authority and ADR.
3. Inspect existing code as prototype evidence; do not inherit conflicting auth, IDs, routes, provider, dates or Project security.
4. Freeze the affected domain/API/event contract; update the reference projection if needed.
5. Implement a thin vertical slice using feature/application services and the minimum justified abstractions.
6. Test domain rules, real PostgreSQL behavior, API/security, frontend behavior and the critical E2E path.
7. Update DevMap/context and record evidence before marking a milestone gate complete.

Current first slice is M1 foundation/canonical ownership. Do not start Goal/Task/Routine/Today/Reconcile/Planning/AI features until the required foundation contract and evidence are ready.

Study priorities: ASP.NET Core JWT cookies and `IExceptionHandler`; EF Core Guid/DateOnly/DateTimeOffset/Npgsql behavior; Testcontainers + WebApplicationFactory; TanStack file routing/Query; OpenAPI TypeScript generation; RTL accessibility. Full orchestration remains deferred.
