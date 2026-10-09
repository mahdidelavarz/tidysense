# Logging and Observability

Step 3 adds a safe command log with command type, outcome, duration and correlation ID; the same correlation ID is stored in the domain event. HTTP Problem Details carries `traceId` and `correlationId`. The remaining AI/provider metrics and operational alerting below are later-slice work.

- Assign/propagate a correlation or trace ID from HTTP through application, database/outbox, and provider adapters.
- Use structured named fields, not interpolated payload dumps.
- Record operation, outcome, duration, safe entity/type identifiers, rule/artifact versions, and normalized error code.
- Never log OTPs, session/JWT values, API keys, full phone numbers, raw sensitive prompts, provider URLs containing credentials, or unrestricted request bodies.
- Health and readiness are separate: liveness must not depend on every external provider; readiness verifies required internal dependencies safely.
- Semantic product events are not debug logs. They use a versioned catalog and transactionally committed outbox intent.
- Each durable event type/version registers a payload schema. Only its approved fields may be written; nested authentication/credential fields and direct phone/email identity are rejected. Payloads are JSON objects capped at 4,096 UTF-8 bytes in the application policy and PostgreSQL. Outbox records hold delivery metadata and an event reference, never a second payload copy.
- `DomainEvent.CommandResultId` links to the authoritative R1 result. It is not an originating-command identifier. `CommandResult.IdempotencyRecordId` is correlation metadata without a retention-blocking foreign key, so shorter-lived R4 idempotency/outbox rows can be deleted independently of R1 evidence.
- AI observability records bounded metadata/artifact versions and approved retention classes, not raw content by default.
- Every AI operation step is one `AiInvocations` row (retention class R4): a physical provider call (sequence 1 or 2) or the reason no call was made (sequence 0). It holds the output family, logical configuration key, provider key and model, prompt/schema/context-builder/repair-policy versions, estimated and actual tokens, cost from the configured prices, latency, outcome, internal failure class, the gate that rejected an output, the repair rules applied, the retry reason and the context reduction. It never holds a prompt, a response or user text; raw content (R6) is not stored at all. The same fields are logged as one structured line per row. Internal failure classes stay in these records; a client sees only the bounded attempt failure code. A row belongs to a planning attempt (`PlanningAttemptId`, family `PLANNING`) or to a Reconcile explanation (`ReconcileExplanationId`, family `RECONCILE`).
- Metrics/alerts need an owner, threshold, consumer, and response; do not emit unowned telemetry.
- Pilot metrics are the versioned SQL definitions of `PilotMetricCatalog`, each returning a numerator and a denominator for a window and a population; see `../operations/metric-dictionary.md`. Operational AI figures are read from `AiInvocations`. Both are served only to operator accounts (`GET /api/v1/operations/*`, `404` for anyone else) and only as aggregates.
- Alerts are the pure rules of `OperationsAlertRules`. They are evaluated on every read of `/api/v1/operations/health` and after each maintenance run, where every active alert is written as one `OPS_ALERT` line (rule, severity, scope, value, threshold). Nothing delivers an alert outside the application yet. Responses are in `../operations/runbooks.md`.
- Every persisted record type has a retention class in `RetentionCatalog`; a new entity must be added there or the test suite fails. `OperationsMaintenanceService` purges R4/R3/R2 hourly and records each run in `OperationsRecords` (counts only). Account erasure replaces the user id on retained R1 rows with a tombstone, so an event payload must keep holding codes and counts, never user text.

## Related Mind Map

- [Events, AI observability and retention](../../mindmap/01-Closed-Discussions/019c-events-ai-observability-and-retention.md) — semantic evidence and privacy classes.
- [Structured-output reliability and cost controls](../../mindmap/01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls.md) — AI runtime observability.
- [AI guardrails](../../mindmap/04-Specs/ai-guardrails.md) — minimized content and safety boundaries.
