# New API Endpoint

1. Confirm product/use-case authority and caller.
2. Reuse/extend a versioned resource or command instead of creating an action-shaped endpoint by habit.
3. Define request, response/CommandResult, permissions/ownership, expected version, idempotency, statuses, and errors before code.
4. Implement transport DTO validation, application/domain behavior, transaction/events, mapping, and controller.
5. Add API/PostgreSQL tests for success, validation, unauthenticated, forbidden/cross-user, not-found, conflict, replay, and failure as applicable.
6. Verify generated OpenAPI and frontend contract strategy.
7. Add frontend service/hook only after the contract is reviewed.

Never return EF entities or provider response types.
