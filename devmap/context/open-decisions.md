# Open Decisions

Only `DEC-011` remains intentionally deferred: Docker Compose/local orchestration, CI provider, full deployment pipeline and broader orchestration strategy. Resolve it when concrete implementation/release automation requires a choice; it does not block the first canonical foundation slice.

Secrets must never be committed. Existing tracked provider/database/OTP secrets require removal and rotation regardless of `DEC-011`.

Operational values (exact package versions, configured pilot timezone, JWT lifetimes/keys, provider/model budgets, retention schedule and readiness owners) are configuration work, not open product/architecture decisions.
