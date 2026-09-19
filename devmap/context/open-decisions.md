# Open Decisions

Authoritative detail is in [`../decisions/README.md`](../decisions/README.md).

## Blocking conflicts

- Product consolidation: Discussions 023–026 and `FOR_CODEX.md` versus the 001–022 baseline/canvas.
- Authentication contract: JWT + `sessionEpoch` versus opaque database sessions.
- SMS provider: Kavenegar versus IPPanel.
- Canonical UUID/versioned model versus current integer User/Project prototype.
- `/api/v1` versus current unversioned routes.
- prototype Project permission without ownership scoping.
- milestone documents that say implementation has not started despite existing scaffolds.

## Technical choices needed before systematic modules

- canonical backend module/repository boundary;
- canonical/auth ID type and migration strategy;
- CLR temporal types and PostgreSQL identifier naming;
- backend and frontend test stacks;
- frontend feature folder structure and router bootstrap;
- generated OpenAPI/frontend schema approach;
- Problem Details exception mechanism/error-code catalog;
- list pagination/filter/sort contract;
- user timezone/calendar-source policy;
- remaining design-system scales;
- local/CI orchestration and secret mechanism.

Do not convert an item here into a de facto decision inside feature code.
