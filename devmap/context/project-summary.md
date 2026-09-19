# Project Summary

TidySense (product documents: Adaptive Planner) helps a user turn an intention into a credible plan, execute through Today, and adapt through Reconcile. AI proposes/explains within bounded contracts; the user authorizes consequences; deterministic backend services own canonical mutation.

## Frequent concepts

Goal, Project, Task, Routine, RoutineOccurrence, PlanningDraft, Today, deterministic Reconcile, optional AI explanation, preview/confirmation, CommandResult, semantic events/outbox. Later accepted sources add PlanningFact, dependency sequences, multi-time Routine occurrences, and CaptureItem but are not consolidated.

## Stack and repository

- `frontend/`: React 19, TypeScript, Vite 8, Tailwind 4; selected TanStack Router/Query, React Hook Form, Zod, Zustand, Axios, Jalali date utilities. UI is still a placeholder.
- `backend/`: ASP.NET Core/.NET 10, EF Core 10, Npgsql/PostgreSQL, AutoMapper, Swagger. IAM/session and prototype Project CRUD exist.
- `mindmap/`: product/behavior authority and implementation planning.
- `devmap/`: recurring technical implementation authority after acceptance.

## Constraints

- Persian UI and RTL are project-wide.
- Manual paths remain available; AI never mutates canonical state directly.
- Ownership, expected version, preview, warnings, confirmation, commit-time revalidation, atomicity, and events are first-class mutation requirements.
- Local SDK is currently .NET 9 while the backend targets .NET 10.
- Do not implement modules affected by conflicts in `decisions/README.md`.
