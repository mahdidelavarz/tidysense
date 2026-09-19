# Canonical Module Implementation Loop

For a module such as Goal:

1. Read `context/project-summary.md` and `context/active-conventions.md`.
2. Read `checklists/module-checklist.md` and relevant backend/frontend documents.
3. Check `decisions/README.md` for affected conflicts/open decisions.
4. Read only the owning product discussion(s).
5. Record acceptance scenarios, entities, lifecycle, permissions, temporal rules, and events.
6. Inspect the closest existing implementation pattern; state why it applies.
7. Implement domain types and transition tests.
8. Add/alter EF configuration and migration; test real PostgreSQL behavior.
9. Implement the application use case, authorization, transaction, idempotency, and events.
10. Add DTOs, transport validation, mapping, versioned endpoint, errors, and API tests.
11. Add frontend contract types/schema and API service.
12. Add query keys and query/mutation hooks.
13. Build entity-specific forms and feature components.
14. Integrate route/page and all required UI states.
15. Verify Persian, RTL, keyboard, responsive, and accessibility behavior.
16. Run domain, integration, contract, frontend, and end-to-end tests required by risk.
17. Verify the original product scenarios and `CommandResult`, event, and ownership evidence.
18. Update DevMap only if a reusable convention changed.

Do not redesign architecture during an ordinary module task. If the current pattern is inadequate, propose a decision/ADR before spreading a replacement.
