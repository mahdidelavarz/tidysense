# API, Validation, and Errors

## API contract

- `LOCKED`: JSON REST under `/api/v1`, camelCase, UTF-8.
- `LOCKED`: UTC instants serialize as ISO 8601 with offset/`Z`; local dates serialize as `YYYY-MM-DD` without timezone conversion.
- `LOCKED`: IDs serialize as strings for canonical UUID resources.
- GET is read-only; POST creates/commands; PUT replaces the documented editable shape; PATCH is used only with an explicit partial-update contract; DELETE follows product lifecycle semantics, never assumed physical deletion.
- Create normally returns `201` with `Location`; reads/updates return `200`; successful bodyless commands return `204`; asynchronous resources follow their owning explicit contract.
- Lists use the shared cursor contract, deterministic ordering and allowlisted feature-specific filters/sorts; do not invent a universal query language or private envelope.

## DTOs and mapping

Request/response DTOs are separate from EF/domain entities. DataAnnotations are the current `INFERRED` transport-validation pattern. AutoMapper is appropriate for stable field mapping/projection; security-sensitive, lifecycle, or computed mappings remain explicit.

## Validation layers

1. Transport: required fields, type/shape, lengths, basic formats.
2. Application/domain: ownership, current state, lifecycle, temporal, cross-field and authorization rules.
3. Database: uniqueness, FKs, checks, concurrency, cross-owner protection where representable.

Client validation improves feedback but never replaces these layers.

## Errors

All non-success responses use RFC 9457 Problem Details with stable `type`, HTTP `status`, safe `title/detail`, `traceId`, and an application `code`. Validation errors include field-keyed errors. Do not expose exception text, SQL/provider messages, secret values, existence of another user's resource, or raw AI/provider responses.

Use ownership-safe `404`; `401` for unauthenticated; `403` for authenticated permission denial when existence disclosure is safe; `409` for version/idempotency conflict; contract-specific `422` for a well-formed semantic failure; `429` for rate limiting. Central `IExceptionHandler` owns the stable-code Problem Details mapping.

## Related Mind Map

- [API contract index](../../mindmap/04-Specs/api-contracts-phase-1.md) — global contract and resource families.
- [API/frontend state contracts](../../mindmap/01-Closed-Discussions/020b-api-and-frontend-state-contracts.md) — lifecycle and failure-state distinctions.
