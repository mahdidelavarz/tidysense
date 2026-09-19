# Backend Summary

.NET 10, ASP.NET Core, EF Core/Npgsql/PostgreSQL. Auth is JWT in HttpOnly cookie with `sessionEpoch`; no refresh/per-device/session inventory. OTP uses normalized mobile identities and Kavenegar. Central `IExceptionHandler` produces RFC 9457 with stable codes.

IDs are Guid/uuid; instants DateTimeOffset/timestamptz; local dates DateOnly/date. User-owned resources enforce server ownership; shared/system records do not gain artificial owners. Use xUnit + Testcontainers + WebApplicationFactory and real PostgreSQL. Prototype opaque sessions, integer IDs, IPPanel, unversioned routes and Project permission-only access require migration.
