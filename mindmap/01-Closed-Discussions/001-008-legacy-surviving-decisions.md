# Discussions 001–008 — Surviving Decisions Only

## Status

Stack amendment (2026-09-19): references to the inherited Java/Spring backend were replaced by the repository owner's .NET 10/ASP.NET Core/EF Core choice. The authentication, API, persistence, and deployment behavior retained by this document is otherwise unchanged.

Closed legacy reconciliation.

This file is the only retained output from Discussions 001–008. It is intentionally not a rewritten summary of those discussions. It contains only decisions that:

1. are still needed by the updated AI-native MVP,
2. were not replaced by Discussions 010–021,
3. do not contradict Discussion 022 or the accepted AI-native model, and
4. would otherwise be lost because the newer discussions do not restate them.

If an old decision is absent from this file, it must not be treated as current merely because it exists in an old discussion or Phase 1 spec.

## Source Discussions and Audit Disposition

The source files were removed from the active workspace after this comparison because Git history is sufficient for provenance and they must not be mistaken for current authority.

| Source | Disposition | Surviving material |
|---|---|---|
| `001-current-mindmap-review.md` | `PARTIALLY_SUPERSEDED` | research evidence and claim hygiene only |
| `002-ai-planning-reconcile-and-scheduling.md` | `PARTIALLY_SUPERSEDED` | evidence/source hygiene only; product, scheduling, confidence, and validation proposals are superseded |
| `003-phase-1-implementation-sequence.md` | `FULLY_SUPERSEDED` | none |
| `004-technical-foundation-sequencing.md` | `PARTIALLY_SUPERSEDED` | the bounded technical baseline listed in Section 3 |
| `005-phase-1-data-model.md` | `FULLY_SUPERSEDED` | none |
| `006-phase-1-auth-implementation-decisions.md` | `PARTIALLY_SUPERSEDED` | the authentication and session contract listed in Section 4 |
| `007-phase-1-api-contracts.md` | `PARTIALLY_SUPERSEDED` | only the global, authentication, and current-user conventions listed in Section 5 |
| `008-phase-1-implementation-plan.md` | `PARTIALLY_SUPERSEDED` | only the development and pilot-operation rules listed in Section 6 |

No `REQUIRES_REVIEW` item remains from Discussions 001–008. No Discussion 009 file exists in the current workspace or repository history, so there is no ninth legacy discussion to audit.

---

# 1. What Does Not Survive

No product-model or Reconcile-flow decision from Discussions 001–005 is retained.

In particular, this file does not preserve the old:

- Goal/Task-only product model
- manual Day-0 planning flow
- old Reconcile trigger, session, card flow, or Done/Carry/Drop-only model
- stored `carryCount` as canonical truth
- old behavioral-event taxonomy
- runtime-AI deferral
- old Phase 1 sequencing or validation window
- assumption that idempotency keys, optimistic concurrency, or persisted Reconcile sessions are unnecessary

Those subjects are owned by Discussions 010–021 and the final implementation plan in Discussion 022.

Discussion 003 and Discussion 005 contain no unique surviving decision.

---

# 2. Research Evidence and Claim Hygiene

The following research rule survives from Discussions 001 and 002:

- Community posts, anecdotes, and social-media reports are discovery evidence, not proof of causality or validated product demand.
- Every important external claim must retain its source, retrieval date, and evidence type.
- Claims that influence scope, safety, or validation gates must be verified against primary or otherwise reliable sources before implementation decisions depend on them.
- The product must not present anecdotal patterns as scientific conclusions.

This rule belongs to research and validation governance. It does not define product behavior.

---

# 3. Retained Technical Baseline

The following implementation choices remain the inherited baseline because the AI-native discussions did not replace them:

- frontend: React + TypeScript + Vite
- backend: C# + ASP.NET Core on .NET 10
- primary relational database: PostgreSQL
- versioned REST API under `/api/v1`
- containerized deployment with Docker and a same-site frontend/API boundary behind Nginx

These are implementation choices, not domain constraints. Discussion 022 may refine versions, packages, and deployment details without reopening the product model.

The following old technical choices are not retained here and require an explicit current decision if they are wanted: PWA scope, offline support, exact physical event-table layout, Redis exclusion, and old package/version lists.

---

# 4. Retained Authentication and Session Contract

The authentication decisions from Discussion 006 remain current because Discussions 010–021 do not replace identity or session handling.

## 4.1 Identity and login

- Phase 1 login uses phone-number OTP through SMS.
- OTP verification is both login and account recovery.
- `User.normalizedPhone` is the single identity anchor.
- The normalized value is required, unique in PostgreSQL, and stored as E.164.
- Phase 1 accepts Iranian mobile numbers only.
- Input normalization is a backend responsibility; raw input is not the uniqueness key.
- Google OAuth, email/password login, password recovery flows, social login, multiple identity providers, refresh tokens, and per-device session management are outside the retained scope.

## 4.2 OTP persistence and verification

- OTP challenges are persisted in PostgreSQL and never stored in plaintext.
- Minimum challenge data is: `id`, `normalizedPhone`, `purpose`, `codeDigest`, `expiresAt`, `attemptCount`, `usedAt`, and `createdAt`.
- The retained digest construction is `HMAC-SHA-256(serverSecret, normalizedPhone + purpose + code)`; the secret stays outside the database.
- OTP request responses must not reveal whether a phone number is registered.
- The SMS provider stays behind an application-owned gateway/adapter.
- Challenge locking/loading, validation, consumption, and create-or-load User behavior execute within one database transaction.
- JWT creation and cookie writing occur only after that transaction commits.
- The database unique constraint on normalized phone is the final duplicate-user guard; concurrent creation races must recover by loading the winning User rather than returning an internal error.

## 4.3 JWT session

- Successful verification issues one application-owned JWT session cookie; there is no refresh token.
- Required claims are `sub`, `iss`, `iat`, `exp`, `jti`, and `sessionEpoch`.
- Phone number, OTP data, profile data, and behavioral data must not be included in the JWT.
- `User.sessionEpoch` is a required non-negative revocation version.
- A token is valid only while its `sessionEpoch` matches the User's current value.
- Normal logout clears the current cookie.
- Logout-all or forced revocation increments `sessionEpoch` and clears the current cookie.

The exact OTP lifetime, resend cooldown, maximum attempts, request limits, OTP format, JWT lifetime, cookie name, SMS provider, and provider retry policy must be configured before pilot implementation; old suggested values are not retained as decisions.

## 4.4 Browser security boundary

- Production session cookie baseline: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, with `Domain` omitted unless deployment requires it.
- The frontend must not store the JWT in local storage, session storage, or JavaScript-readable state.
- Prefer the same-origin deployment shape in which Nginx serves the frontend and proxies `/api` to ASP.NET Core.
- Unsafe methods accept JSON only and validate `Origin` and/or `Referer`.
- CORS is explicit and credentialed access is limited to approved origins.
- OTPs, JWTs, and secrets must never appear in logs or client-visible provider errors.

The detailed retained contract is in [[04-Specs/auth-phase-1]]. Product-model sections of other old Phase 1 specs are not made current by this reference.

---

# 5. Retained Cross-Cutting API Conventions

Only the global, authentication, and current-user conventions from Discussion 007 survive. Its old Goal, Task, Today, Reconcile, app-presence, concurrency, and endpoint-inventory sections do not survive.

- Base path: `/api/v1`.
- Transport: JSON over HTTPS.
- JSON field names use `camelCase`.
- Instants use UTC ISO-8601; local dates use `YYYY-MM-DD`.
- Successful responses return the resource directly rather than a generic `{ success, data }` envelope.
- Empty successful responses use `204 No Content` when appropriate.
- Errors use RFC 9457-style Problem Details with stable `code` and `traceId` fields.
- Request validation errors use HTTP 400 consistently.
- The authenticated user comes from the session; user-owned commands must not accept a client-supplied `userId` as authority.
- Access to a non-owned resource returns 404 so its existence is not disclosed.
- OTP request returns `202 Accepted` with backend-owned resend timing and without account-existence disclosure.
- OTP verification writes the cookie and returns the current User; it does not return the JWT, `isNewUser`, or a frontend route.
- `GET /api/v1/users/me` is the canonical current-user endpoint; `/auth/me` is not introduced.
- Frontend routing after authentication is derived from persisted user/onboarding state, not a backend-provided route name.

Discussion 020B and later contracts own all AI Planning, Reconcile, confirmation, command, concurrency, and idempotency APIs. Where an old API rule conflicts with them, the newer rule wins.

---

# 6. Retained Development and Pilot Operations

The following decisions from Discussion 008 remain useful and do not overlap the new product model.

## 6.1 Development test session

- A test-session endpoint may exist only in local and automated-test environments.
- It creates or loads a fixed test User and issues the same valid JWT cookie used by the real application.
- It must be unavailable in production, preferably returning 404.
- An automated production-profile test must prove that it is unavailable.
- It is an implementation aid, not an alternative production authentication path.

The retained endpoint name is:

```txt
POST /api/v1/dev/test-session
```

## 6.2 Semantic event rule for creation

Initial state supplied by a successful create command belongs to the entity's creation event. The same command must not also emit a separate change event that describes the same initial state and would double-count one user action.

Later changes emit their appropriate semantic change events. The current event taxonomy and atomicity rules remain owned by Discussion 019C and related final resolutions.

## 6.3 Operational revocation

Forced session revocation must use the supported `sessionEpoch` operation or endpoint. Operators must not perform ad hoc database edits that bypass application invariants or auditability.

## 6.4 Health monitoring

- The production health endpoint must be checked by an external uptime monitor.
- Alerts must reach an actively observed team channel.
- A health endpoint existing without external checks is not considered monitoring.

## 6.5 Pilot authentication gate

Before pilot release, production configuration must verify:

- OTP request rate limits
- resend cooldown
- maximum verification attempts
- expiration and single-use behavior
- SMS-provider timeout and failure handling
- production cookie attributes
- absence of OTP and JWT values from logs

## 6.6 API documentation ownership

- Human-reviewed Markdown contracts are the design authority.
- OpenAPI is generated from the ASP.NET Core implementation and used to detect drift.
- Do not maintain a second hand-written OpenAPI document as an independent source of truth.

---

# 7. Application Rule for Discussion 022 and the Mind Map

Discussion 022 should treat this file as a small compatibility input, not as another product-scope source.

Apply the retained material as follows:

| Retained area | Destination |
|---|---|
| Research evidence hygiene | validation/research governance |
| Technical baseline | implementation foundation |
| Authentication and session contract | auth/security workstream and formal auth spec |
| Global API conventions | shared API contract; new AI APIs remain owned by Discussion 020B |
| Test session, health monitoring, pilot auth gate | implementation and release-readiness milestones |
| Semantic creation-event rule | current event taxonomy/implementation notes |

The mind map should include only high-level nodes that affect project structure or scope. Detailed OTP fields, JWT claims, HTTP response shapes, and test cases belong in specifications and should not be copied into the map.

---

# خلاصهٔ فارسی

از بحث‌های قدیمی ۰۰۱ تا ۰۰۸، مدل محصول، جریان قدیمی برنامه‌ریزی و Reconcile، مدل Goal/Task، `carryCount` ذخیره‌شده، توالی اجرای قبلی و تصمیم «عدم نیاز به concurrency/idempotency» حفظ نشده‌اند؛ این موارد با بحث‌های ۰۱۰ تا ۰۲۱ جایگزین شده‌اند. بحث‌های ۰۰۳ و ۰۰۵ هیچ تصمیم منحصربه‌فرد و لازمی برای نگهداری ندارند.

مواردی که واقعاً باید باقی بمانند عبارت‌اند از:

- رعایت منشأ و اعتبار شواهد پژوهشی و تلقی نکردن تجربه‌های شبکه‌های اجتماعی به‌عنوان اثبات علمی؛
- خط پایهٔ فنی React/TypeScript/Vite، C#/.NET 10/ASP.NET Core، Entity Framework Core/PostgreSQL، REST نسخه‌بندی‌شده و استقرار Docker/Nginx؛
- قرارداد کامل احراز هویت با OTP پیامکی، شمارهٔ نرمال‌شدهٔ ایرانی، نگهداری امن OTP، نشست JWT در cookie امن و ابطال نشست‌ها با `sessionEpoch`؛
- قواعد عمومی API مانند `/api/v1`، JSON با camelCase، Problem Details، خطای ۴۰۰ برای validation، پاسخ ۴۰۴ برای منابع متعلق به دیگران و endpoint استاندارد `/users/me`؛
- endpoint مخصوص test session فقط برای محیط local/test، پایش بیرونی health endpoint، کنترل تنظیمات امنیتی OTP پیش از پایلوت و جلوگیری از ثبت دو event برای یک وضعیت اولیه؛
- Markdown به‌عنوان مرجع قراردادی قابل بازبینی و OpenAPI تولیدشده از پیاده‌سازی برای تشخیص اختلاف.

این فایل تنها خروجی معتبر از بحث‌های ۰۰۱ تا ۰۰۸ است. نبودن یک تصمیم قدیمی در بحث‌های جدید به‌تنهایی دلیل حفظ آن نیست؛ هر چیزی از ۰۰۱ تا ۰۰۸ که در این فایل نیامده، منسوخ یا نیازمند تصمیم‌گیری دوباره است و نباید مستقیماً وارد نقشه یا پیاده‌سازی شود.
