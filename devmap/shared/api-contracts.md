# Shared API Contract

## Baseline

- Base path `/api/v1` (`CON-006` governs prototype transition).
- JSON camelCase; explicit content type; secure same-origin cookie authentication.
- Frontend never stores/attaches bearer material from JavaScript state.
- Direct success bodies unless an explicit asynchronous resource/CommandResult contract requires otherwise.
- Generated OpenAPI detects drift; Markdown/product sources still own behavior.

## Representation

- IDs use the representation selected by `DEC-012`; clients treat them as opaque and do not derive meaning from them.
- Enums: documented stable strings; unknown value handling must fail visibly, not coerce.
- Optional field: may be omitted only when contract says it is optional.
- Nullable field: sent as `null` only when null has defined meaning. Optional and nullable are not synonyms.
- Instant: ISO 8601 UTC/offset. Local date: `YYYY-MM-DD`. Local time: explicit `HH:mm[:ss]` without fabricated offset.
- Version/ETag/expectedVersion follows the owning command contract and is never invented client-side.

## HTTP and mutations

- GET is safe/idempotent; POST creates or invokes a named command; PUT/PATCH semantics are explicit.
- Idempotency identity is required for retryable consequential commands according to product contracts.
- Validation `400`; unauthenticated `401`; forbidden `403` where safe; ownership-safe missing `404`; conflict/stale `409`; provider/internal failure safe `5xx`.
- Confirmation response is not application success. The browser waits for authoritative command/resource state.
- Bulk operations are atomic where product rules require; no synthetic partial-success envelope.

Pagination/filter/sort and frontend schema-generation remain open decisions. No endpoint defines a private convention by itself.
