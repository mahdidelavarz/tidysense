# Backend Summary

.NET 10, ASP.NET Core and EF Core/Npgsql/PostgreSQL. Auth is JWT in an HttpOnly cookie with `sessionEpoch`; no refresh/per-device/session inventory. OTP uses normalized mobile identities and Kavenegar. Central `IExceptionHandler` produces RFC 9457 with stable codes.

IDs are Guid/uuid; instants are UTC-compatible DateTimeOffset/timestamptz; local dates are DateOnly/date. User-owned resources enforce server ownership; shared/system records do not gain artificial owners. Use xUnit + WebApplicationFactory with real PostgreSQL through Testcontainers or an isolated configured local database. The canonical M1 schema/auth/Project-read foundation remains unchanged above persistence; the temporary SQL Server infrastructure is superseded.

## Related Mind Map

- [Authentication specification](../../mindmap/04-Specs/auth-phase-1.md) — OTP/JWT/session completion authority.
- [Canonical backend reference](../../mindmap/05-Implementation/backend-domain-package/dotnet-ef-core-reference.md) — persistence and ownership handoff.
