# Context Index

Use the smallest context set that can safely answer the task.

| Task | Read first | Then |
|---|---|---|
| any implementation | `context/project-summary.md`, `context/active-conventions.md` | relevant checklist |
| backend feature | `context/backend-summary.md` | `backend/README.md` and linked detail |
| frontend feature | `context/frontend-summary.md` | `frontend/README.md` and linked detail |
| domain/lifecycle change | `context/domain-summary.md` | owning Mind Map discussion |
| API integration | `shared/api-contracts.md` | backend API + frontend data-flow documents |
| schema change | `workflows/schema-change.md` | backend persistence + operations migrations |
| bug fix | `workflows/bug-fix.md` | only implicated module/code |
| architectural choice | `decisions/README.md` | create ADR if threshold is met |

Read the complete Mind Map only when a new domain concept is introduced, a lifecycle/temporal rule is touched, authority is unclear, or product sources conflict. Read the complete codebase only for cross-cutting migration or audit tasks.
