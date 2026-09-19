# Active Conventions

Fast checklist for ordinary implementation:

- `[LOCKED]` Product behavior comes from the owning Mind Map decision; do not invent or simplify it.
- `[LOCKED]` C#/ASP.NET Core .NET 10 + EF Core/Npgsql/PostgreSQL; React/strict TypeScript/Vite/Tailwind 4.
- `[LOCKED]` Persian UI, RTL layout, semantic color tokens.
- `[LOCKED]` `/api/v1`, camelCase, UTC instants, ISO local dates, Problem Details errors.
- `[LOCKED]` Server owns authorization, lifecycle, derived facts, versions, and successful mutation.
- `[LOCKED]` AI output is proposal/explanation only; manual paths remain.
- `[LOCKED]` Consequential mutation: ownership -> preview -> warning/selection -> confirmation -> revalidation -> atomic commit/outbox -> CommandResult.
- `[INFERRED]` Async controller/service methods, DI-scoped services, EF async queries, DTOs, AutoMapper, file-scoped C# namespaces.
- `[LOCKED]` Server state Query; form state RHF; cross-feature client state Zustand; URL navigation/filter state; local UI React.
- `[INFERRED]` TanStack file routing is intended but not operational; check `DEC-004` before wiring.
- `[INFERRED]` Global Tailwind theme tokens belong in `frontend/src/index.css`.
- Search before adding a component, hook, service, utility, store, validator, abstraction, or dependency.
- Prefer explicit feature code; abstract only after a stable repeated pattern exists.
- Handle loading, empty, error, validation, submitting, disabled, unauthorized, forbidden, not-found, conflict, and success states as applicable.
- Add tests by risk and contract, not coverage percentage.
- Update DevMap only for reusable decisions.
