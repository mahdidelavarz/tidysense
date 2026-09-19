# Shared Error Contract

ASP.NET Core uses a central `IExceptionHandler` to produce RFC 9457 Problem Details. MVC exception filters are not the primary global mechanism.

| Category | HTTP | Stable code example |
|---|---:|---|
| request/field validation | 400 | `VALIDATION_FAILED` with field `errors` |
| authentication | 401 | `AUTHENTICATION_REQUIRED` |
| authorization | 403 or ownership-safe 404 | `FORBIDDEN` / `RESOURCE_NOT_FOUND` |
| missing resource | 404 | `RESOURCE_NOT_FOUND` |
| domain/business rule | 409 or contract-specific 422 | `DOMAIN_RULE_VIOLATION` |
| stale/concurrency | 409 | `VERSION_CONFLICT` |
| unexpected | 500 | `UNEXPECTED_ERROR` |

Every response includes safe `type`, `title`, `status`, stable `code` and `traceId`; `detail` is safe and `errors` appears only for field-addressable validation. Never expose stack traces, SQL/provider messages, secrets, other-user existence or raw prompts. Frontend localizes known codes and makes conflicts actionable.
