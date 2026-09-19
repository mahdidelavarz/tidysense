# Product-to-Code Map

This file routes product concepts to implementation areas; it does not restate their behavior.

| Concept | Product authority | Backend destination | Frontend destination | Status |
|---|---|---|---|---|
| identity, OTP, session | `001-008-legacy-surviving-decisions`, auth spec | Auth application/infrastructure | auth routes/forms/session bootstrap | `CONFLICT`: current session/provider differ |
| Goal | Discussions 012, 012A, 019A | canonical aggregate + persistence + commands | Goal list/detail/create | blocked by product consolidation |
| Project | same family | canonical aggregate replacing prototype Project | Project list/detail/create | prototype API exists; canonical implementation absent |
| Task / Today | Discussions 015–015A, 019A; later 025–026 | Task aggregate, Today query, commands/events | Today + Task surfaces | `CONFLICT`: Backlog/dependency amendments not consolidated |
| Routine / occurrence | Discussions 015–015B; later 024 | Routine aggregate, occurrence generation/resolution | Routine and Today states | `CONFLICT`: single vs multi-time identity |
| Planning | Discussions 013–014A, 020A–020C; later 023/026 | attempt/draft/fact ports, validation, confirmation | chat/draft/review/apply state machines | later facts/capture amendments pending |
| Reconcile | Discussions 016–018A, 020A–020C | deterministic facts first; optional AI adapter; confirmed commands | overview/session/review-and-apply | crisis and hierarchy sources conflict |
| Work Hub and IA | `FOR_CODEX.md` | cross-entity read model only | temporal big-picture destination | pending consolidation |
| events/evidence | Discussion 019C and 021 | semantic events + transactional outbox | correlation and result states only | not implemented |

The implementation must never infer product rules from this table. Follow the linked owning source.
