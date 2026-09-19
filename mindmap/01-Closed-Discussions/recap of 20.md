# مرور Discussion 020A، 020B و 020C

## Runtime AI، قرارداد API و Frontend State، اعتبارسنجی خروجی و کنترل هزینه

خانواده‌ی 020 آخرین حلقه‌ی معماری پیش از Validation است.

تا اینجا مشخص شده بود:

- مدل محصول چیست
    
- چه چیزهایی canonical هستند
    
- AI چه اختیاری دارد
    
- mutation چگونه transactional انجام می‌شود
    
- event و audit چگونه ثبت می‌شوند
    

اما هنوز معلوم نبود:

```txt
AI runtime دقیقاً کجا قرار می‌گیرد؟
چه contextی می‌گیرد؟
آیا می‌تواند tool یا repository صدا بزند؟
API چه resourceهایی ارائه می‌دهد؟
frontend چه stateهایی را باید از هم جدا کند؟
خروجی model چگونه معتبر شناخته می‌شود؟
retry، timeout، fallback و cost چگونه کنترل می‌شوند؟
```

تقسیم مسئولیت نهایی:

```txt
020A
→ runtime layering and orchestration

020B
→ API resources and frontend state contracts

020C
→ validation, reliability, retry, budget and cost controls
```

---

# بخش اول: Discussion 020A

## AI Runtime Boundaries and Orchestration

# ۱. مرز اصلی runtime

تفکیک نهایی:

```txt
AI runtime
→ classification
→ proposal
→ explanation

Deterministic application/domain runtime
→ authorization
→ validation
→ confirmation
→ canonical mutation
```

AI runtime نباید مستقیماً:

- entity canonical تغییر دهد
    
- repository صدا بزند
    
- command handler اجرا کند
    
- confirmation را دور بزند
    
- idempotency key انتخاب کند
    
- policy یا lifecycle را override کند
    

اصل:

```txt
Model output
≠ command
≠ permission
≠ transaction authority
```

این boundary باید معماری واقعی باشد، نه فقط جمله‌ای در مستندات که بعداً یک developer خلاق با `toolCallingEnabled(true)` دورش بزند.

---

# ۲. جهت dependency

لایه‌بندی:

```txt
Domain
← Application use cases and ports
← AI orchestration services
← .NET provider SDK adapters
```

Domain و Application نباید به این‌ها وابسته شوند:

- .NET AI integration library typeها
    
- provider SDK
    
- prompt object
    
- tool-calling API
    
- response type اختصاصی provider
    

هر .NET AI integration library فقط integration adapter است، نه بخشی از زبان domain.

## دلیل

اگر domain به provider وابسته شود:

```txt
GoalService
→ OpenAIChatResponse
```

بعد تغییر provider یا حتی schema output، domain را آلوده می‌کند.

مدل درست:

```txt
Goal planning use case
→ PlanningGenerationPort
→ provider adapter
```

---

# ۳. سه Port صریح AI

## `PlanningGenerationPort`

```txt
generate(PlanningGenerationRequest)
→ PlanningGenerationResult
```

وظایف:

- proposal کامل و structured بسازد
    
- canonical state را تغییر ندهد
    
- partial subset قابل‌تأیید ندهد
    

## `ReconcileExplanationPort`

```txt
explain(ReconcileExplanationRequest)
→ ReconcileExplanationResult
```

وظایف:

- فقط fact و rule match محاسبه‌شده را توضیح دهد
    
- structured fact بگیرد
    
- eligibility یا permission محاسبه نکند
    

## `DomainSafetyClassificationPort`

```txt
classify(DomainSafetyClassificationRequest)
→ ClassificationResult
```

این port فقط classification بسته تولید می‌کند.

Vocabulary:

```txt
NORMAL
HIGH_RISK_ORGANIZATION
MEDICAL
MENTAL_HEALTH_CLINICAL
LEGAL
HIGH_STAKES_FINANCIAL
CRISIS_OR_SELF_HARM
VIOLENCE_OR_ABUSE
REGULATED_OR_ILLEGAL
```

خروجی فقط metadata محدود دارد:

```txt
classification
confidenceBand?
reasonCodes[]
policyVersion
```

نباید advice یا rationale آزاد تولید کند.

## نکته‌ی مهم

Classification فقط route را مشخص می‌کند.

```txt
classification = NORMAL
≠ permission automatically granted
```

بعد از classification، policy deterministic همچنان تصمیم می‌گیرد generation مجاز است یا نه.

---

# ۴. Context Builder مستقل

برای هر capability یک context builder deterministic داریم:

```txt
PlanningContextBuilder
ReconcileContextBuilder
SafetyClassificationContextBuilder
```

Context builder:

- فقط داده‌ی authorized و scoped را load می‌کند
    
- DTO immutable می‌سازد
    
- builder key و version ثبت می‌کند
    
- scope metadata تولید می‌کند
    

Prompt renderer:

- فقط DTO می‌گیرد
    
- repository access ندارد
    
- connector access ندارد
    
- account history load نمی‌کند
    
- context را broaden نمی‌کند
    

pipeline:

```txt
Context Builder
→ immutable scoped DTO
→ Prompt Renderer
→ Provider Adapter
```

## اهمیت

Prompt renderer نباید حین render کردن تصمیم بگیرد:

> شاید چند Task قدیمی دیگر هم بخوانم تا context بهتر شود.

Context policy قبل از prompt بسته شده است. renderer فقط format می‌کند.

---

# ۵. Context policy

## Planning

مجاز:

- درخواست فعلی
    
- constraintهای تأییدشده
    
- local date و timezone
    
- draft جاری هنگام revision
    
- entity summary مرتبط
    
- availability صریح
    
- conflict مرتبط
    

ممنوع:

- کل account history
    
- completed/dropped entityهای نامرتبط
    
- hidden profile
    
- secrets
    
- private content نامرتبط.
    

## Reconcile

```txt
structured facts
rule matches
allowed actions
protection and consequence metadata
```

بدون:

- note
    
- description
    
- imported message
    
- narrative آزاد.
    

اگر fact deterministic وجود ندارد، explanation port اصلاً eligible نیست.

## Safety classification

حداقل محتوای لازم برای classification را می‌گیرد و context گسترده‌ی Planning را به ارث نمی‌برد.

---

# ۶. Context Scope Observability

هر operation ثبت می‌کند:

```txt
contextBuilderKey
contextBuilderVersion
contextScopeManifestId?
```

Manifest فقط category و count ذخیره می‌کند، نه raw context.

نباید تبدیل شود به prompt archive مخفی با نام محترمانه‌ی observability.

---

# ۷. Model Tool Calling در MVP ممنوع

هیچ‌یک از سه AI capability ابزار ثبت‌شده ندارد:

- mutation tool
    
- repository tool
    
- command tool
    
- connector tool
    
- unrestricted read tool
    

Framework-level function/tool calling کاملاً غیرفعال است.

## Enforcement

Architecture test باید fail کند اگر:

- AI adapter به repository وابسته شود
    
- prompt renderer به persistence وابسته شود
    
- tool callback ثبت شود
    
- provider adapter tool-call output به application بدهد
    

این قانون صرفاً convention نیست، build-time constraint است.

---

# ۸. Planning orchestration

flow:

```txt
receive request
→ authorize flow
→ build minimal classification input
→ classify domain/safety
→ deterministic policy routing
→ build Planning DTO
→ create operation identity
→ invoke PlanningGenerationPort
→ parse and validate complete output
→ apply narrow deterministic repair
→ reject partial/invalid output
→ persist PlanningDraft revision
→ show preview
→ later edit/confirm via deterministic API
```

هیچ entity canonical هنگام generation ساخته نمی‌شود.

PlanningDraft فقط پس از validation کامل persisted می‌شود.

---

# ۹. Reconcile orchestration

flow:

```txt
load canonical scoped data
→ deterministic engine computes facts/rules
→ persist or return ReconcileSession
→ optionally invoke explanation port
→ attach explanation if valid and current
```

Authority:

```txt
FACT
RULE_MATCH
```

همیشه deterministic هستند.

```txt
AI_EXPLANATION
```

اختیاری و قابل‌حذف است.

AI تعیین نمی‌کند:

- eligibility
    
- severity
    
- permission
    
- allowed action
    
- protection
    
- consequence
    

---

# ۱۰. اگر deterministic Reconcile خراب شود

رفتار:

```txt
Reconcile unavailable
→ no AI fallback over raw entities
→ no improvised summary
→ Today remains accessible
→ manual execution remains accessible
→ visible failure state
```

یعنی مدل زبانی حق ندارد جای rule engine خراب‌شده بازی کند.

این fallback نیست؛ حذف safety boundary و سپردن سیستم به حدس است.

---

# ۱۱. Streaming policy

## Planning

- خروجی نهایی کامل
    
- بدون token streaming
    
- بدون partial proposal
    
- progress UI فقط stageهای coarse
    
- draft فقط بعد از validation ظاهر می‌شود
    

## Reconcile

factها می‌توانند سریع نمایش داده شوند.

AI explanation ممکن است بعداً attach شود، اگر:

- session هنوز current باشد
    
- attempt cancel نشده باشد
    
- result valid باشد
    
- state جدید conflicting ایجاد نشده باشد.
    

UI نباید factها را منتظر متن AI نگه دارد.

---

# ۱۲. Cancellation و late result

Cancellation مربوط به یک attempt identity خاص است:

```txt
cancelled attempt
→ request provider cancellation
→ mark CANCELLED
→ discard late result
→ no draft revision
→ no explanation attachment
```

نتیجه‌ی دیررس هیچ‌وقت resurrect نمی‌شود.

برای retry یا شروع دوباره باید attempt جدید با context فعلی ساخته شود.

---

# ۱۳. انتخاب provider و model

Application با logical key کار می‌کند:

```txt
planning.standard
reconcile.explanation
safety.classification
```

Runtime registry آن را به این‌ها resolve می‌کند:

- provider
    
- model
    
- prompt version
    
- schema version
    
- policy version
    
- runtime config.
    

## Pilot

- automatic cross-provider fallback ندارد
    
- secondary model fallback خودکار ندارد
    
- failure به retry/manual/degraded می‌رود
    

این باعث می‌شود pilot قابل‌تحلیل باشد. اگر هر failure با provider دیگری پوشانده شود، دیگر معلوم نیست کدام config واقعاً reliable بوده است.

---

# ۱۴. Kill switch و degraded mode

```txt
AI_GLOBAL_KILL_SWITCH
PLANNING_AI_KILL_SWITCH
RECONCILE_AI_TEXT_KILL_SWITCH
PROVIDER_SPECIFIC_KILL_SWITCH
READ_ONLY_DEGRADED_MODE
```

رفتار:

- Planning خاموش → manual Planning
    
- Reconcile explanation خاموش → fact/rule باقی
    
- provider خاموش → substitution مخفی نداریم
    
- global AI خاموش → canonical/manual product باقی
    
- deterministic Reconcile خراب → Reconcile unavailable، نه AI fallback
    

---

# بخش دوم: Discussion 020B

## API Resources and Frontend State Contracts

# ۱۵. اصل حاکم API

Client می‌تواند:

- درخواست کند
    
- review کند
    
- edit کند
    
- acknowledge کند
    
- confirm کند
    
- cancel کند
    
- refresh کند
    
- result نمایش دهد
    

اما authority ندارد برای:

- canonical state
    
- consequence
    
- authorization
    
- entity version
    
- warning meaning
    
- mutation eligibility
    
- command success.
    

flow:

```txt
PlanningAttempt / ReconcileSession
→ server-validated result
→ user review/edit
→ server-generated ActionConfirmation
→ explicit submission
→ command handler
→ CommandResult
```

چهار fact جدا:

```txt
user accepted
draft linked
confirmation submitted
command succeeded
```

نباید در frontend به یک boolean به نام `isConfirmed` تبدیل شوند. چون ظاهراً یک boolean برای توصیف پنج lifecycle همیشه وسوسه‌انگیز است.

---

# ۱۶. resourceهای API

```txt
PlanningAttempt
PlanningDraft
ReconcileSession
ActionConfirmation
CommandResult
```

generic `WorkflowRun` ساخته نمی‌شود.

هر resource lifecycle و authority مستقل دارد.

---

# ۱۷. PlanningAttempt

ساخت attempt نیازمند:

```txt
clientAttemptId
```

است.

چون شروع attempt ممکن است provider پولی را صدا بزند.

Constraint:

```txt
UNIQUE(userId, clientAttemptId)
```

رفتار:

```txt
same ID + same request hash
→ return existing attempt
```

```txt
same ID + different hash
→ idempotency mismatch
```

Reconnect یا double click نباید invocation دوم بسازد.

## lifecycle

```txt
QUEUED
RUNNING
SUCCEEDED
FAILED
CANCELLED
```

Success ممکن است به draft معتبر لینک بدهد.

partial output هیچ state reviewable ایجاد نمی‌کند.

---

# ۱۸. PlanningDraft lifecycle

```txt
REVIEWABLE
SUPERSEDED
EXPIRED
CANCELLED
```

`CONFIRMED` status ممنوع است.

چرا؟

چون draft فقط lifecycle خودش را بیان می‌کند.

داشتن `linkedConfirmationId` فقط یعنی confirmation ساخته شده، نه اینکه:

- submit شده
    
- command اجرا شده
    
- mutation موفق شده
    

## revisionها immutable هستند

Edit:

```txt
revision 3
→ create revision 4
→ revision 3 becomes SUPERSEDED
```

Confirmation فقط به یک revision دقیق متصل است.

---

# ۱۹. ReconcileSession API state

```txt
RUNNING
FACTS_READY
COMPLETE
FAILED
CANCELLED
```

اگر deterministic Reconcile fail شود:

```txt
FAILED
→ no AI fallback
→ Today available
```

اگر factها آماده باشند ولی explanation fail شود:

```txt
FACTS_READY
→ facts usable
→ explanation absent
```

Recommendation acceptance و command result جدا هستند.

---

# ۲۰. ActionConfirmation

این resource یک preview server-generated و version-bound است.

شامل:

- selected IDs
    
- expected versions
    
- command type
    
- proposal/draft identity
    
- consequences
    
- warnings
    
- preview hash
    
- expiry
    
- submission status
    
- CommandResult link.
    

lifecycle:

```txt
CREATED
SUBMITTED
RESOLVED
EXPIRED
CANCELLED
```

`SUBMITTED` به معنی success نیست.

## client فقط چه می‌فرستد؟

- confirmation ID
    
- intent صریح
    
- warning acknowledgement
    
- idempotency key
    

Client حق ندارد دوباره تعریف کند:

- affected IDs
    
- versions
    
- consequences
    
- warningها
    
- command semantics
    

---

# ۲۱. Warning acknowledgement versioned

فقط warning code کافی نیست.

Warning identity شامل:

```txt
warningId
code
severity
messageKey
normalizedParameters
affectedEntityIds
entityVersions
policyOrRuleVersion
warningHash
```

Acknowledgement:

```txt
warningId
warningHash
```

hash از معنای warning ساخته می‌شود، نه متن ترجمه‌شده.

تغییر punctuation یا ترجمه، acknowledgement را invalidate نمی‌کند.

اما تغییر این‌ها invalidate می‌کند:

- severity
    
- parameters
    
- affected entities
    
- entity versions
    
- policy version
    

---

# ۲۲. CommandResult authority نهایی transport است

Command submission idempotency key می‌خواهد.

نتیجه:

```txt
SUCCEEDED
CONFLICTED
FAILED
```

نه draft status و نه recommendation outcome جای CommandResult را نمی‌گیرند.

---

# ۲۳. بازیابی وقتی idempotency key گم شده

Client نباید فوراً دوباره submit کند.

flow:

```txt
GET ActionConfirmation
→ inspect submission status
→ inspect linked CommandResult
```

حالت‌ها:

- result موفق → success نمایش بده
    
- conflict/failed → failure و refresh
    
- submitted ولی pending → polling
    
- هنوز submit نشده → key جدید و یک submission
    

این مانع duplicate mutation پس از خرابی local storage می‌شود.

---

# ۲۴. Conflict refresh

stale confirmation auto-rebase نمی‌شود.

```txt
CONFLICT_STALE_VERSION
→ preserve user input
→ fetch current resources
→ regenerate draft/preview
→ show changed consequences
→ reconfirm
```

Client نباید AI output قدیمی را با canonical state جدید semantic merge کند.

---

# ۲۵. Bulk API

Confirmation bulk به این‌ها bind می‌شود:

- selected IDs دقیق
    
- expected version همه
    
- shared consequence
    
- warning hashes
    

اگر یک item stale یا protected شود:

```txt
entire command fails
→ no mutation
→ refreshed preview
```

partial success در frontend state وجود ندارد.

---

# ۲۶. Polling

Polling transport اصلی MVP برای:

- PlanningAttempt
    
- ReconcileSession
    

است.

Client با resource ID ثابت poll می‌کند.

Reconnect:

```txt
fetch existing resource
≠ create new attempt
```

Response snapshot کامل resource است.

Token streaming و partial review output نداریم.

---

# ۲۷. Cancellation API

Cancellation با timeout یا failure فرق دارد.

```txt
user cancel
→ resource CANCELLED
→ discard late result
→ no draft/explanation
```

Repeated cancellation باید harmless باشد.

Provider timeout نباید به‌عنوان user cancellation گزارش شود.

---

# ۲۸. Error envelope

API این خطاها را جدا می‌کند:

- malformed
    
- validation
    
- authorization
    
- not found
    
- stale conflict
    
- idempotency mismatch
    
- provider unavailable
    
- timeout
    
- deterministic failure
    
- cancellation
    
- expired resource.
    

HTTP mapping:

```txt
400 malformed request
401/403 auth
404 scoped not found
409 concurrency/idempotency conflict
422 semantic validation
429 rate limit
5xx/503 availability
```

Envelope شامل:

- machine code ثابت
    
- message key امن
    
- correlation ID
    
- retryability
    
- privacy-safe detail
    

---

# ۲۹. Frontend state machine

## Planning

```txt
input
submitting attempt
queued
running
reviewable draft
editing revision
creating confirmation
awaiting warning acknowledgement
submitting command
command succeeded
command conflicted
command failed
attempt failed
cancelled
expired
```

state عمومی سبز `confirmed` نداریم.

## Reconcile

```txt
loading deterministic facts
facts ready without explanation
facts + explanation
recommendation review
creating confirmation
submitting command
accepted but conflicted
command succeeded
reconcile unavailable
cancelled
```

این distinction جلوی نمایش موفقیت دروغین را می‌گیرد.

---

# بخش سوم: Discussion 020C

## Structured Output Reliability and Cost Controls

# ۳۰. اصل حاکم usability خروجی

خروجی فقط بعد از عبور از تمام gateها usable است:

```txt
provider output
→ transport completion
→ parse
→ schema validation
→ deterministic repair
→ semantic validation
→ temporal validation
→ canonical reference validation
→ draft graph validation
→ policy validation
→ context and budget validation
→ usable result
```

هرکدام fail شود، کل output reject می‌شود.

هیچ retry، repair یا client behavior نمی‌تواند این اصل را ضعیف کند.

---

# ۳۱. Output familyها جدا هستند

سه خانواده:

```txt
Planning proposal
Reconcile explanation
Safety classification
```

هرکدام schema، budget، retry، circuit و kill switch مستقل دارند.

مثلاً failure rate classification نباید circuit مربوط به Planning را لزوماً باز کند.

---

# ۳۲. Validation gateها

## Gate 1: Transport completion

Reject:

- incomplete
    
- cancelled
    
- timed out
    
- interrupted
    
- oversized
    

## Gate 2: Syntax parse

فقط wrapper removal allowlisted.

## Gate 3: Schema

- schema version
    
- required fields
    
- enum
    
- type
    
- range
    
- unknown field
    
- unique ID
    

## Gate 4: Repair

حداکثر یک pass.

## Gate 5: Semantic

- ownership
    
- recurrence
    
- Planning/Reconcile boundary
    
- warningها
    
- temporal provenance
    

## Gate 6: Temporal

- local date
    
- timezone
    
- effective range
    
- contradiction
    
- reviewDate provenance
    

## Gate 7: Canonical references

- existence
    
- ownership
    
- lifecycle
    
- type
    
- scope
    

## Gate 8: Temporary graph

- همه‌ی temp IDها موجود
    
- unique
    
- type-compatible
    
- بدون self-reference
    
- بدون cycle
    
- exclusive parent معتبر
    

هر failure کل output را reject می‌کند.

## Gate 9: Policy

Safety، protection، deadline، authority و kill switch.

## Gate 10: Context/budget integrity

اگر context به شکل نامعتبر truncate شده باشد، output حتی اگر JSON خوبی باشد رد می‌شود.

---

# ۳۳. Repair allowlist

مجاز:

```txt
REMOVE_SINGLE_JSON_CODE_FENCE
TRIM_SURROUNDING_WHITESPACE
REMOVE_UTF8_BOM
NORMALIZE_KNOWN_ENUM_CASE
NORMALIZE_YEAR_FIRST_DATE_SEPARATOR
PAD_YEAR_FIRST_MONTH_OR_DAY
```

## Enum

مجاز:

```txt
active → ACTIVE
Active → ACTIVE
```

ممنوع:

```txt
ACTVE → ACTIVE
enabled → ACTIVE
```

Fuzzy matching نداریم.

## Date

مجاز:

```txt
2026-7-2
→ 2026-07-02
```

```txt
2026/07/02
→ 2026-07-02
```

ممنوع:

```txt
01/02/2026
02-03-26
July 2
```

Locale inference در MVP انجام نمی‌شود.

---

# ۳۴. Retry policy

هر logical operation:

```txt
initial invocation
+ maximum one controlled retry
```

Hidden retry در SDK، `HttpClient` یا .NET AI integration component ممنوع است.

Retry فقط برای transient failureهای مشخص:

- connection
    
- timeout
    
- bounded rate limit
    
- temporary unavailable
    
- incomplete transport
    

Retry ممنوع برای:

- cancellation
    
- auth
    
- kill switch
    
- circuit open
    
- local rate limit
    
- budget
    
- context overflow
    
- semantic failure
    
- graph failure
    
- policy failure
    
- deterministic Reconcile failure
    

Retry configuration را تغییر نمی‌دهد:

- provider ثابت
    
- model ثابت
    
- schema ثابت
    
- context ثابت
    
- policy ثابت
    
- permission ثابت
    

---

# ۳۵. Timeoutها

هر family timeoutهای جدا دارد:

```txt
connectionTimeout
responseStartTimeout
providerInvocationTimeout
logicalOperationDeadline
pollingResourceExpiry
```

late response بعد از cancellation یا deadline discard می‌شود.

نه draft می‌سازد، نه explanation attach می‌کند.

---

# ۳۶. Circuit breaker

Circuitها بر اساس:

- provider config
    
- output family
    
- environment
    

جدا هستند.

فقط provider availability failureها circuit health را تحت‌تأثیر قرار می‌دهند.

این‌ها نباید circuit provider را باز کنند:

- schema failure
    
- semantic failure
    
- policy failure
    
- cancellation
    
- local budget
    
- local rate limit
    

وقتی circuit open است:

- provider invocation نداریم
    
- manual/deterministic flow باقی است
    
- Planning degraded/unavailable
    
- Reconcile facts-only ممکن است
    
- safety classifier fail-closed رفتار می‌کند
    

---

# ۳۷. Rate limit و idempotency فرق دارند

```txt
Idempotency
→ duplicate same intent را کنترل می‌کند

Rate limit
→ distinct work volume را کنترل می‌کند
```

Retry budget مصرف می‌کند، ولی user intent جدید محسوب نمی‌شود.

---

# ۳۸. Provider fallback

در pilot:

```txt
automatic fallback = disabled
```

failed operation با config اصلی تمام می‌شود.

Retry دستی بعدی logical operation جدید است.

---

# ۳۹. Runtime artifact versioning

هر invocation versionهای ثابت دارد:

```txt
prompt template
output schema
context builder
model configuration
rule catalog
safety policy
repair policy
```

در controlled retry این versionها تغییر نمی‌کنند.

این برای reproducibility ضروری است؛ وگرنه attempt اول با prompt v3 و retry با v4 دیگر retry همان operation نیست.

---

# ۴۰. Planning context budget

## Mandatory floor

این contextها atomic هستند:

```txt
1. explicit user request
2. accepted constraints
3. timezone/local date
4. required parents/ownership
5. deadlines/conflicts/protections/warnings
```

اگر این floor در budget جا نشود:

```txt
fail before provider invocation
→ no silent truncation
→ no cheaper model fallback
→ narrow scope
```

## Reducible

فقط:

```txt
6. secondary relevant entities
7. optional summaries/history
```

قابل کاهش‌اند.

## Coupled context

اگر entity حفظ شود، parent و protection و deadline و warning لازم آن نیز باید حفظ شوند.

نمی‌توان برای صرفه‌جویی context، Task را نگه داشت ولی deadline آن را حذف کرد و بعد از model انتظار قضاوت سالم داشت.

---

# ۴۱. Cost control

قبل از invocation باید تخمین زده شود:

- input token
    
- max output token
    
- cost band
    
- retry exposure
    
- family budget
    

Application محدود می‌کند:

- token
    
- invocation count
    
- rolling limits
    
- concurrency
    
- retry budget.
    

## Hard spend cap سمت provider

برای pilot اجباری است.

وقتی cap برسد:

```txt
no invocation
no retry
no fallback
AI disabled for config
manual/deterministic remains
operational alert
```

فقط alert کافی نیست؛ provider باید hard block کند.

چون budget داخلی ممکن است bug داشته باشد. شگفت‌آور است، ولی نرم‌افزار گاهی مطابق طراحی هزینه‌کردن را متوقف نمی‌کند.

---

# ۴۲. Observability

ثبت می‌شود:

- operation/invocation ID
    
- output family
    
- provider config
    
- artifact versions
    
- estimated/actual usage
    
- latency
    
- retry reason
    
- validation gate
    
- failure class
    
- repair
    
- circuit
    
- budget
    
- spend cap.
    

Raw content همچنان restricted و short-lived است.

Metricها نباید profile ممنوع بازسازی کنند.

---

# ۴۳. Kill switch

Switchها برای:

- Planning
    
- Reconcile explanation
    
- safety path
    
- provider config
    
- repair
    
- retry
    
- global runtime
    

وجود دارند.

قبل از هر physical invocation و retry بررسی می‌شوند.

Activation و deactivation باید audit شوند.

---

# ۴۴. User-facing failure mapping

Frontend stateهای محدود و قابل‌فهم:

- AI temporarily unavailable
    
- rate limited
    
- spend cap reached
    
- output rejected
    
- context too large
    
- cancelled
    
- Reconcile unavailable ولی Today موجود.
    

Provider name، raw prompt، stack trace و scope حساس نباید به client عادی نمایش داده شود.

---

# ۴۵. اثر خانواده‌ی 020 روی Mind Map

---

## A. MVP Core Loop

projection کامل:

```txt
bounded authorized context
→ safety classification
→ provider invocation
→ complete validated result
→ reviewable resource
→ server confirmation
→ explicit acknowledgement
→ idempotent command
→ CommandResult
```

Map فعلی تقریباً همین زنجیره را دارد.

### نتیجه

```txt
MVP Core Loop → ACCEPTED
```

---

## B. Planning Flow

مپ باید این تفکیک‌ها را حفظ کند:

```txt
PlanningAttempt
≠ PlanningDraft
≠ ActionConfirmation
≠ CommandResult
```

همچنین:

- no partial draft
    
- polling
    
- immutable revision
    
- cancellation
    
- stale refresh
    
- manual fallback
    

### نتیجه

```txt
Planning Runtime Flow → ACCEPTED
```

---

## C. Reconcile Flow

Reconcile باید:

- ابتدا deterministic fact تولید کند
    
- explanation را optional attach کند
    
- در failure deterministic unavailable شود
    
- facts-only mode داشته باشد
    
- command success را از recommendation acceptance جدا کند
    

مپ فعلی این boundaryها را دارد.

### نتیجه

```txt
Reconcile Runtime Flow → ACCEPTED
```

---

## D. AI Responsibilities

AI فقط:

- classification بسته
    
- proposal structured
    
- explanation bounded
    

انجام می‌دهد.

AI:

- tool ندارد
    
- repository access ندارد
    
- command اجرا نمی‌کند
    
- context را broaden نمی‌کند
    
- partial result نمی‌دهد
    

### نتیجه

```txt
AI Responsibilities → ACCEPTED
```

---

## E. AI Guardrails

مهم‌ترین guardrailها:

```txt
no model tool calling
no repository dependency
no partial output
no fuzzy repair
no cyclic draft graph
no hidden retry
no silent context truncation
no provider fallback in pilot
no late-result resurrection
no AI fallback for deterministic failure
no invocation after cap/kill switch
```

Mind Map این‌ها را در بخش guardrail و runtime projection دارد، هرچند جزئیات test-level در spec باقی می‌مانند.

### نتیجه

```txt
AI Guardrails → ACCEPTED
```

---

## F. Authority and API State

مپ باید distinction زیر را حفظ کند:

```txt
Draft reviewable
Confirmation created
Confirmation submitted
Command succeeded
```

Discussion 020B صریحاً می‌گوید frontend نباید یک state مبهم `confirmed` بسازد.

### نتیجه

```txt
Frontend authority states → ACCEPTED
```

---

## G. Data and Observability

نیازهای map-level:

- attempt ID
    
- request hash
    
- operation ID
    
- context builder version
    
- warning hash
    
- CommandResult
    
- cancellation
    
- retry
    
- cost metadata
    
- validation gate
    

این‌ها در 019C و 020 projection سازگارند.

### نتیجه

```txt
Runtime observability → ACCEPTED
```

---

## H. Current Decisions

تصمیم‌های بسته‌شده:

- سه port مستقل
    
- tool calling ممنوع
    
- immutable context DTO
    
- polling transport
    
- no streaming
    
- server-generated confirmation
    
- warning hash
    
- immutable draft revisions
    
- synchronous command result
    
- strict validation pipeline
    
- one repair pass
    
- max two provider calls
    
- no hidden retry
    
- no automatic fallback
    
- mandatory context floor
    
- provider hard spend cap.
    

### نتیجه

```txt
Current Decisions → ACCEPTED
```

---

## I. Open Configuration

هیچ سؤال semantic باز در 020C نمانده است.

مقادیر زیر configuration هستند:

- timeout دقیق
    
- rate limits
    
- token budgets
    
- cost limits
    
- circuit threshold
    
- resource expiry
    
- polling interval
    
- hard spend-cap amount
    
- provider/model key
    

این‌ها در 021 و 022 تعیین می‌شوند و نمی‌توانند constraintهای پذیرفته‌شده را تضعیف کنند.

### نتیجه

```txt
Open configuration classification → ACCEPTED
```

---

# ۴۶. سناریوهای تست کلیدی

## سناریو ۱: double click روی Plan

هر دو request یک `clientAttemptId` دارند.

نتیجه:

```txt
one PlanningAttempt
one provider invocation
```

---

## سناریو ۲: model output با cycle

```txt
Project A parent = Project B
Project B parent = Project A
```

نتیجه:

```txt
graph validation fails
whole output rejected
```

نه حذف یکی از edgeها.

---

## سناریو ۳: output دیررس بعد از Cancel

نتیجه:

```txt
attempt remains CANCELLED
late output discarded
no draft appears
```

---

## سناریو ۴: deterministic Reconcile خراب

نتیجه:

```txt
Reconcile unavailable
Today remains
no raw-data AI summary
```

---

## سناریو ۵: AI explanation خراب

نتیجه:

```txt
FACT visible
RULE_MATCH visible
AI_EXPLANATION absent
```

---

## سناریو ۶: warning تغییر کرده

کاربر warning قدیمی را acknowledge کرده، سپس affected entity version تغییر کرده است.

نتیجه:

```txt
warningHash mismatch
confirmation stale
new preview required
```

---

## سناریو ۷: request context بیش از budget

mandatory floor جا نمی‌شود.

نتیجه:

```txt
fail before invocation
ask to narrow scope
```

نه حذف deadline یا parent context.

---

## سناریو ۸: retry provider

Timeout transient رخ داده.

Retry:

- همان provider
    
- همان model
    
- همان prompt
    
- همان schema
    
- همان context
    
- همان operation ID
    

فقط یک بار انجام می‌شود.

---

## سناریو ۹: hard spend cap

cap provider فعال شده است.

نتیجه:

```txt
zero provider invocation
zero retry
manual flow available
```

---

## سناریو ۱۰: recommendation پذیرفته ولی command conflict

Frontend state:

```txt
accepted but conflicted
```

نه:

```txt
success
```

---

# ۴۷. آیا تعارضی پیدا شد؟

## با Discussion 018

کاملاً سازگار است:

- AI authorization boundary نیست
    
- confirmation server-generated است
    
- stale confirmation reject می‌شود
    
- current state کنترل commit را دارد
    

## با Discussion 019

سازگار است:

- version و idempotency در API حمل می‌شوند
    
- CommandResult authority دارد
    
- operation/attempt observable است
    
- transaction خارج AI runtime است
    

## با Discussion 017

سازگار است:

- Reconcile facts deterministic هستند
    
- explanation فقط rule match را توضیح می‌دهد
    
- free text وارد context نمی‌شود
    

## با Discussion 013 و 014

سازگار است:

- PlanningDraft فقط بعد از complete validation
    
- partial output رد می‌شود
    
- cancellation و retry state دارند
    
- draft revision immutable است
    

## با مپ

هیچ contradiction یا missing blocking پیدا نشد.

جزئیات API state، warning hash، retry و budget ذاتاً formal-spec و implementation-level هستند، ولی directionهای اصلی در map projection حضور دارند.

---

# جمع‌بندی وضعیت مپ

```txt
AI/application runtime separation          ACCEPTED
Three explicit AI ports                    ACCEPTED
Closed safety classification vocabulary    ACCEPTED
Immutable scoped context DTOs              ACCEPTED
No model tool calling                      ACCEPTED
Architecture enforcement tests             ACCEPTED
Planning orchestration                     ACCEPTED
Deterministic-first Reconcile              ACCEPTED
No AI fallback for rule-engine failure     ACCEPTED
No Planning token streaming                ACCEPTED
Late-result discard                        ACCEPTED
Logical provider configuration             ACCEPTED
No automatic provider fallback             ACCEPTED
Kill switches and degraded modes           ACCEPTED

Distinct API resources                     ACCEPTED
Mandatory clientAttemptId                  ACCEPTED
Immutable PlanningDraft revisions          ACCEPTED
No PlanningDraft CONFIRMED state           ACCEPTED
Server-generated ActionConfirmation        ACCEPTED
Versioned warning acknowledgement          ACCEPTED
CommandResult authority                    ACCEPTED
Lost-idempotency recovery                  ACCEPTED
Explicit stale refresh                     ACCEPTED
Bulk all-or-nothing                        ACCEPTED
Polling transport                          ACCEPTED
Explicit frontend state machines           ACCEPTED

Strict validation gates                    ACCEPTED
Whole-output graph rejection               ACCEPTED
Narrow repair allowlist                    ACCEPTED
No fuzzy enum/date inference               ACCEPTED
At most one controlled retry               ACCEPTED
Hidden retry forbidden                     ACCEPTED
Independent timeout/circuit policy         ACCEPTED
Mandatory context floor                    ACCEPTED
No unsafe context truncation               ACCEPTED
Provider-side hard spend cap               ACCEPTED
Audited granular kill switches             ACCEPTED
```

# تعریف یک‌جمله‌ای Discussion 020A

```txt
AI runtime فقط classification، proposal و explanation تولید می‌کند؛
context آن از builderهای deterministic و محدود می‌آید،
tool یا repository access ندارد
و تمام authorization و mutation بیرون از مدل انجام می‌شوند.
```

# تعریف یک‌جمله‌ای Discussion 020B

```txt
API، attempt، draft، confirmation و command result را
به‌عنوان resourceهای مستقل نگه می‌دارد؛
frontend باید review، submission، conflict و success را جدا نمایش دهد
و هیچ state client-side جای نتیجه‌ی authoritative سرور را نمی‌گیرد.
```

# تعریف یک‌جمله‌ای Discussion 020C

```txt
خروجی AI فقط پس از validation کامل syntax، schema، semantics،
time، references، graph، policy و context usable می‌شود؛
retry، timeout، budget و provider cost محدود و observable هستند
و هیچ fallback یا repairی اجازه ندارد correctness را تضعیف کند.
```

## نتیجه نهایی

```txt
Discussion 020A      ACCEPTED
Discussion 020B      ACCEPTED
Discussion 020C      ACCEPTED
Map projection       ACCEPTED
Product conflict     NONE
Blocking omission    NONE
Required change      NONE
```

مرحله‌ی بعد **Discussion 021** است: فرضیه‌های MVP، metricها، hard gateهای safety و reliability، طراحی pilot، thresholdهای ادامه یا توقف، و اینکه چه شواهدی واقعاً اجازه می‌دهد وارد implementation یا انتشار شویم.
