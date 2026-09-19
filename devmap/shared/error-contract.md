# Shared Error Contract

Backend returns RFC 9457 Problem Details. Frontend normalizes but preserves:

```json
{
  "type": "https://.../problems/version-conflict",
  "title": "The resource changed",
  "status": 409,
  "detail": "Safe user-facing detail",
  "code": "VERSION_CONFLICT",
  "traceId": "...",
  "errors": { "fieldName": ["..."] }
}
```

Required rules:

- `code` is stable application vocabulary; text may be localized.
- `traceId` connects user/support reports to safe logs.
- `errors` appears only for field-addressable validation failures.
- Never expose stack traces, SQL/provider messages, secrets, other-user existence, raw prompts, or internal IDs not in the contract.
- Frontend maps known codes to contextual Persian UI; unknown errors use a safe generic state and retain trace ID.
- A conflict is actionable (refresh/review/reconfirm), not a generic toast.
- A failed atomic operation states that nothing was applied when that is authoritative.

The middleware/filter mechanism and initial code catalog are `OPEN DECISION DEC-006`.
