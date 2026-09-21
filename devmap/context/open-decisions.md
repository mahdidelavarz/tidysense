# Open Decisions

Only `DEC-011` remains intentionally deferred: Docker Compose/local orchestration, CI provider, full deployment pipeline and broader orchestration strategy. Resolve it when concrete implementation/release automation requires a choice; it does not block the first canonical foundation slice.

`CON-013` is a documentation-sequencing conflict rather than a new product decision. Stable DevMap STEP IDs follow authoritative Discussion 022, but the Mind Map dependency/exit artifacts must be reconciled before STEP-07. It does not block STEP-02.

Secrets must never be committed. Existing tracked provider/database/OTP secrets require removal and rotation regardless of `DEC-011`.

Operational values (exact package versions, configured pilot timezone, JWT lifetimes/keys, provider/model budgets, retention schedule and readiness owners) are configuration work, not open product/architecture decisions.
