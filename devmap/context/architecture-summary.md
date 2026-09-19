# Architecture Summary

Frontend routes/pages compose feature UI. API services perform transport only. TanStack Query owns server state; RHF owns form state; Zustand is reserved for true cross-feature client state; URL/router owns shareable navigation/filter state; React owns local ephemeral state.

Backend HTTP controllers call application services/use cases. Business invariants and lifecycle transitions belong in domain code; EF Core/Npgsql owns persistence mapping and queries; external SMS/AI providers sit behind application-owned interfaces. Consequential writes use authorization, expected versions, transaction/idempotency, outbox, and authoritative results.

Dependency direction: UI -> frontend data layer -> HTTP -> controller -> application -> domain/ports; infrastructure implements ports. Domain does not depend on ASP.NET Core, EF Core, provider SDKs, or frontend types.

Current code only partially follows this target: controllers -> services -> `AppDbContext` is established for IAM/prototype CRUD. Repository/module policy for canonical aggregates remains open.
