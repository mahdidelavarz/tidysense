# Active Conventions

- Product name TidySense; repository roots `/frontend` and `/backend`.
- API `/api/v1`; no dual obsolete routes; camelCase JSON; RFC 9457 via `IExceptionHandler`.
- Guid identities; DateTimeOffset instants; DateOnly local dates; one configured pilot IANA timezone.
- Keep existing EF/PostgreSQL identifier naming; no provider-driven naming rewrite.
- JWT HttpOnly cookie + sessionEpoch; Kavenegar; backend security authority.
- Feature-oriented backend with direct EF for simple work and only justified narrow ports/repositories; no generic repository.
- Feature-oriented frontend, TanStack file routes, generated OpenAPI types + Zod forms.
- Cursor pagination with stable ordering and allowlisted feature filters/sorts.
- PostgreSQL/Npgsql is canonical; domain/application/API contracts remain provider-neutral.
- xUnit + real PostgreSQL (Testcontainers or configured local instance) + WebApplicationFactory; Vitest/Testing Library/Playwright.
- Local backend secrets use .NET User Secrets; real-PostgreSQL tests use user/process-scoped `TIDYSENSE_TEST_POSTGRES`. Use root `dev.ps1` commands; Vite proxies `/api` to backend HTTPS without broad local CORS.
- `development-steps.md` is the canonical execution roadmap. Start/Continue/Review commands stay inside one requested step, verify dependencies, update evidence only after checks pass, and never advance automatically.
- Load context progressively through `/AGENTS.md` → context routing → requested step → focused authorities → relevant code; do not rescan all DevMap/Mind Map/code by default.
- Prefer existing patterns/shared code, then small explicit feature code; extract only after real repetition.
- No dedicated crisis UX/gate. General provider safeguards, hostile-input isolation, minimized context, no diagnosis/AI mutation and manual fallback remain.
