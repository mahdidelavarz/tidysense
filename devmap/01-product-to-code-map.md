# Product-to-Code Map

This routes accepted concepts; it does not redefine behavior.

| Concept | Product authority | Backend destination | Frontend destination | State |
|---|---|---|---|---|
| identity/OTP/session | accepted auth model + ADR-001 | JWT cookie/sessionEpoch, OTP use cases, Kavenegar | auth routes and current-user bootstrap | prototype migration required |
| Goal | 012/019A/026 | Guid aggregate, ownership, review snapshot | feature list/detail/create | not canonical yet |
| Project | 012/019A/026 | Guid user-owned aggregate replacing prototype | feature list/detail/create | unsafe prototype exists |
| Task/Today | 015/019A/025/026 | Task, sequence rules, Today query/events | Task/Today features | not implemented |
| Routine/occurrence | 015/019A/024 | multi-slot local scheduling/generation | Routine/Today features | not implemented |
| PlanningFact/Planning | 013–014A/020/023/026 | attempts/drafts/facts/context/apply | chat/draft/review/apply | not implemented |
| CaptureItem | 026 | capture lifecycle/resolution/events | Quick Capture and Reconcile lane | not implemented |
| Reconcile | 016–018A/020/025/026 | deterministic facts/grouping first, optional AI | overview/session/review/apply | not implemented |
| events/evidence | 019C/021/023–026 | semantic events + atomic outbox | correlation/result states | not implemented |
| Work Hub/IA queue | `FOR_CODEX.md` items 2–9 | future read models as accepted later | pending product consolidation | not canonical in this pass |

Canonical infrastructure: `/api/v1`, UUID/Guid, DateTimeOffset/DateOnly, current EF naming, central Problem Details, OpenAPI-generated transport types. Do not infer architecture from prototype code.
