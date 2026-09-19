# Adaptive Planner — Implementation Flow and Study Guide

## وضعیت

`AUTHORITATIVE IMPLEMENTATION SEQUENCE — SUBJECT TO EXISTING CONTRACT LOCKS`

این سند ترتیب پیشنهادی و جامع اجرای MVP را از شروع repository scaffold تا آمادگی Pilot تعریف می‌کند. هدف آن تبدیل milestoneهای M1 تا M9 به یک مسیر feature-by-feature است که برای Product، Frontend، Backend، Design، Test، Safety و Pilot Research قابل‌استفاده باشد.

این سند رفتار محصول را دوباره تعریف نمی‌کند. در صورت تعارض، ترتیب authority زیر برقرار است:

1. Discussionهای بسته‌شده‌ی 010 تا 021 و مرزهای authority داخل آن‌ها؛
2. [[04-Specs/ai-native-mvp-baseline]]؛
3. [[05-Implementation/milestone-exit-gate-plan]]؛
4. قراردادها و artifactهای implementation؛
5. این سند برای ترتیب اجرا و مطالعه.

---

# 1. اصل حاکم اجرای پروژه

Adaptive Planner نباید به‌صورت لایه‌ای و جدا از تجربه‌ی واقعی کاربر ساخته شود.

مدل نامناسب:

```txt
همه Entityها
→ همه Repositoryها
→ همه APIها
→ همه صفحه‌ها
→ در انتها integration
```

مدل پذیرفته‌شده:

```txt
foundation مشترک
→ کوچک‌ترین vertical slice قابل‌استفاده
→ lifecycle کامل همان slice
→ event، concurrency، failure و accessibility همان slice
→ سپس feature بعدی
```

هر feature زمانی تمام است که فقط UI یا endpoint آن ساخته نشده باشد، بلکه موارد زیر نیز تکمیل شده باشند:

```txt
accepted behavior trace
→ UX states
→ API contract
→ domain invariants
→ persistence and migration
→ authorization and ownership
→ transaction/concurrency/idempotency
→ events and observability
→ failure/manual escape
→ automated tests
→ exit evidence
```

---

# 2. ترتیب کلان featureها

ترتیب نهایی اجرای MVP:

```txt
0. Repository and delivery foundation
1. Authentication, session and ownership
2. Canonical domain and persistence foundation
3. Manual Task → Today → Complete
4. Full Task lifecycle and manual planning
5. Routine and RoutineOccurrence execution
6. PlanningAttempt and PlanningDraft with mock provider
7. Confirmation, warnings and deterministic plan application
8. Domain safety and real AI Planning runtime
9. Deterministic Reconcile
10. AI-assisted Reconcile
11. Evidence, privacy and operational readiness
12. Pilot readiness and controlled rollout
```

نکته‌ی مهم:

- Authentication اولین feature زیرساختی است.
- اولین feature محصولی واقعی Task → Today → Complete است.
- Goal و Project قبل از AI Planning باید قابل ایجاد و مدیریت دستی باشند، اما نباید توسعه‌ی Task/Today را بی‌دلیل عقب بیندازند.
- Routine پیش از Reconcile ساخته می‌شود، چون Reconcile به occurrenceها و execution history نیاز دارد.
- Planning ابتدا با provider mock ساخته می‌شود و بعد به AI واقعی متصل می‌شود.
- Reconcile ابتدا کاملاً deterministic ساخته می‌شود و AI فقط بعد از تثبیت facts و rules اضافه می‌شود.

---

# 3. Stage 0 — Repository, Architecture and Local Delivery Foundation

## هدف

ایجاد محیطی که Backend، Frontend، PostgreSQL، migration، test و CI در آن قابل اجرا باشند؛ بدون ساخت رفتار محصولی جعلی.

## خروجی‌های اصلی

```txt
app/frontend
app/backend
infra/docker
infra/nginx
.github/workflows
```

### Backend

- ASP.NET Core scaffold
- .NET SDK version و NuGet dependency versions نهایی
- package boundary اولیه
- profileهای local، test و production
- PostgreSQL connection
- EF Core migrations with Npgsql
- Testcontainers for .NET
- health/readiness endpoints
- structured logging و correlation ID
- Problem Details error envelope پایه

### Frontend

- React + TypeScript scaffold
- router
- query/client layer
- error boundary
- runtime configuration
- RTL و localization foundation
- design tokens
- accessibility linting
- typed API boundary

### Infrastructure

- Docker Compose محلی
- PostgreSQL service
- environment template بدون secret
- CI برای build، test و migration validation
- branch protection و review policy

## فعلاً نسازید

- AI provider integration
- generic workflow engine
- event bus خارجی
- microservice decomposition
- background scheduler پیچیده
- design system عظیم

## اسناد لازم برای مطالعه

### همه‌ی تیم

1. [[01-Closed-Discussions/022-updated-mvp-implementation-plan]]
2. [[04-Specs/ai-native-mvp-baseline]]
3. [[05-Implementation/milestone-exit-gate-plan]]
4. [[05-Implementation/m1-entry-package]]
5. [[05-Implementation/m1-configuration-register]]
6. [[05-Implementation/contract-freeze-register]]

### Backend

1. [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]]
2. [[01-Closed-Discussions/019c-events-ai-observability-and-retention]]
3. [[05-Implementation/backend-domain-package/README]]

### Frontend

1. [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]]
2. بخش Trust Representation در [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]]

## تست خروج

- Backend و Frontend در CI build شوند.
- migration خالی روی PostgreSQL واقعی اجرا شود.
- Testcontainers for .NET در CI کار کند.
- Frontend بتواند health endpoint را بخواند.
- correlation ID از request تا log قابل ردیابی باشد.
- production secret داخل repository نباشد.

## شرط عبور

تا وقتی scaffold، migration ownership، CI و محیط محلی پایدار نشده‌اند، feature Authentication شروع production-grade محسوب نمی‌شود.

---

# 4. Stage 1 — Authentication, Session and Ownership

## چرا اول Authentication؟

تمام entityها، attemptها، confirmationها، eventها و metricها به ownership معتبر نیاز دارند. اضافه‌کردن authentication در انتهای پروژه باعث بازنویسی تمام queryها، cache keyها، eventها و APIها می‌شود؛ نوعی صرفه‌جویی زمانی که معمولاً زمان را دو برابر مصرف می‌کند.

## Scope

- OTP با شماره موبایل
- Kavenegar integration
- access token و refresh/session contract
- secure HttpOnly cookies
- logout و session revocation
- current-user endpoint
- ownership scoping در تمام repositoryها
- access-control error behavior
- rate limit OTP
- audit مربوط به login/session بدون ذخیره‌ی OTP خام

## ترتیب داخلی

```txt
1. user/session schema
2. OTP request
3. OTP verification
4. session creation
5. current user
6. refresh/revocation
7. frontend auth state machine
8. protected route and ownership test
```

## Backend Deliverables

- User identity table مطابق auth contract
- OTP challenge table با TTL و attempt count
- session/refresh token table
- hashing مناسب OTP/token
- Kavenegar adapter پشت port
- Auth application service
- ownership-aware repository base convention
- integration test با provider fake

## Frontend Deliverables

Stateها:

```txt
anonymous
requesting OTP
OTP requested
verifying OTP
authenticated
refreshing
session expired
provider unavailable
rate limited
```

- login screen
- OTP resend countdown
- validation و accessible error message
- route protection
- logout
- session-expired recovery بدون پاک‌کردن بی‌دلیل draft محلی کاربر

## اسناد لازم برای مطالعه

1. [[01-Closed-Discussions/001-008-legacy-surviving-decisions]]، فقط بخش Authentication باقی‌مانده
2. [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]]
3. [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]]، بخش privacy و secret handling
4. [[05-Implementation/m1-entry-package]]
5. [[05-Implementation/contract-freeze-register]]، ردیف auth/session/ownership

## تست‌های اجباری

- OTP صحیح، اشتباه، منقضی و replay
- rate limiting
- session revocation
- refresh race
- cookie attributes در production profile
- عدم مشاهده‌ی resource کاربر دیگر
- `404 within user scope` در محل مناسب به‌جای leakage
- provider failure و retry UX

## Exit Gate

```txt
auth/session/ownership contract = SLICE_LOCKED
```

هیچ feature canonical نباید بدون تست cross-user isolation وارد branch اصلی شود.

---

# 5. Stage 2 — Canonical Domain and Persistence Foundation

## هدف

قفل‌کردن هویت، فیلدها، lifecycle، version و database invariantهای پنج entity اصلی.

## Entityها

```txt
Goal
Project
Task
Routine
RoutineOccurrence
```

Plan entity ساخته نمی‌شود.

## ترتیب اجرا

```txt
1. IDs, timestamps, source and version
2. Goal table/entity
3. Project table/entity
4. Task table/entity
5. Routine table/entity
6. RoutineOccurrence table/entity
7. database constraints
8. repositories and query contracts
9. optimistic concurrency tests
```

## نکته‌ی معماری

در EF Core رابطه‌ها با ID نگه داشته شوند و cascade graph گسترده ساخته نشود. Cross-aggregate operation در Application Service و transaction صریح انجام شود.

## اسناد لازم برای مطالعه

1. [[01-Closed-Discussions/012-core-product-model]]
2. [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]
3. [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]]
4. [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]]
5. [[05-Implementation/backend-domain-package/README]]
6. [[05-Implementation/backend-domain-package/V1__canonical_domain.sql]]
7. [[05-Implementation/backend-domain-package/dotnet-ef-core-reference]]
8. [[05-Implementation/backend-domain-package/database-invariant-test-cases]]

## Deliverables

- EF Core migration واقعی داخل backend با Npgsql
- EF Core Fluent API mapping و snapshot/schema drift validation
- repository port و adapter
- current-user scoped query convention
- EF Core concurrency-token conflict mapping
- database integration tests
- ERD نهایی reviewed

## Exit Gate

- migration روی PostgreSQL خالی و upgrade path تست شود.
- تمام constraint testها پاس شوند.
- cross-user FK fail شود.
- duplicate daily occurrence fail شود.
- stale update به conflict مشخص تبدیل شود.

---

# 6. Stage 3 — First Product Slice: Manual Task → Today → Complete

## چرا این feature اول است؟

این کوچک‌ترین vertical slice است که بخشی واقعی از promise محصول را نشان می‌دهد:

```txt
create work
→ see it Today
→ complete it
→ preserve history
```

Goal، AI و Reconcile بدون execution loop ارزش عملی ندارند.

## Scope محدود

- ساخت دستی Task مستقل
- title
- plannedDate امروز یا تاریخ آینده
- placement `SCHEDULED`
- Today derived query
- Complete Task
- Task detail/history حداقلی

در اولین iteration هنوز لازم نیست:

- Carry
- Drop/Restore
- Goal/Project parent
- Bulk action
- AI

## Backend

- CreateTask command
- GetToday query
- CompleteTask command
- expected version
- idempotency key برای command consequential
- semantic eventها:
  - `TASK_CREATED`
  - `TASK_COMPLETED`
- CommandResult
- transaction و outbox foundation

## Frontend

- Today empty/loading/error/content
- Task create form
- optimistic-looking UI بدون optimistic canonical claim
- complete submission state
- command conflict state
- refresh authoritative state

## اسناد لازم برای مطالعه

1. [[01-Closed-Discussions/015-task-and-routine-execution-model]]
2. [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]
3. [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]]
4. [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]]
5. [[01-Closed-Discussions/019c-events-ai-observability-and-retention]]
6. [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]]

## E2E اصلی

```txt
login
→ create scheduled Task for today
→ open Today
→ Task visible
→ complete
→ CommandResult succeeded
→ Task disappears from active Today
→ history and event remain
```

## Exit Gate

M2 زمانی تمام است که این flow روی PostgreSQL واقعی، browser و event evidence کامل پاس شود.

---

# 7. Stage 4 — Complete Manual Task Lifecycle and Goal/Project Structure

این Stage manual planning foundation را کامل می‌کند تا محصول بدون AI قابل‌استفاده باشد.

## ترتیب featureها

### 4.1 Task placement

- Schedule
- Replan
- explicit Backlog
- reviewDate
- deadline مستقل

### 4.2 Task lifecycle

- Drop
- Restore با checkpoint جدید
- Carry به تاریخ صریح
- historical correction
- protection flag/reason

### 4.3 Goal

- create/edit Goal
- desiredOutcome
- targetDate
- reviewDate و provenance
- achieve/abandon با confirmation

### 4.4 Project

- create Project مستقل یا Goal-owned
- add Task به Project
- completionMeaning
- target/review checkpoint
- complete/stop staged flow

### 4.5 Ownership changes

- attach/detach/reparent فقط با preview و confirmation مناسب
- جلوگیری از Goal و Project هم‌زمان برای Task

## پیشنهاد ترتیب Sprintها

```txt
Sprint A: Backlog + Replan + Deadline
Sprint B: Drop + Restore + Carry + Correction
Sprint C: Goal CRUD and lifecycle
Sprint D: Project CRUD, ownership and terminal staging
```

## اسناد لازم برای مطالعه

1. [[01-Closed-Discussions/012-core-product-model]]
2. [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]
3. [[01-Closed-Discussions/015-task-and-routine-execution-model]]
4. [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]
5. [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]]
6. [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]]
7. [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]]

## تست خروج

- terminal Task با plannedDate قدیمی وارد Today/overdue نشود.
- Restore همان identity را حفظ کند.
- Carry status جدید نسازد.
- Backlog plannedDate نداشته باشد و reviewDate داشته باشد.
- terminal Project بدون child resolution commit نشود.
- خالی‌شدن Project به‌طور خودکار status آن را تغییر ندهد.

---

# 8. Stage 5 — Routine and RoutineOccurrence

## ترتیب featureها

```txt
1. Routine create/edit
2. recurrence schema v1
3. timezone and effective date
4. deterministic occurrence materialization
5. Today occurrence projection
6. Done/Missed
7. correction
8. Stop Routine
9. continuation Routine
10. Project terminal cascade for owned Routines
```

## Recurrence V1

Recurrence schema باید کوچک و versioned باشد. حداقل شکل‌های لازم Pilot را انتخاب کنید، مثلاً:

- روزهای مشخص هفته
- هر روز
- زمان نمایشی اختیاری در آینده، بدون تبدیل occurrence identity به slot

MVP همچنان حداکثر یک occurrence برای هر Routine در هر local date دارد.

## Backend concerns

- `ZoneId` validation
- local-date boundaries
- unique `(routineId, scheduledLocalDate)`
- idempotent get-or-create occurrence
- DST tests
- exposed occurrence policy
- Stop transaction
- continuation no-cycle validation

## Frontend

- recurrence editor محدود و قابل‌فهم
- first effective date
- Today occurrence card
- Done/Missed correction
- Stop consequence preview
- continuation flow به‌عنوان creation جدید، نه toggle status

## اسناد لازم برای مطالعه

1. [[01-Closed-Discussions/015-task-and-routine-execution-model]]
2. [[01-Closed-Discussions/015b-routine-local-date-and-daily-occurrence-amendment]]
3. [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]]
4. [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]]
5. [[01-Closed-Discussions/019c-events-ai-observability-and-retention]]

## Exit Gate

- timezone، DST، uniqueness و correction tests پاس شوند.
- Stop باعث MISSED شدن future occurrence نشود.
- continuation identity جدید بسازد.
- twice-daily behavior با دو Routine قابل نمایش باشد.

---

# 9. Stage 6 — PlanningAttempt and PlanningDraft with Mock Provider

## دلیل mock-first

پیش از هزینه، timeout و unpredictability مدل واقعی، باید lifecycle API و UX را با fixtureهای deterministic کامل کنیم.

## ترتیب featureها

```txt
1. PlanningAttempt resource
2. mandatory clientAttemptId
3. polling
4. mock successful output
5. PlanningDraft persistence
6. immutable revisions
7. edit draft
8. invalid/partial fixtures
9. cancellation
10. expiry and reconnect
```

## PlanningDraft باید شامل چه چیزی باشد؟

- proposed Goal/Project/Task/Routine structure
- temporary IDs
- parent references
- dates با provenance
- warnings
- assumptions/defaults
- no canonical mutation

## Mock fixture set

حداقل:

- valid simple plan
- valid Goal + Project + Tasks
- valid Routine plan
- missing temporary parent
- duplicate temporary ID
- cyclic graph
- invalid date
- partial output
- cancelled late result

## Frontend states

```txt
input
submitting attempt
queued
running
reviewable draft
editing revision
attempt failed
cancelled
expired
```

## اسناد لازم برای مطالعه

1. [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]]
2. [[01-Closed-Discussions/014-ai-planning-output-contract]]
3. [[01-Closed-Discussions/014a-temporal-checkpoint-planning-draft-amendment]]
4. [[01-Closed-Discussions/019c-events-ai-observability-and-retention]]
5. [[01-Closed-Discussions/020a-ai-runtime-boundaries-and-orchestration]]
6. [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]]
7. [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]]

## Exit Gate

بدون provider واقعی، تمام lifecycleهای attempt/draft/revision/cancel/reconnect باید قابل اثبات باشند و هیچ fixture نامعتبر reviewable نشود.

---

# 10. Stage 7 — Preview, Warning, Confirmation and Deterministic Plan Application

## هدف

تبدیل draft معتبر به creation commandهای canonical، بدون یکی‌کردن acceptance و application.

## ترتیب featureها

```txt
1. generate ActionConfirmation from exact draft revision
2. consequence preview
3. versioned warning identities
4. warning acknowledgement
5. submit confirmation with idempotency key
6. transactional canonical creation
7. CommandResult
8. lost-response recovery
9. stale confirmation refresh
```

## Backend

- draft revision immutable
- confirmation bound به revision، selected itemها و preview hash
- canonical reference revalidation
- all-or-nothing creation برای selected set پذیرفته‌شده
- event chain:
  - draft decision
  - confirmation
  - command result
  - entity creation

## Frontend

این stateها جدا بمانند:

```txt
reviewable
confirmation created
awaiting acknowledgement
submitting
succeeded
conflicted
failed
```

از state مبهم `confirmed = true` استفاده نشود.

## اسناد لازم برای مطالعه

1. [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]]
2. [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]]
3. [[01-Closed-Discussions/019c-events-ai-observability-and-retention]]
4. [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]]

## Exit Gate

- confirmation قدیمی commit نشود.
- warning hash تغییرکرده acknowledgement جدید بخواهد.
- lost idempotency key با GET confirmation بازیابی شود.
- Accepted بدون CommandResult موفق، Applied نمایش داده نشود.

---

# 11. Stage 8 — Domain Safety and Real AI Planning Runtime

این مرحله M5 را تشکیل می‌دهد و تنها بعد از کامل‌شدن mock flow شروع می‌شود.

## ترتیب اجرا

```txt
1. DomainSafetyClassificationPort
2. closed classifier vocabulary
3. fail-closed routing
4. PlanningContextBuilder
5. Context Scope Manifest
6. Prompt Renderer
7. PlanningGenerationPort adapter
8. pinned runtime artifact registry
9. structured-output validation pipeline
10. retry/timeout/circuit/rate/budget controls
11. kill switches
12. provider-side hard spend cap
```

## Architecture rule

AI adapter و prompt renderer نباید به repository، command handler، transaction manager یا tool callback دسترسی داشته باشند.

## Safety قبل از generation

```txt
request
→ minimum classification context
→ closed classification
→ deterministic routing
→ Planning generation only when eligible
```

## Structured validation gates

- transport completion
- parse
- schema
- deterministic repair allowlist
- semantic
- temporal
- canonical references
- temporary graph
- policy
- context/budget integrity

## اسناد لازم برای مطالعه

1. [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]]
2. [[01-Closed-Discussions/020a-ai-runtime-boundaries-and-orchestration]]
3. [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]]
4. [[01-Closed-Discussions/021-validation-plan-and-decision-gates]]، بخش Crisis Safety
5. [[01-Closed-Discussions/019c-events-ai-observability-and-retention]]

## تست خروج

- tool calling registration build را fail کند.
- partial output draft نسازد.
- cycle output رد شود.
- hidden retry وجود نداشته باشد.
- حداکثر دو invocation فیزیکی.
- cancel نتیجه‌ی دیررس را discard کند.
- spend cap provider invocation را hard-block کند.
- classifier failure هیچ PlanningDraftی نسازد.

---

# 12. Stage 9 — Deterministic Reconcile

AI در این مرحله هنوز وارد تصمیم facts و rules نمی‌شود.

## ترتیب featureها

```txt
1. Reconcile eligibility
2. canonical cleanup/deduplication
3. immutable pre-session severity
4. execution lane
5. commitment-review lane
6. deterministic rule catalog R1–R7
7. ownership grouping
8. protected-item filtering
9. consequence calculation
10. quick actions
11. ActionConfirmation integration
12. prompt suppression
13. permanent Today access
```

## Rule families

- repeated Carry
- old execution-unresolved Task
- deadline risk
- Routine mismatch candidate
- Project overload candidate
- structural lifecycle conflict
- review checkpoint resolution

## Frontend

- facts loading
- facts ready
- grouped review
- quick action
- confirmation
- accepted-but-conflicted
- Reconcile unavailable
- Today link همیشه در دسترس

## اسناد لازم برای مطالعه

1. [[01-Closed-Discussions/016-reconcile-trigger-and-severity]]
2. [[01-Closed-Discussions/016a-review-checkpoint-trigger-and-presentation-amendment]]
3. [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]]
4. [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]]
5. [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]]
6. [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]]

## Exit Gate

- severity deterministic و immutable باشد.
- review due severity execution را بالا نبرد.
- protected item bulk Drop نگیرد.
- یک item با چند reason یک‌بار نمایش داده شود.
- bulk all-or-nothing باشد.
- deterministic engine failure با AI summary جایگزین نشود.

---

# 13. Stage 10 — AI-Assisted Reconcile

## اصل

```txt
rules decide what may be recommended
AI explains why the rule matched
user decides what happens
```

## ترتیب featureها

```txt
1. ReconcileExplanationPort
2. structured facts-only context
3. bounded explanation schema
4. recommendation wording over allowed actions
5. explanation attachment to current session
6. cancellation and late-result discard
7. facts-only degraded mode
8. manual escape measurement
```

## AI نباید دریافت کند

- note
- description
- imported message
- free user narrative
- raw account history

## AI نباید تعیین کند

- severity
- eligibility
- permission
- protection
- allowed action
- consequence

## اسناد لازم برای مطالعه

1. [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]]
2. [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]]
3. [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]]
4. [[01-Closed-Discussions/020a-ai-runtime-boundaries-and-orchestration]]
5. [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]]
6. [[01-Closed-Discussions/021-validation-plan-and-decision-gates]]، بخش H2

## Exit Gate

- FACT/RULE_MATCH بدون AI قابل استفاده باشند.
- AI failure session را خراب نکند.
- free text در context manifest صفر باشد.
- unsupported recommendation rate صفر باشد.
- manual escape flow تست شود.

---

# 14. Stage 11 — Evidence, Privacy and Operational Readiness

این مرحله نباید تا انتهای پروژه به تعویق بیفتد؛ instrumentation از M1 شروع می‌شود، اما در این مرحله کامل و قابل بازتولید می‌شود.

## Scope

### Metrics

- H1 funnel
- H2 funnel
- accepted vs applied
- edited vs unchanged
- severity segmentation
- regret classification
- trust quiz/behavior mismatch
- Manual Escape Success

### Privacy

- retention classes
- raw AI content TTL
- restricted crisis data
- access roles
- deletion workflow
- analytics restrictions

### Operations

- dashboards
- alerting
- incident response
- rollback
- provider outage
- spend-cap runbook
- kill-switch drills
- support process

## اسناد لازم برای مطالعه

1. [[01-Closed-Discussions/019c-events-ai-observability-and-retention]]
2. [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]]
3. [[01-Closed-Discussions/021-validation-plan-and-decision-gates]]
4. [[05-Implementation/milestone-exit-gate-plan]]
5. [[05-Implementation/contract-freeze-register]]

## Exit Gate

هر denominator باید از eventهای پذیرفته‌شده قابل بازتولید باشد. هیچ درصد موفقیتی بدون population، exclusions و missing-data rule قابل انتشار نیست.

---

# 15. Stage 12 — Pilot Readiness

## این مرحله feature development عادی نیست

در M9 قابلیت جدید اضافه نمی‌شود، مگر برای رفع gate failure. هدف اثبات آمادگی cohort محدود است.

## الزامات

- signed analysis plan
- threshold lock
- participant criteria
- consent
- locale support
- crisis resources واقعی
- adversarial corpus
- Product + Safety + Engineering sign-off
- production profile security
- monitoring و support coverage
- rollback rehearsal
- hard spend cap verification

## Crisis Hard Gate

برای corpus تأییدشده:

```txt
PlanningDraft creation = 0
Reconcile AI explanation = 0
ActionConfirmation = 0
canonical mutation = 0
```

هر leakage کل Pilot را block می‌کند.

## اسناد لازم برای مطالعه

1. [[01-Closed-Discussions/021-validation-plan-and-decision-gates]]
2. [[04-Specs/ai-native-mvp-baseline]]
3. readiness artifacts تولیدشده در M8
4. [[05-Implementation/milestone-exit-gate-plan]]

---

# 16. Dependency Graph خلاصه

```txt
Foundation
  ↓
Authentication + Ownership
  ↓
Canonical Domain + Migration
  ↓
Task → Today → Complete
  ├──→ Full Task + Goal + Project
  ├──→ Routine + Occurrence
  └──→ Planning API contracts with mock
              ↓
      Confirmation + Application
              ↓
       Real AI Planning + Safety

Task + Routine history
  ↓
Deterministic Reconcile
  ↓
AI Reconcile
  ↓
Evidence + Operations
  ↓
Pilot Readiness
```

## Parallel work مجاز

- Design می‌تواند یک Stage جلوتر UX stateها را طراحی کند.
- Frontend می‌تواند پس از schema lock با fixture کار کند.
- Backend می‌تواند adapter را پشت port پیاده کند.
- Research می‌تواند metric query را طراحی کند، ولی collection قبل از event lock شروع نمی‌شود.

## Parallel work ممنوع

- ساخت AI Planning پیش از Draft/Confirmation mock flow
- ساخت AI Reconcile پیش از deterministic rules
- ساخت dashboard قبل از metric/event mapping
- شروع Pilot قبل از crisis gate
- ساخت feature با resource/event نام متفاوت از contract مشترک

---

# 17. ترتیب مطالعه برای هر نقش

## Product Owner

1. 012 و 012A
2. 013 و 014/014A
3. 015/015A/015B
4. 016/016A و 017
5. 018/018A
6. 021
7. MVP baseline و milestone plan

## Backend

1. 019A
2. backend-domain-package
3. 019B
4. 019C
5. 020B
6. 020A
7. 020C
8. feature discussion مربوط به Stage جاری

## Frontend

1. 020B
2. 018 Trust/Confirmation
3. 015 execution states
4. 013/014 Planning states
5. 016/017 Reconcile states
6. 018A failure/manual escape

## Designer

1. Product Vision و MVP baseline
2. 013 Planning conversation
3. 014 Draft presentation
4. 015 Today and execution
5. 016/017 Reconcile grouping/actions
6. 018 trust classes
7. 020B frontend states
8. 021 observed comprehension

## QA/Test

1. 019B concurrency/idempotency
2. 020B API state contracts
3. 020C validation/reliability
4. 018A hostile input/failure
5. 021 hard gates
6. database invariant test cases

## Safety/Privacy

1. 018A
2. 019C
3. 020A classification boundary
4. 020C kill switches/context/cost
5. 021 crisis gate

---

# 18. Definition of Ready برای هر feature

یک feature قبل از شروع implementation باید این موارد را داشته باشد:

- authority discussion مشخص
- contract owner مشخص
- user flow و failure states
- API/resource shape
- data/invariant impact
- event requirements
- privacy/safety classification
- test examples
- dependencyهای locked

اگر یکی از این موارد وجود ندارد، تیم نباید آن را با assumption خاموش حل کند. مورد به Contract Register یا amendment بازگردانده می‌شود.

---

# 19. Definition of Done برای هر feature

Feature زمانی Done است که:

- happy path و failure path هر دو اجرا شوند؛
- frontend success را فقط از CommandResult بگیرد؛
- cross-user access تست شده باشد؛
- expected version و stale behavior تست شده باشد؛
- idempotency و lost response پوشش داده شود؛
- semantic event و outbox intent ثبت شود؛
- metric consumer مشخص باشد؛
- accessibility stateها تست شوند؛
- manual escape در feature AI موجود باشد؛
- rollback/migration consequence مستند باشد؛
- reviewer مسئول evidence را تأیید کند.

---

# 20. اولین Backlog پیشنهادی برای شروع

## Epic 0 — Scaffold

- backend ASP.NET Core on .NET 10
- frontend React
- PostgreSQL/EF Core migrations/Testcontainers for .NET
- Docker Compose
- CI
- error/correlation foundation

## Epic 1 — Authentication

- OTP request/verify
- session cookies
- current user
- logout/revoke
- protected frontend routes
- ownership integration test

## Epic 2 — Canonical Schema

- migrate canonical tables
- EF Core mappings
- repository adapters
- invariant tests
- version conflict mapping

## Epic 3 — First Vertical Slice

- create Task
- Today query
- Complete Task
- CommandResult
- events/outbox
- E2E test

بعد از عبور Epic 3، تیم برای اولین بار یک product slice واقعی دارد و می‌تواند با اطمینان به lifecycle کامل Task برود.

---

# 21. تصمیم نهایی ترتیب

```txt
Start with Authentication,
but do not build Authentication alone.

Build it together with ownership,
error contracts,
migration discipline,
versioning,
and test infrastructure.

Then implement Task → Today → Complete
as the first complete product slice.

Complete manual execution before AI.
Build Planning with mocks before a real model.
Build deterministic Reconcile before AI Reconcile.
Treat events, safety, privacy and validation
as requirements from the first slice,
not launch-week cleanup.
```
