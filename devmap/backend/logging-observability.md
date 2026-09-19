# Logging and Observability

The current code has default ASP.NET logging only; the rules below are `LOCKED` by implementation/readiness documents but not implemented.

- Assign/propagate a correlation or trace ID from HTTP through application, database/outbox, and provider adapters.
- Use structured named fields, not interpolated payload dumps.
- Record operation, outcome, duration, safe entity/type identifiers, rule/artifact versions, and normalized error code.
- Never log OTPs, session/JWT values, API keys, full phone numbers, raw sensitive prompts, provider URLs containing credentials, or unrestricted request bodies.
- Health and readiness are separate: liveness must not depend on every external provider; readiness verifies required internal dependencies safely.
- Semantic product events are not debug logs. They use a versioned catalog and transactionally committed outbox intent.
- AI observability records bounded metadata/artifact versions and approved retention classes, not raw content by default.
- Metrics/alerts need an owner, threshold, consumer, and response; do not emit unowned telemetry.
