# TidySense Product Mind Map

This vault contains the accepted product model, architecture projections, research, migration records and implementation planning for **TidySense**. “Adaptive Planner” is historical product-development terminology, not the current name.

## Read in this order

1. [[00-START-HERE]]
2. [[02-Decisions/accepted-decision-inventory-001-021]]
3. [[04-Specs/ai-native-mvp-baseline]]
4. [[01-Closed-Discussions/022-updated-mvp-implementation-plan]]
5. [[00-Canvas/Planner-Mindmap.canvas]]
6. [[../devmap/README]]

## Current state

- Discussions 010–026 are closed; 023–026 are the latest amendments and override older contradictions.
- The canonical loop is `Plan → Execute → Adapt`.
- Implementation has started: backend IAM/Project scaffolding and the frontend scaffold exist.
- Existing scaffolding does not prove any milestone gate complete. Gates require their recorded tests and evidence.
- The repository remains rooted at `/frontend` and `/backend`.
- The DevMap decision register is consolidated; only `DEC-011` (local/CI/deployment orchestration) remains deferred.
- Pilot and release readiness are not claimed.

## Authority

For product behavior, later accepted discussions override earlier contradictory text. The consolidated inventory and baseline project that result. Historical discussion bodies remain evidence and must be read with their amendment notices.

Technical architecture is owned by `/devmap` and the accepted ADRs there. The backend is .NET 10 / ASP.NET Core / EF Core / PostgreSQL. Prototype code is evidence, not authority where it conflicts with an accepted contract.

## Change rule

Do not silently change accepted behavior. Update the owning decision before changing its canonical projections. Documentation consolidation must not be treated as feature implementation.
