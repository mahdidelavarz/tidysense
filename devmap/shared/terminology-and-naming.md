# Terminology and Naming

Canonical product name: **TidySense**. “Adaptive Planner” is historical terminology only.

Use Goal, Project, Task, Routine, RoutineOccurrence, PlanningFact, CaptureItem, PlanningDraft, Today, Reconcile and CommandResult precisely. Backlog, canonical Plan, Task placement and Task review date are removed. A C# domain type may be `TaskItem` to avoid `System.Threading.Tasks.Task`, while product/API copy stays `Task`.

- C#: PascalCase types/members, camelCase locals, `I` interface prefix, `Async` for awaitable I/O.
- TypeScript: PascalCase components/types, camelCase functions, `useX` hooks and feature query-key factories.
- API: `/api/v1`, plural resource nouns, camelCase JSON, stable documented enum/error strings.
- Database: keep existing EF/PostgreSQL convention; do not introduce global snake_case.
- Repository: root `/frontend` and `/backend`; never document `/app/frontend` or `/app/backend`.

Avoid vague `Manager`, `Helper`, `CommonService`, `GeneralForm` and premature universal abstractions.
