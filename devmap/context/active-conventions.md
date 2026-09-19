# Active Conventions

- Product name TidySense; repository roots `/frontend` and `/backend`.
- API `/api/v1`; no dual obsolete routes; camelCase JSON; RFC 9457 via `IExceptionHandler`.
- Guid/uuid identities; DateTimeOffset instants; DateOnly local dates; one configured pilot IANA timezone.
- Keep existing EF/PostgreSQL identifier naming; no global snake_case.
- JWT HttpOnly cookie + sessionEpoch; Kavenegar; backend security authority.
- Feature-oriented backend with direct EF for simple work and only justified narrow ports/repositories; no generic repository.
- Feature-oriented frontend, TanStack file routes, generated OpenAPI types + Zod forms.
- Cursor pagination with stable ordering and allowlisted feature filters/sorts.
- xUnit/Testcontainers/WebApplicationFactory; Vitest/Testing Library/Playwright.
- Prefer existing patterns/shared code, then small explicit feature code; extract only after real repetition.
- No dedicated crisis UX/gate. General provider safeguards, hostile-input isolation, minimized context, no diagnosis/AI mutation and manual fallback remain.
