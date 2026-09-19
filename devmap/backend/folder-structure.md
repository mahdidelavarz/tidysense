# Backend Folder Structure

## Current

```text
backend/
  Common/Auth, Common/Exceptions
  Controllers/
  Data/
  DTOs/
  Interfaces/
  Mappings/
  Migrations/
  Models/
  Services/
```

This type-based scaffold is `INFERRED`, but it has only one product entity and IAM. It is insufficient evidence to lock all future modules into global `Models/Services/DTOs` folders.

## Open choice

The persistence policy is resolved: feature/application code may use `AppDbContext` directly for simple work; add only justified narrow repositories/ports. The smallest candidate structures are:

```text
Features/Goals/{Domain,Application,Contracts,Infrastructure}
```

or retaining type-based top-level folders with strict feature subfolders. In either case, composition remains in `Program.cs`, cross-cutting code remains genuinely cross-cutting, and provider adapters remain infrastructure.

Do not move existing code merely to make the tree look architectural. Migrate only as part of an accepted module boundary decision.
