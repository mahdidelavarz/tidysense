# Terminology and Naming

Canonical product name: **TidySense**. “Adaptive Planner” is historical terminology only.

Use Goal, Project, Task, Routine, RoutineOccurrence, PlanningFact, CaptureItem, PlanningDraft, Today, Reconcile and CommandResult precisely. Backlog, canonical Plan, Task placement and Task review date are removed. A C# domain type may be `TaskItem` to avoid `System.Threading.Tasks.Task`, while product/API copy stays `Task`.

- C#: PascalCase types/members, camelCase locals, `I` interface prefix, `Async` for awaitable I/O.
- TypeScript: PascalCase components/types, camelCase functions, `useX` hooks and feature query-key factories.
- API: `/api/v1`, plural resource nouns, camelCase JSON, stable documented enum/error strings.
- Database: keep the existing EF/PostgreSQL identifier convention; do not introduce a provider-driven naming rewrite.
- Repository: root `/frontend` and `/backend`; never document `/app/frontend` or `/app/backend`.

Avoid vague `Manager`, `Helper`, `CommonService`, `GeneralForm` and premature universal abstractions.

## Related Mind Map

- [AI-native MVP baseline](../../mindmap/04-Specs/ai-native-mvp-baseline.md) — canonical record names and removed terms.
- [Planning facts](../../mindmap/01-Closed-Discussions/023-persistent-planning-facts-and-rolling-execution-context.md), [Routine slots](../../mindmap/01-Closed-Discussions/024-multi-time-daily-routine-scheduling-and-occurrence-semantics.md), [Task sequences](../../mindmap/01-Closed-Discussions/025-task-dependency-sequences-and-hierarchical-reconcile-grouping.md), and [Capture/Backlog removal](../../mindmap/01-Closed-Discussions/026-backlog-removal-parent-owned-undated-tasks-and-quick-capture.md) — later terminology amendments.
