# مرور Discussion 019A، 019B و 019C

## مدل داده‌ی canonical، صحت transaction و قرارداد event/observability

تا Discussion 018، semantics محصول تقریباً بسته شده بود. اما هنوز یک سؤال آزاردهنده باقی می‌ماند:

> این تصمیم‌ها چگونه در دیتابیس ذخیره و اجرا شوند، بدون اینکه duplicate، stale write، partial mutation یا audit دروغین تولید شود؟

خانواده‌ی 019 این فاصله را پر می‌کند:

```txt
019A
→ چه داده‌ای canonical است؟
→ چه فیلدها و invariantهایی داریم؟

019B
→ mutationها چگونه atomically اجرا می‌شوند؟
→ concurrency، idempotency و raceها چه می‌شوند؟

019C
→ چه چیزی event است؟
→ تصمیم کاربر با موفقیت mutation چه تفاوتی دارد؟
→ AI observability و raw content چگونه جدا و نگهداری می‌شوند؟
```

این سه سند مکمل‌اند و هیچ‌کدام به‌تنهایی مدل persistence کامل را نمی‌سازد. 019A حقیقت جاری را تعریف می‌کند، 019B نحوه‌ی تغییر امن آن را، و 019C تاریخچه و قابلیت مشاهده را.

---

# بخش اول: Discussion 019A

## Canonical Data Model and Invariants

# ۱. موجودیت‌های canonical

مدل نهایی فقط شامل این پنج موجودیت است:

```txt
Goal
Project
Task
Routine
RoutineOccurrence
```

هیچ `Plan` ذخیره‌شده‌ای وجود ندارد. `PlanningDraft` ممکن است برای recovery یا approval موقت ذخیره شود، اما canonical product truth نیست و باید retention و privacy محدود داشته باشد.

## تفکیک مهم

```txt
PlanningDraft
= proposal snapshot

Goal / Project / Task / Routine
= canonical work

Today
= derived view

ReconcileSession
= bounded interaction record
```

محصول نباید برای راحتی implementation این چهار مفهوم را در یک جدول عمومی به نام `plan_data` بریزد. این همان نقطه‌ای است که ساده‌سازی اولیه بعدها به excavation باستان‌شناسی تبدیل می‌شود.

---

# ۲. مدل ownership

روابط پذیرفته‌شده:

```txt
Project → Goal? | standalone

Task → Goal? | Project? | standalone

Routine → Goal? | Project? | standalone

RoutineOccurrence → exactly one Routine
```

Task و Routine از دو foreign key nullable استفاده می‌کنند:

```txt
goalId?
projectId?
```

با invariant:

```txt
NOT (
  goalId IS NOT NULL
  AND projectId IS NOT NULL
)
```

هر دو null یعنی standalone.

## چرا polymorphic parent رد شد؟

مدلی مثل:

```txt
parentType
parentId
```

در MVP رد شده، چون referential integrity را ضعیف‌تر و validation را پیچیده‌تر می‌کند.

مدل explicit foreign key اجازه می‌دهد:

- FK واقعی داشته باشیم
    
- exclusive-parent را در DB enforce کنیم
    
- queryها روشن‌تر باشند
    
- ownership contradiction زودتر متوقف شود
    

## Goal context تکرار نمی‌شود

اگر Task متعلق به Project باشد:

```txt
Task.projectId = X
Project.goalId = Y
```

دیگر `Task.goalId = Y` ذخیره نمی‌شود.

Goal context از Project مشتق می‌شود. این جلوی دو منبع حقیقت را می‌گیرد.

---

# ۳. Shared canonical fields

تمام entityهای mutable این فیلدها را دارند:

```txt
id
userId
createdAt
updatedAt
source
version
```

مقادیر source:

```txt
MANUAL
AI_ASSISTED
SYSTEM_MIGRATED
```

## `source` authority نیست

`source = AI_ASSISTED` فقط origin creation را نشان می‌دهد.

نمی‌گوید:

- داده کمتر معتبر است
    
- AI مالک entity است
    
- mutation بعدی AI-authorized است
    
- history کامل در همین field موجود است
    

تغییرات بعدی از event و audit می‌آیند.

## `version`

`version` یک concurrency token افزایشی یا معادل database-native است.

برای جلوگیری از این وضعیت:

```txt
Client A reads version 4
Client B reads version 4

Client A writes → version 5
Client B writes old data over version 5
```

Client B باید stale conflict بگیرد، نه اینکه state جدید را با خاطره‌ی قدیمی جایگزین کند.

## Soft delete نداریم

canonical lifecycle rowها در MVP soft-delete نمی‌شوند.

حذف از active surface از طریق status انجام می‌شود:

```txt
Task ACTIVE → DROPPED
Routine ACTIVE → STOPPED
```

نه:

```txt
deletedAt != null
```

Permanent deletion مسیر privacy جدا دارد.

---

# ۴. مدل Goal

فیلدهای اصلی:

```txt
Goal
- title
- desiredOutcome
- status: ACTIVE | ACHIEVED | ABANDONED
- targetDate?
- reviewDate
- reviewDateSource
- lastContinuationDecisionAt?
- terminalAt?
- source
- version
```

## invariantها

- `desiredOutcome` بعد از approval الزامی است
    
- Goal فعال باید `reviewDate` داشته باشد
    
- Goal terminal باید `terminalAt` داشته باشد
    
- execution totalها status Goal را تغییر نمی‌دهند
    
- `lastContinuationDecisionAt` snapshot جاری است، نه history کامل
    

## provenance تاریخ review

`reviewDate` فقط می‌تواند از یکی از این منابع بیاید:

```txt
USER
SYSTEM_DEFAULT
MIGRATED_DEFAULT
```

AI می‌تواند تاریخ صریح کاربر را extract کند، ولی نمی‌تواند interval «هوشمند» اختراع کند.

---

# ۵. مدل Project

```txt
Project
- goalId?
- title
- completionMeaning?
- status: ACTIVE | COMPLETED | STOPPED
- targetDate?
- reviewDate?
- reviewDateSource?
- terminalAt?
- source
- version
```

Invariantها:

```txt
ACTIVE Project
→ targetDate exists
OR reviewDate exists
```

و:

```txt
COMPLETED | STOPPED
→ terminalAt exists
```

Project terminal شدن، Goal والد را خودکار تغییر نمی‌دهد.

Routineهای Project-owned در transaction نهایی 019B متوقف می‌شوند.

---

# ۶. مدل Task

```txt
Task
- goalId?
- projectId?
- title
- description?
- status: ACTIVE | COMPLETED | DROPPED
- placement: SCHEDULED | BACKLOG
- plannedDate?
- reviewDate?
- reviewDateSource?
- deadline?
- isProtected
- protectionReasonCode?
- terminalAt?
- source
- version
```

## invariantهای placement

```txt
SCHEDULED
→ plannedDate IS NOT NULL
```

```txt
BACKLOG
→ plannedDate IS NULL
AND reviewDate IS NOT NULL
```

```txt
ACTIVE
→ plannedDate IS NOT NULL
OR reviewDate IS NOT NULL
```

## تاریخ‌ها بعد از terminal شدن پاک نمی‌شوند

وقتی Task Complete یا Drop می‌شود:

- plannedDate قبلی حفظ می‌شود
    
- reviewDate و deadline تاریخی حفظ می‌شوند
    
- `terminalAt` ثبت می‌شود
    
- status مانع ورود به active viewها می‌شود
    

نباید برای مخفی‌کردن Task terminal، تاریخ‌هایش را null کنیم. این کار history را نابود می‌کند و queryهای آینده را به حدس‌زدن وامی‌دارد.

## active query باید status را فیلتر کند

```txt
Today:
status = ACTIVE
AND plannedDate = currentLocalDate
```

```txt
Execution overdue:
status = ACTIVE
AND plannedDate < currentLocalDate
```

```txt
Review due:
status = ACTIVE
AND reviewDate <= currentLocalDate
```

اگر status filter فراموش شود، Task Completeشده‌ای با تاریخ قدیمی می‌تواند دوباره به‌عنوان overdue ظاهر شود. روح Taskهای گذشته هم apparently نیازمند constraint هستند.

## Carry canonical field نیست

`carryCount` ذخیره‌ی mutable نمی‌شود.

Carry یک event است و count از history مشتق می‌شود.

---

# ۷. مدل Routine

```txt
Routine
- goalId?
- projectId?
- title
- description?
- status: ACTIVE | STOPPED
- recurrenceDefinition
- recurrenceTimezone
- effectiveFromLocalDate
- effectiveUntilLocalDate?
- continuationOfRoutineId?
- stoppedAt?
- source
- version
```

## local date با timestamp فرق دارد

```txt
createdAt / stoppedAt
= audit instants

effectiveFromLocalDate / effectiveUntilLocalDate
= recurrence calendar boundaries
```

بازه inclusive است.

این تفکیک برای Routineای که نزدیک نیمه‌شب یا هنگام تغییر timezone ساخته می‌شود ضروری است.

---

# ۸. هویت occurrence

در MVP:

```txt
one Routine
→ maximum one occurrence per local date
```

constraint:

```txt
UNIQUE(routineId, scheduledLocalDate)
```

رفتار دوبار در روز باید با دو Routine ساخته شود.

این تصمیم identity را ساده نگه می‌دارد و مانع اضافه‌شدن slot semantics نصفه‌ونیمه می‌شود.

---

# ۹. Routine continuation

Routine جدید می‌تواند به Routine قبلی اشاره کند:

```txt
continuationOfRoutineId
```

اما:

- identity جدید دارد
    
- source متعلق به همان user است
    
- source باید `STOPPED` باشد
    
- self-reference ممنوع است
    
- cycle ممنوع است
    
- source باید قدیمی‌تر باشد
    
- هر Routine متوقف‌شده حداکثر یک continuation مستقیم دارد
    

constraint:

```txt
UNIQUE(continuationOfRoutineId)
WHERE continuationOfRoutineId IS NOT NULL
```

این باعث می‌شود lineage در MVP شاخه‌ای نشود.

---

# ۱۰. مدل RoutineOccurrence

```txt
RoutineOccurrence
- userId
- routineId
- scheduledLocalDate
- status: PENDING | DONE | MISSED
- resolvedAt?
- version
```

Invariantها:

```txt
UNIQUE(routineId, scheduledLocalDate)

PENDING
→ resolvedAt IS NULL

DONE | MISSED
→ resolvedAt IS NOT NULL
```

`userId` عمداً تکرار شده تا isolation و query بهتر شود، ولی باید با owner Routine برابر باشد.

`resolvedAt` برای هر دو Done و Missed کافی است؛ status تفاوتشان را نشان می‌دهد.

---

# ۱۱. چه چیزهایی canonical ذخیره نمی‌شوند؟

این مقادیر source of truth mutable نیستند:

```txt
Goal progress percentage
achievement probability
motivation score
capacity score
inferred success
nextTemporalCheckpoint
carryCount
rule eligibility
overdue severity
```

همه از canonical state و event history مشتق می‌شوند.

Cache یا materialized summary بعدها ممکن است اضافه شود، ولی باید:

- provenance داشته باشد
    
- rebuildable باشد
    
- canonical truth تلقی نشود
    

---

# ۱۲. حداقل constraintهای دیتابیس

```txt
Task exclusive parent
Routine exclusive parent
same-user ownership
ACTIVE temporal checkpoint
terminal status → terminal timestamp
valid Routine effective range
unique daily occurrence
consistent occurrence resolvedAt
no continuation self-reference
one direct continuation
```

برخی invariantها cross-row هستند و با portable CHECK قابل پیاده‌سازی نیستند. 019B آن‌ها را transactionally enforce می‌کند.

---

# بخش دوم: Discussion 019B

## Transactions, Concurrency and Idempotency

# ۱۳. قرارداد اصلی mutation

هر command consequential این مسیر را دارد:

```txt
receive command
→ identify user/workspace
→ resolve idempotency identity
→ load current canonical state
→ validate authorization and invariants
→ compare expected versions
→ revalidate preview assumptions
→ execute smallest coherent atomic mutation
→ write durable event intent in same transaction
→ commit
→ return authoritative result
```

اصل:

```txt
Either coherent commit
or canonical state remains unchanged
```

Generated text هیچ authorityای در transaction ندارد.

---

# ۱۴. Optimistic concurrency پیش‌فرض است

تمام entityهای mutable version دارند.

Command باید expected version تمام entityهای مستقیماً ویرایش‌شونده را بفرستد:

```txt
expectedVersion = currentVersion
→ may proceed
```

```txt
expectedVersion != currentVersion
→ stale conflict
```

Serializable isolation به‌صورت سراسری استفاده نمی‌شود؛ چون هزینه و contention بیهوده ایجاد می‌کند.

---

# ۱۵. lockهای محدود برای invariantهای cross-row

lock کوتاه فقط برای موارد لازم:

- terminal شدن parent و child set جاری
    
- توقف Routineهای Project-owned
    
- occurrence uniqueness
    
- continuation uniqueness
    
- attachment هنگام terminal transition
    
- bulk selected-set
    
- ownership رکورد idempotency.
    

هدف این است:

```txt
optimistic by default
scoped locking where invariant crosses rows
```

نه اینکه هر command کل جهان کاربر را lock کند.

---

# ۱۶. قرارداد conflict

stale command پاسخ scoped می‌گیرد:

```txt
CONFLICT_STALE_VERSION
- entityId
- expectedVersion
- currentVersion
- currentStatus
- changedMaterialFields
```

UI باید بگوید:

- چیزی تغییر نکرد
    
- state جدید وجود دارد
    
- preview باید refresh شود
    
- confirmation قبلی معتبر نیست
    

retry خودکار حق ندارد intent کاربر را reinterpret کند.

---

# ۱۷. Revalidation واقعی پیش از commit

بلافاصله پیش از mutation باید دوباره بررسی شود:

- lifecycle
    
- ownership
    
- authorization
    
- version
    
- protection
    
- deadline
    
- placement
    
- selected set
    
- parent-child relationship
    
- rule eligibility
    
- preview assumptions.
    

اگر چیزی material عوض شده:

```txt
no mutation
→ confirmation expires
→ refreshed preview
→ reconfirmation
```

وجودنداشتن invalidation event به معنی معتبرماندن confirmation نیست.

---

# ۱۸. قرارداد idempotency

هر command consequential یک idempotency key دارد که scope آن شامل:

```txt
user/workspace
command type
client request or confirmation identity
```

است.

رکورد حداقلی:

```txt
IdempotencyRecord
- userId
- idempotencyKey
- commandType
- requestHash
- status
- resultReference?
- createdAt
- completedAt?
- expiresAt
```

statusها:

```txt
IN_PROGRESS
SUCCEEDED
FAILED_RETRYABLE
FAILED_FINAL
```

## قواعد

```txt
same key + same requestHash
→ existing result
```

```txt
same key + different requestHash
→ reject
```

```txt
uncertain response delivery
→ retry with same key
```

idempotency هرگز authorization یا version check را دور نمی‌زند.

---

# ۱۹. no-op success پس از انقضای idempotency record

اگر رکورد idempotency دیگر وجود نداشته باشد، domain state هنوز باید duplicate effect را متوقف کند.

مثلاً:

```txt
COMPLETE Task already COMPLETED
→ success, no mutation
```

```txt
DROP Task already DROPPED
→ success, no mutation
```

```txt
STOP Routine already STOPPED
→ success, no mutation
```

no-op نباید:

- event تکراری بسازد
    
- outbox duplicate بسازد
    
- terminalAt را بازنویسی کند
    
- version را بی‌دلیل افزایش دهد
    
- audit decision دوم ایجاد کند
    

اما نتیجه‌ی terminal متفاوت conflict است:

```txt
COMPLETE currently DROPPED
→ conflict
```

---

# ۲۰. Transactionهای Task

## Complete

```txt
load / lock Task
→ verify ACTIVE + version
→ revalidate parent/protection/context
→ set COMPLETED + terminalAt
→ advance version
→ write audit/outbox
→ commit
```

## Drop

- Active بودن
    
- protection و deadline
    
- حفظ dates
    
- ثبت `DROPPED`
    
- parent-empty consequence
    
- بدون terminal کردن خودکار parent
    

## Restore

- status باید `DROPPED` باشد
    
- version match
    
- parent هنوز valid و Active باشد
    
- plannedDate یا reviewDate جدید معتبر لازم است
    
- تاریخ قدیمی silently reuse نمی‌شود
    
- همان identity به Active برمی‌گردد
    
- terminalAt پاک می‌شود
    
- event Restore نوشته می‌شود.
    

raceهای terminal با first-commit-wins حل می‌شوند.

---

# ۲۱. Transactionهای occurrence

Constraint:

```txt
UNIQUE(routineId, scheduledLocalDate)
```

اگر دو request هم‌زمان occurrence بسازند:

- یکی row را ایجاد می‌کند
    
- دیگری occurrence موجود را دریافت می‌کند
    

نه duplicate.

Resolution فقط:

```txt
PENDING → DONE | MISSED
```

است و `resolvedAt` لازم دارد.

Occurrenceای که قبلاً valid ساخته شده، حتی پس از Stop Routine ممکن است resolve شود، اگر scheduled date در effective range باشد.

---

# ۲۲. Exposed occurrence چیست؟

Occurrence زمانی exposed است که در response قابل‌دیدن کاربر برگردانده شده باشد:

- Today
    
- execution-day view
    
- occurrence detail/history
    

این‌ها exposure نیستند:

- materialization داخلی
    
- eligibility calculation
    
- background process
    
- DB query داخلی
    
- analytics
    
- validation read.
    

این distinction برای Stop مهم است؛ occurrenceی که کاربر دیده نباید بعداً بی‌صدا حذف شود.

---

# ۲۳. Stop Routine و occurrenceهای آینده

Stop به‌صورت atomic:

```txt
lock Routine
→ verify ACTIVE + version
→ determine effectiveUntilLocalDate
→ set STOPPED / stoppedAt / effectiveUntil
→ advance version
→ handle invalid future occurrences
→ write event intent
→ commit
```

برای occurrenceهای آینده خارج effective range:

- هرگز Missed نمی‌شوند
    
- اگر unresolved و never-exposed باشند، ممکن است حذف شوند
    
- اگر exposed یا externally referenced باشند، identity حفظ و invalidation ثبت می‌شود
    
- occurrenceهای resolved حفظ می‌شوند
    

---

# ۲۴. ساخت continuation Routine

transaction باید تضمین کند:

- source Routine متوقف است
    
- همان user/workspace
    
- continuation مستقیم دیگری ندارد
    
- self-reference نیست
    
- identity جدید است
    
- `effectiveFromLocalDate` صریح دارد
    
- history source حفظ می‌شود.
    

unique constraint مانع branching می‌شود.

---

# ۲۵. terminal شدن parent به‌صورت staged

Goal و Project از Option B استفاده می‌کنند:

```txt
resolve children in separate confirmed transactions
→ reload parent and current children
→ revalidate eligibility and preview
→ execute final parent transaction
```

## چرا یک transaction عظیم نداریم؟

چون ممکن است تعداد childها زیاد باشد و هرکدام تصمیم متفاوتی بخواهند.

staging:

- scope transaction را کوچک‌تر می‌کند
    
- conflict را واضح‌تر می‌کند
    
- progress واقعی را حفظ می‌کند
    
- confirmationهای child را جدا نگه می‌دارد
    

اگر final parent transition بعداً stale شود، child resolutionهای قبلاً commitشده rollback نمی‌شوند.

---

# ۲۶. final transaction مربوط به Project

پس از حل Taskها:

```txt
1. lock Project
2. verify ACTIVE + expected version
3. lock active Project-owned Routines
4. revalidate child Task state
5. verify preview
6. terminal Project
7. set terminalAt
8. stop active Project-owned Routines
9. set stoppedAt/effectiveUntil
10. handle invalid future occurrences
11. advance versions
12. write audit/outbox
13. commit
```

تمام effectهای Project و Routineهایش با هم commit می‌شوند یا هیچ‌کدام.

Goal-owned و standalone Routineها دست‌نخورده می‌مانند.

هم‌زمان با terminal transition نمی‌توان child جدید attach کرد.

---

# ۲۷. Goal terminal transition

Goal نیز staged است.

final transition فقط وقتی مجاز است که پس از reload:

- child illegal باقی نمانده باشد
    
- preview هنوز معتبر باشد
    
- confirmation current باشد
    

Goal achievement همیشه user-confirmed outcome باقی می‌ماند و از execution total استنتاج نمی‌شود.

---

# ۲۸. Bulk atomicity

در MVP bulk action:

```txt
all selected items succeed
OR
none mutate
```

Command باید داشته باشد:

- IDهای صریح
    
- action مشترک
    
- expected version همه
    
- eligibility جاری
    
- preview جاری
    

اگر یک item stale شود، کل bulk fail می‌شود.

partial success ممنوع است چون معنای confirmation کاربر را عوض می‌کند.

مثلاً کاربر ۱۰ Task را برای Backlog تأیید کرده، ولی فقط ۷ مورد منتقل شوند. این دیگر همان action تأییدشده نیست، هرچند backend ممکن است با افتخار status 207 تولید کند.

---

# ۲۹. lock ordering

تمام عملیات multi-row ترتیب ثابت دارند:

```txt
1. idempotency record
2. parent before child
3. Goal → Project → Task → Routine → RoutineOccurrence
4. ascending stable ID
```

UI order، user selection order و AI recommendation order نباید lock order را تعیین کنند.

deadlock retry فقط با:

- همان command
    
- همان idempotency key
    
- اجرای دوباره‌ی تمام validationها
    

مجاز است.

---

# ۳۰. Durable event intent

domain write و event intent باید در یک DB transaction باشند:

```txt
domain mutation
+
audit/event row or transactional outbox
→ same commit
```

ممنوع:

- state commit شود ولی event intent گم شود
    
- event قبل از commit publish شود
    
- broker به canonical truth تبدیل شود
    

delivery بعد از commit می‌تواند idempotently retry شود.

---

# بخش سوم: Discussion 019C

## Events, AI Observability and Retention

# ۳۱. چهار لایه‌ی persistence

محصول چهار لایه‌ی مستقل دارد:

```txt
CANONICAL_DOMAIN_STATE
DOMAIN_AND_AUDIT_EVENTS
AI_OPERATIONAL_OBSERVABILITY
RAW_AI_CONTENT
```

نباید در یک generic JSON event table ترکیب شوند.

## تفاوت

```txt
Canonical state
= اکنون چه چیزی درست است؟

Domain event
= چه اتفاقی افتاد؟

AI operation
= مدل و runtime چگونه رفتار کردند؟

Raw content
= متن واقعی prompt/response چه بود؟
```

هیچ observability layerی نباید source دوم canonical truth شود.

---

# ۳۲. Event envelope

eventهای durable حداقل این اطلاعات را دارند:

```txt
eventId
eventType
eventVersion
occurredAt
recordedAt
userId / workspaceId
actor
aggregateType
aggregateId
aggregateVersion
transactionId
correlationId
causationId?
commandId?
proposalId?
confirmationId?
reconcileSessionId?
ruleId?
ruleVersion?
payload
```

actor فقط:

```txt
USER
SYSTEM_DETERMINISTIC
```

است.

AI ممکن است proposal reference داشته باشد، ولی authorizing actor نیست.

---

# ۳۳. Acceptance با application success فرق دارد

یکی از مهم‌ترین تصمیم‌های 019C:

```txt
ACCEPTED
or ACCEPTED_EDITED
→ proves user intent
→ does not prove mutation succeeded
```

برای فهم application باید command result دیده شود:

```txt
resultingCommandId
→ CommandResult
→ SUCCEEDED
  | CONFLICTED
  | FAILED_FINAL
  | FAILED_RETRYABLE
```

## مثال

```txt
recommendation = ACCEPTED
commandResult = CONFLICT_STALE_VERSION
```

معنا:

```txt
user accepted
but nothing was applied
```

نه اینکه analytics آن را «recommendation successfully adopted» حساب کند.

Metricهای جدا:

- acceptance rate
    
- application-success rate
    
- accepted-but-conflicted
    
- accepted-but-failed
    
- edited-before-application.
    

---

# ۳۴. Decision outcomeها

```txt
ACCEPTED
ACCEPTED_EDITED
REJECTED
CANCELLED
EXPIRED_WITHOUT_DECISION
```

`IGNORED` durable decision نیست، چون absence of action intent را ثابت نمی‌کند.

`EXPIRED_WITHOUT_DECISION` فقط می‌گوید proposal منقضی شد و تصمیم ثبت نشد.

---

# ۳۵. persistence مربوط به PlanningDraft

PlanningDraft موقت می‌تواند برای این موارد ذخیره شود:

- crash recovery
    
- retry
    
- multi-device review
    
- stale context detection
    
- revision history
    
- approval linkage.
    

فیلدهای حداقلی:

```txt
id
userId
status
currentRevision
createdAt
updatedAt
expiresAt
sourceOperationId?
schemaVersion
contextFingerprint
```

هر revision یک snapshot کامل bounded است، نه patch chain مبهم.

partial output به‌عنوان draft قابل approval ذخیره نمی‌شود.

---

# ۳۶. AIProposal و item decision

`AIProposal` یک attempt معتبرشده یا explanation artifact است، نه canonical state.

شامل:

```txt
operationId
proposalType
proposalVersion
status
schemaVersion
contextFingerprint
resultingDraftId?
reconcileSessionId?
```

تصمیم هر proposal item شامل:

```txt
proposalItemId
affectedEntityIds
decisionOutcome
editedMaterialFields?
decidedAt?
resultingCommandId?
```

باز هم سه چیز جدا هستند:

```txt
proposal
decision
command success
```

---

# ۳۷. ActionConfirmation

هر confirmation consequential این اطلاعات را نگه می‌دارد:

```txt
confirmationId
actionType
proposalId / previewId
proposalVersion
previewVersion
affectedEntityIds
expectedEntityVersions
consequence summary
reversible
confirmedAt
resultingCommandId?
```

confirmation historical می‌ماند، حتی اگر stale شود، ولی دیگر اجازه‌ی mutation نمی‌دهد.

---

# ۳۸. ReconcileSession چرا persisted است؟

ReconcileSession یک interaction bounded و قابل‌تعریف است:

```txt
OPEN
COMPLETED
ABANDONED
EXPIRED
```

فیلدها:

- trigger
    
- local date
    
- timezone
    
- rule catalog version
    
- fact snapshot version
    
- degraded mode
    
- opened/completed timestamps.
    

Session به این‌ها لینک دارد:

```txt
ReconcileFact
RuleMatch
ReconcileGroup
Recommendation
Decision
Commands
```

اما canonical execution truth نیست؛ فقط ثبت می‌کند در آن زمان چه دیده، پیشنهاد و تصمیم گرفته شد.

---

# ۳۹. ReconcileFact و RuleMatch

`ReconcileFact`:

```txt
factType
entityType
entityId
observedMetrics
reasonCodes
evidenceQuality
factVersion
```

`RuleMatch`:

```txt
ruleId
ruleVersion
affectedEntityIds
matchedAt
allowedActionTypes
consequenceCodes
```

free text و description از rule matching و Reconcile AI حذف می‌شوند.

---

# ۴۰. AI operational observability

`AIOperation` metadata provider-neutral نگه می‌دارد:

```txt
operationType
providerKey
modelKey
modelVersion?
promptTemplateId/version
contextBuilderKey/version
schemaVersion
rulesCatalogVersion?
latency
token counts
status
failureCategory
degradedMode
correlationId
```

Domain entityها نباید به نام provider یا model وابسته شوند.

مثلاً Task نباید field زیر داشته باشد:

```txt
generatedByGPT56 = true
```

provider metadata متعلق به operation است، نه semantics Task.

---

# ۴۱. AI Context Scope Manifest

برای هر AI operation، سیستم scope context را ثبت می‌کند، نه خود content را:

```txt
builderKey/version
operationType
includedContextCategories
includedEntityTypes
includedEntityCount
includedFieldGroups
excludedSensitiveCategories
freeTextIncluded
importedContentIncluded
```

Manifest نباید ذخیره کند:

- raw prompt
    
- notes
    
- descriptions
    
- documents
    
- entity snapshot کامل
    
- auth data
    
- secrets
    

## invariantهای مهم

برای Reconcile MVP:

```txt
freeTextIncluded = false
importedContentIncluded = false
```

اگر manifest ناقص باشد، runtime حق ندارد context را گسترده‌تر کند.

Manifest فقط مشاهده‌پذیری privacy است، نه permission grant.

---

# ۴۲. generic update event ممنوع یا محدود است

eventی مثل:

```txt
TASK_UPDATED
```

بدون توضیح دقیق تغییر نامعتبر است.

نسخه‌ی قابل‌قبول:

```txt
TASK_UPDATED
changedFields:
  - field: reviewDate
    before: 2026-08-01
    after: 2026-08-20
    sourceBefore: SYSTEM_DEFAULT
    sourceAfter: USER
```

قواعد:

- فقط changed fieldها
    
- before/after متناسب
    
- redaction برای sensitive values
    
- reason code وقتی value مناسب نیست
    
- بدون full snapshot
    
- بدون note/description خام
    

برای تغییرهای مهم، semantic event بهتر است:

```txt
TASK_PLANNED_DATE_CHANGED
TASK_MOVED_TO_BACKLOG
TASK_REPARENTED
ROUTINE_RECURRENCE_CHANGED
PROTECTION_CHANGED
```

---

# ۴۳. Event taxonomy

حداقل eventهای lifecycle:

## Goal

```txt
GOAL_CREATED
GOAL_ACHIEVED
GOAL_ABANDONED
GOAL_CONTINUATION_CONFIRMED
GOAL_REVIEW_DEFERRED
```

## Project

```txt
PROJECT_CREATED
PROJECT_COMPLETED
PROJECT_STOPPED
PROJECT_TERMINAL_STAGING_STARTED
PROJECT_TERMINAL_STAGING_CONFLICTED
```

## Task

```txt
TASK_CREATED
TASK_COMPLETED
TASK_DROPPED
TASK_RESTORED
TASK_CARRIED
TASK_REPLANNED
TASK_MOVED_TO_BACKLOG
TASK_SPLIT
TASK_REPARENTED
```

## Routine

```txt
ROUTINE_CREATED
ROUTINE_STOPPED
ROUTINE_CONTINUATION_CREATED
ROUTINE_RECURRENCE_CHANGED
```

## Occurrence

```txt
ROUTINE_OCCURRENCE_CREATED
ROUTINE_OCCURRENCE_EXPOSED
ROUTINE_OCCURRENCE_DONE
ROUTINE_OCCURRENCE_MISSED
ROUTINE_OCCURRENCE_CORRECTED
ROUTINE_OCCURRENCE_INVALIDATED
ROUTINE_OCCURRENCE_REMOVED_BEFORE_EXPOSURE
```

## Planning و confirmation

```txt
PLANNING_DRAFT_CREATED
PLANNING_DRAFT_REVISED
PLANNING_DRAFT_EXPIRED
ACTION_PREVIEWED
ACTION_CONFIRMED
CONFIRMATION_INVALIDATED
ACTION_CANCELLED
```

## Reconcile

```txt
RECONCILE_SESSION_OPENED
RECONCILE_RULE_MATCHED
RECONCILE_RECOMMENDATION_PRESENTED
RECONCILE_RECOMMENDATION_DECIDED
RECONCILE_SESSION_COMPLETED
RECONCILE_SESSION_EXPIRED
```

---

# ۴۴. Cascade event model

parent terminal cascade باید تولید کند:

```txt
1 parent event
+
1 event for every changed child
+
shared transactionId or cascadeId
```

مثلاً:

```txt
PROJECT_COMPLETED
ROUTINE_STOPPED
ROUTINE_STOPPED
```

یک parent event نباید تغییر childها را مخفی کند.

از طرف دیگر child event نباید وانمود کند کاربر هر Routine را جداگانه Stop کرده؛ actor و causation باید نشان دهند consequence deterministic یک action تأییدشده‌ی parent بوده است.

---

# ۴۵. Transactional outbox

```txt
domain mutation
+
audit/domain event
+
outbox intent
→ one transaction
```

پس:

- canonical mutation بدون event intent نداریم
    
- event publish پیش از commit نداریم
    
- broker source of truth نیست
    
- delivery retryable است
    

---

# ۴۶. اثر خانواده‌ی 019 روی Mind Map

این خانواده بیشتر روی بخش‌های فنی و source-of-truth مپ اثر دارد، ولی consequences محصولی هم دارد.

---

## A. Product Model

مپ باید نشان دهد:

```txt
Goal / Project / Task / Routine / Occurrence
= canonical

PlanningDraft / ReconcileSession / AIProposal
= supporting records, not canonical work

Today / overdue / checkpoint
= derived
```

مدل فعلی مپ پنج entity و نبود canonical Plan را درست نشان می‌دهد.

### نتیجه

```txt
Product Model → ACCEPTED
```

---

## B. Ownership و invariants

مپ باید روابط زیر را حفظ کند:

- exclusive parent برای Task و Routine
    
- Goal context مشتق‌شده از Project
    
- standalone معتبر
    
- occurrence متعلق به Routine
    
- continuation entity جدید
    
- terminal entity در active query ظاهر نمی‌شود
    

### نتیجه

```txt
Ownership invariants → ACCEPTED
```

---

## C. MVP Core Loop

loop نهایی persistence:

```txt
approved proposal / manual action
→ command
→ idempotency
→ current-state validation
→ expected-version check
→ atomic mutation
→ audit/outbox intent
→ CommandResult
```

مپ فعلی chain مربوط به confirmation، revalidation، deterministic commit و events را دارد.

### نتیجه

```txt
Core mutation loop → ACCEPTED
```

---

## D. Planning Flow

Planning approval باید به:

```txt
PlanningDraft approval
→ canonical creation command
→ command result
```

تبدیل شود.

PlanningDraft خودش work canonical نمی‌شود.

همچنین approval فقط intent را ثبت نمی‌کند؛ application success باید از command result بیاید.

### نتیجه

```txt
Planning persistence boundary → ACCEPTED
```

---

## E. Execution Flow

تصمیم‌های کلیدی:

- Today query فقط Active Taskها
    
- terminal Task dates حفظ می‌شوند
    
- occurrence daily unique است
    
- Stop Routine effective range دارد
    
- exposed occurrence بی‌صدا حذف نمی‌شود
    
- Restore checkpoint جدید می‌خواهد
    

این‌ها در map-level execution direction سازگارند، هرچند field-level detail در specs است.

### نتیجه

```txt
Execution persistence → ACCEPTED
```

---

## F. Reconcile Flow

ReconcileSession یک snapshot bounded دارد:

```txt
facts
rules
recommendations
decisions
commands
results
```

این distinction در مپ فعلی دیده می‌شود:

```txt
facts → rules/AI → confirmation → mutation
```

نکته‌ی مهم:

```txt
recommendation accepted
≠ mutation succeeded
```

این باید در UI، analytics و event projection حفظ شود.

### نتیجه

```txt
Reconcile record model → ACCEPTED
```

---

## G. Authority و Confirmation

019C data structure لازم برای 018 را formal می‌کند:

- proposal version
    
- preview version
    
- confirmation record
    
- expected versions
    
- selected entity IDs
    
- resulting command
    
- command result
    

و 019B enforcement آن را انجام می‌دهد.

### نتیجه

```txt
Authority persistence → ACCEPTED
```

---

## H. Data Events

این بخش authority مستقیم 019C است.

مپ فعلی Data Events را به semantic inventory، metrics و observability متصل کرده و eventها را canonical state تلقی نمی‌کند.

### نتیجه

```txt
Event model → ACCEPTED
```

---

## I. AI Observability و Privacy

مپ باید distinction زیر را حفظ کند:

```txt
Domain state
Domain events
AI metadata
Raw AI content
```

و context manifest فقط scope metadata است.

این تصمیم با guardrailهای privacy در 018A سازگار است.

### نتیجه

```txt
AI observability boundary → ACCEPTED
```

---

## J. Metrics

019C چند خطای تحلیلی را ممنوع می‌کند:

```txt
accepted recommendation
≠ successful application
```

```txt
expired proposal
≠ rejected proposal
```

```txt
no decision
≠ ignored by intent
```

```txt
event delivered
≠ canonical state committed
```

Metricهای acceptance، application، conflicts و failure باید جدا باشند.

### نتیجه

```txt
Measurement integrity → ACCEPTED
```

---

# ۴۷. سناریوهای تست کلیدی

## سناریو ۱: دو دستگاه Task را تغییر می‌دهند

```txt
Device A: version 4 → Complete
Device B: version 4 → Drop
```

اولی commit می‌شود و version 5 می‌سازد.

دومی:

```txt
CONFLICT_STALE_VERSION
```

می‌گیرد و state جدید را overwrite نمی‌کند.

---

## سناریو ۲: دوبار ارسال Complete

request اول commit شده، response گم شده است.

retry با همان idempotency key:

```txt
existing SUCCEEDED result
```

را برمی‌گرداند.

event دوم و version جدید ایجاد نمی‌شود.

---

## سناریو ۳: idempotency record منقضی شده

Task از قبل Completed است.

Complete دوباره:

```txt
idempotent no-op success
```

بدون event یا mutation جدید.

---

## سناریو ۴: bulk action با یک item stale

۱۰ Task برای Backlog انتخاب شده‌اند.

یکی version جدید دارد.

نتیجه:

```txt
all fail
preview regenerated
```

نه اینکه ۹ مورد commit شوند.

---

## سناریو ۵: Stop Routine با occurrence فردای materialized

اگر occurrence فردا:

- never exposed بوده
    
- unresolved است
    
- external reference ندارد
    

می‌تواند حذف شود.

اگر کاربر قبلاً آن را دیده:

```txt
identity preserved
explicit invalidation event
```

---

## سناریو ۶: recommendation accepted ولی command conflict

```txt
decisionOutcome = ACCEPTED
commandResult = CONFLICTED
```

Analytics:

```txt
acceptance +1
application success +0
accepted-but-conflicted +1
```

---

## سناریو ۷: terminal Task با plannedDate قدیمی

Task Completed است و plannedDate هفته‌ی قبل دارد.

Today/overdue query باید status را فیلتر کند و Task را نشان ندهد.

---

## سناریو ۸: duplicate occurrence

دو process هم‌زمان occurrence امروز را می‌سازند.

unique constraint باعث می‌شود فقط یک occurrence وجود داشته باشد و process دوم همان row را دریافت کند.

---

## سناریو ۹: Project completion cascade

Project terminal می‌شود و دو Routine آن Stop می‌شوند.

Eventها:

```txt
PROJECT_COMPLETED
ROUTINE_STOPPED
ROUTINE_STOPPED
```

همه با transaction/cascade مشترک.

---

# ۴۸. آیا تعارضی پیدا شد؟

## میان 019A و مدل محصول

تعارضی نیست:

- entityها همان مدل 012 هستند
    
- Plan canonical نیست
    
- ownership exclusive است
    
- temporal visibility enforce می‌شود
    
- occurrence daily identity حفظ شده
    

## میان 019B و authority 018

سازگار است:

- confirmation کافی نیست
    
- revalidation پیش از commit اجباری است
    
- stale action reject می‌شود
    
- bulk selected-set atomic است
    
- AI transaction authority نیست
    

## میان 019C و eventهای قبلی

019C candidateهای discussions قبلی را نهایی و semantic کرده است.

نکته‌ی درست آن این است که هر candidate را کورکورانه event مستقل نکرده؛ event taxonomy را با source-of-truth و privacy boundary هماهنگ کرده است.

## با مپ

هیچ contradiction یا omission blocking دیده نشد.

جزئیات field، lock ordering، idempotency record و retention ذاتاً spec-level هستند و نیازی نیست داخل node اصلی mind map فشرده شوند.

---

# یک نکته‌ی مهم برای implementation

در implementation آینده باید مراقب باشیم command handlerها سه خروجی متفاوت را یکی نکنند:

```txt
UserDecision
CommandResult
DomainEvent
```

مثلاً:

```txt
User accepted recommendation
```

نباید endpoint فوراً response زیر بدهد:

```json
{
  "success": true,
  "message": "Changes applied"
}
```

مگر transaction واقعاً commit شده باشد.

Response درست باید نتیجه‌ی authoritative command را نشان دهد، نه optimism رابط کاربری. خوش‌بینی در زندگی فضیلت است؛ در transaction protocol، defect.

---

# جمع‌بندی وضعیت مپ

```txt
Five canonical entities                      ACCEPTED
No canonical Plan                            ACCEPTED
Temporary PlanningDraft                      ACCEPTED
Exclusive parent constraints                 ACCEPTED
Same-user ownership                          ACCEPTED
Canonical source/version fields              ACCEPTED
No lifecycle soft-delete                     ACCEPTED
Temporal provenance                          ACCEPTED
Task placement invariants                    ACCEPTED
Active-state date filtering                  ACCEPTED
Routine effective local dates                ACCEPTED
Daily occurrence uniqueness                  ACCEPTED
Continuation lineage                         ACCEPTED
Derived values not canonical                 ACCEPTED

Optimistic concurrency                       ACCEPTED
Scoped cross-row locks                       ACCEPTED
Commit-time revalidation                     ACCEPTED
Stale conflict contract                      ACCEPTED
Idempotency records                          ACCEPTED
Domain no-op replay protection               ACCEPTED
Task atomic transitions                      ACCEPTED
Occurrence uniqueness handling               ACCEPTED
Exposed occurrence policy                    ACCEPTED
Routine Stop atomicity                       ACCEPTED
Staged parent terminal flow                  ACCEPTED
Project/Routine atomic cascade               ACCEPTED
Bulk all-or-nothing                          ACCEPTED
Deterministic lock order                     ACCEPTED
Transactional outbox                         ACCEPTED

Four persistence layers                      ACCEPTED
Provider-neutral event envelope              ACCEPTED
User acceptance vs command success           ACCEPTED
PlanningDraft revision persistence           ACCEPTED
Proposal/decision/command separation         ACCEPTED
ActionConfirmation record                    ACCEPTED
ReconcileSession persistence                 ACCEPTED
Fact and RuleMatch records                   ACCEPTED
Provider-neutral AI observability            ACCEPTED
Context-scope manifest                       ACCEPTED
No raw Reconcile free text                   ACCEPTED
Semantic update events                       ACCEPTED
Cascade child events                         ACCEPTED
```

# تعریف یک‌جمله‌ای Discussion 019A

```txt
019A مشخص می‌کند چه داده‌ای حقیقت canonical است،
چه invariantهایی باید در schema و database حفظ شوند،
و کدام مقادیر مانند Today، Carry count، severity و progress
فقط از state و history مشتق می‌شوند.
```

# تعریف یک‌جمله‌ای Discussion 019B

```txt
019B تضمین می‌کند هر command با idempotency،
version check، current-state revalidation و transaction اتمیک اجرا شود؛
bulk یا cascade یا کامل commit می‌شود یا هیچ تغییری ایجاد نمی‌کند،
و event intent همراه state ذخیره می‌شود.
```

# تعریف یک‌جمله‌ای Discussion 019C

```txt
019C canonical state، domain history، AI diagnostics و raw content
را از هم جدا می‌کند،
قبول پیشنهاد را از موفقیت mutation متمایز می‌سازد
و eventها، confirmationها، sessionها و observability
را با provenance و privacy روشن ثبت می‌کند.
```

## نتیجه نهایی

```txt
Discussion 019A      ACCEPTED
Discussion 019B      ACCEPTED
Discussion 019C      ACCEPTED
Map projection       ACCEPTED
Product conflict     NONE
Blocking omission    NONE
Required change      NONE
```

مرحله‌ی بعد **Discussion 020A، 020B و 020C** است: orchestration runtime، مرز model و application service، قرارداد API و stateهای frontend، structured output validation، provider fallback، timeout، budget و cost control.