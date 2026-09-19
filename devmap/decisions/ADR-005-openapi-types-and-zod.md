# ADR-005: OpenAPI Transport Types and Zod

- Status: Accepted
- Date: 2026-09-19

## Decision

The backend OpenAPI document is the transport-contract authority. Generate TypeScript request/response types (and a thin client where selected) from it. Use Zod for forms, frontend-only constraints, and runtime validation only where explicitly useful. Do not hand-maintain a second transport schema system.

## Consequences and workflow

Backend contract changes regenerate the client artifact in a deterministic command and CI checks for drift. Generated code is not hand-edited. Feature code maps generated DTOs to UI/domain view models only when that distinction has value. Zod schemas may compose transport types but do not redefine server truth.
