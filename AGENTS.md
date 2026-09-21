# TidySense Execution Protocol

This file routes work; it does not duplicate product or technical specifications.

## Source-of-truth hierarchy

1. `/mindmap` defines product **WHAT** and **WHY**.
2. `/devmap` defines technical **HOW**.
3. Code is current implementation evidence, not automatic authority.

Accepted Mind Map decisions override contradictory product behavior in older docs or code. Accepted DevMap conventions override ad-hoc implementation patterns. Report an unresolved contradiction instead of guessing.

## Progressive context loading

Use this path:

```text
AGENTS.md
→ devmap/context/context-routing.md
→ devmap/development-steps.md
→ focused DevMap authorities
→ focused Mind Map sources
→ relevant source code
```

For implementation work, read `devmap/context/active-conventions.md`, identify the requested step/module, and load only the context listed by the routing map and that step. Do not read all DevMap files, all Mind Map files, or all repository code unless the task genuinely requires a cross-cutting audit or migration.

## Task execution

1. Identify the requested module and canonical step.
2. Read this file and `devmap/context/active-conventions.md`.
3. Read the step and verify its dependencies/status.
4. Read only its referenced DevMap authorities.
5. Follow its exact Mind Map links when product/domain behavior is involved.
6. Inspect the relevant existing source and tests.
7. Implement only the requested scope.
8. Run the step's required verification.
9. Update DevMap only when a reusable convention or step evidence/status changed.
10. Stop and report; do not begin the next step automatically.

Do not rescan the repository or reread the whole Mind Map by default.

## Numbered-step discipline

`devmap/development-steps.md` is the canonical implementation roadmap. Stable step IDs are not casually renumbered.

When the user says **Start Step N**:

1. read that step and its dependencies;
2. verify required prior steps are `DONE`;
3. load only the listed DevMap, Mind Map, and relevant code context;
4. give a concise plan when useful;
5. implement only that step;
6. run its verification suite;
7. update evidence and status only after verification;
8. stop and report.

**Continue Step N** resumes only its unfinished checklist. **Review Step N** audits completion criteria and does not add new scope. Never jump to the next step without an explicit user request.

## Reuse and architecture

- Prefer an existing pattern when it is semantically correct.
- Reuse shared infrastructure where it represents the same concern.
- Avoid premature abstraction, speculative architecture, and silent new conventions.
- Do not add generic repositories unless a concrete boundary justifies one.
- Do not perform unrelated refactors.
- If the current pattern is inadequate, surface the decision before spreading a replacement.

## Documentation

When implementation changes a reusable technical convention, update its authoritative DevMap document and update `active-conventions.md` only when broadly relevant. Update this file only when the global execution protocol changes. Product behavior belongs in the Mind Map; feature details do not belong here.
