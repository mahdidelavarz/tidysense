# Backend Feature Checklist

- [ ] no blocking conflict/open architecture choice was guessed
- [ ] domain rules are outside controller/EF configuration
- [ ] user-scoped authorization/ownership is enforced
- [ ] DTO/validation/mapping and `/api/v1` contract are explicit
- [ ] migration/constraints/indexes/concurrency reviewed
- [ ] transaction/idempotency/outbox/CommandResult implemented where required
- [ ] safe Problem Details and traceability exist
- [ ] secrets/sensitive values are neither tracked nor logged
- [ ] real PostgreSQL and API tests cover failure boundaries

Details: `../backend/README.md`.
