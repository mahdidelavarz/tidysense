# مرور Discussion 016 و 016A

## زمان فعال‌شدن Reconcile، شدت نمایش و جداسازی Review از شکست اجرایی

Discussion 015 مشخص کرد چه execution factهایی تولید می‌شوند. Discussion 016 مشخص می‌کند **کدام‌یک از آن factها واقعاً نیاز به تصمیم دارند، Reconcile با چه شدتی نمایش داده شود، و چه زمانی نباید مزاحم Today شود**.

Discussion 016A نیز lane جداگانه‌ی review checkpointها را اضافه می‌کند تا رسیدن زمان بازبینی Goal، Project یا Backlog Task با عقب‌افتادگی اجرایی اشتباه گرفته نشود.

ساختار تصمیم:

```txt
016
→ execution backlog eligibility
→ LIGHT / MEDIUM / RECOVERY
→ blocking conflicts
→ skip, suppression and retrigger

016A
→ REVIEW_DUE eligibility
→ separate commitment-review lane
→ grouping and chunking
```

---

# ۱. مسئله‌ی اصلی چه بود؟

صرف اینکه داده‌ای درباره‌ی گذشته وجود دارد، به این معنا نیست که کاربر باید فوراً وارد Reconcile شود.

مثلاً:

- یک Task از دیروز مانده
    
- ۲۰ occurrence در زمان غیبت reconstruct شده‌اند
    
- یک Goal به reviewDate رسیده
    
- کاربر یک ماه اپ را باز نکرده
    
- Project نمی‌تواند به‌خاطر childهای فعال Complete شود
    
- یک Task بار دوم Carry شده
    

این موارد اهمیت و رفتار یکسانی ندارند.

بحث باید به این سؤال‌ها جواب می‌داد:

```txt
چه چیزی Reconcile را eligible می‌کند؟
چه چیزی فقط context است؟
شدت نمایش چگونه محاسبه می‌شود؟
آیا Recovery باید Today را قفل کند؟
آیا conflict محلی، severity کل سیستم را بالا می‌برد؟
در یک روز چند بار می‌توان prompt نشان داد؟
```

Discussion 016 صریحاً فقط trigger و presentation policy را مالک است؛ grouping، recommendation و actionهای نهایی متعلق به 017 هستند.

---

# ۲. سه مفهوم که نباید یکی شوند

محصول باید این سه تصمیم را جدا نگه دارد:

```txt
1. Eligibility
آیا fact حل‌نشده‌ای وجود دارد که تصمیم کاربر می‌خواهد؟

2. Severity
Reconcile با چه میزان prominence نمایش داده شود؟

3. Blocking conflict
آیا یک action خاص تا حل conflict محلی ممنوع است؟
```

بنابراین:

```txt
eligible = true
≠ RECOVERY
```

و:

```txt
blockingConflict = true
≠ Today blocked
```

و حتی:

```txt
blockingConflict = true
≠ severity automatically increases
```

## مثال

یک Project با یک Task فعال نمی‌تواند Complete شود:

```txt
severity = LIGHT
blockingConflict = true
scope = PROJECT_COMPLETION
```

فقط Complete کردن همان Project blocked است. کاربر همچنان می‌تواند وارد Today شود و severity کلی ممکن است Light باقی بماند.

---

# ۳. Eligibility چه زمانی ایجاد می‌شود؟

Reconcile زمانی eligible می‌شود که حداقل یک **actionable unresolved fact** وجود داشته باشد.

کلمه‌ی actionable مهم است. صرف وجود history یا telemetry کافی نیست.

---

# ۴. Taskهای eligible

Task می‌تواند Reconcile را فعال کند وقتی:

- Active است و `plannedDate` آن گذشته
    
- همان Task حداقل دو بار Carry شده
    
- Drop یا correction آن هنوز context حل‌نشده ایجاد کرده
    
- با terminal action والد conflict دارد
    
- ownership آن در یک lifecycle operation حل‌نشده شده است.
    

## یک Task از دیروز

برای eligibility کافی است، ولی معمولاً فقط:

```txt
LIGHT
```

ایجاد می‌کند.

یعنی «چیزی برای تصمیم هست» به معنی «کل برنامه در حال فروپاشی است» نیست. سیستم باید بتواند بین یک لیوان روی میز و آتش‌سوزی ساختمان تفاوت بگذارد؛ قابلیتی جاه‌طلبانه ولی مفید.

---

# ۵. Routine و occurrenceهای eligible

Routine execution ممکن است eligible شود وقتی:

- pattern تکرارشده‌ی Missed در periodهای observed وجود دارد
    
- correctionهای تاریخی برداشت قبلی را materially تغییر داده‌اند
    
- recurrence چند بار edit شده و احتمالاً fit نیست
    
- parent lifecycle، Routine را متوقف کرده و review لازم است
    
- execution factها deterministic قابل‌حل نیستند.
    

## یک Missed معمولی

به‌تنهایی Reconcile را فعال نمی‌کند.

```txt
single MISSED occurrence
≠ actionable backlog item
```

چون occurrence Missed، یک fact تاریخی است و الزاماً تصمیمی از کاربر نمی‌خواهد.

---

# ۶. Structural conflict

Structural conflict زمانی است که یک lifecycle action بدون تعیین تکلیف childها coherent نیست.

نمونه‌ها:

- Complete کردن Project با Taskهای فعال
    
- Abandon کردن Goal با work فعال
    
- باقی‌ماندن child فعال زیر parent terminal.
    

رفتار:

- focused resolution path باز می‌شود
    
- فقط action مربوطه blocked می‌شود
    
- Today آزاد می‌ماند
    
- severity سراسری خودکار Recovery نمی‌شود
    

این conflictها مسئله‌ی integrity هستند، نه اندازه‌ی backlog.

---

# ۷. چه چیزهایی eligibility ایجاد نمی‌کنند؟

این‌ها به‌تنهایی نباید Reconcile را فعال کنند:

- غیبت کاربر بدون work حل‌نشده
    
- occurrence Missed منفرد
    
- factهای قبلاً resolveشده
    
- deterministic cleanup
    
- signalهای صرفاً analytics
    
- calibration signal بدون execution decision
    
- Task یا occurrence آینده
    
- history کامل‌شده که correction لازم ندارد.
    

اصل:

```txt
data exists
≠ user decision required
```

---

# ۸. Cleanup قبل از severity

Severity فقط بعد از cleanup deterministic محاسبه می‌شود.

ترتیب:

```txt
1. current local date and timezone
2. derive/materialize required occurrences
3. convert eligible past PENDING to MISSED
4. remove future projections and non-actionable facts
5. identify actionable facts
6. deduplicate already handled facts
7. identify scoped conflicts
8. calculate severity
```

## چرا مهم است؟

مثلاً:

```txt
30 reconstructed MISSED occurrences
+ no explicit decision required
≠ 30 backlog items
```

اگر cleanup قبل از severity نباشد، یک ماه بازنکردن اپ می‌تواند سیستم را به Recovery مصنوعی ببرد. محصول ابتدا backlog را تولید می‌کند و بعد با قهرمان‌بازی همان backlog را مدیریت می‌کند. چرخه‌ی اقتصادی جذابی است، ولی برای کاربر نه.

---

# ۹. ورودی‌های severity

## Backlog اصلی

- `actionableBacklogCount`
    
- `unresolvedTaskCount`
    
- `oldestUnresolvedAgeDays`
    
- `repeatedCarryTaskCount`
    
- `maximumCarryCountForOneTask`
    
- `deadlineRiskCount`
    
- تعداد Projectها و Goalهای تحت‌تأثیر
    
- correctionهای actionable
    
- itemهای جدید از Reconcile قبلی.
    

## Routine summary

- patternهای actionable
    
- recent missed pattern
    
- observed occurrence count
    
- correction count
    
- recurrence edit count
    

اما raw Missed count نباید مستقیماً severity را بالا ببرد.

## Absence context

```txt
absenceDays
activityObservedDuringPeriod
evidenceConfidence
```

قانون:

```txt
absence modifies context and confidence
absence does not create eligibility
absence does not raise severity by itself
```

## Blocking context

Conflict جدا از severity ثبت می‌شود:

```txt
blockingConflict
blockingConflictCount
blockingConflictScope[]
```

---

# ۱۰. `actionableBacklogCount` چیست؟

```txt
Reconcile-eligible facts
that currently require an explicit user decision
```

شامل:

- Taskهای unresolved
    
- repeated Carry نیازمند review
    
- correctionهای تصمیم‌دار
    
- conflictهای مشابه
    

شامل نمی‌شود:

- raw Missed history
    
- work آینده
    
- factهای deterministic
    
- history بدون action.
    

---

# ۱۱. Severity سطح LIGHT

برای backlog کوچک، تازه و ساده:

```txt
1–2 actionable items
oldest age <= 2 local days
no meaningful deadline risk
no broad parent spread
no repeated Carry requiring review
```

نمایش:

- prompt یا banner کوچک
    
- کاملاً optional
    
- Today را قطع نمی‌کند
    
- quick resolution ممکن است
    
- برای همان روز dismiss می‌شود
    

نمونه‌ی لحن:

> یک Task از دیروز هنوز نیاز به تصمیم دارد.

نه:

> عملکرد برنامه‌ریزی شما کاهش یافته است.

یکی fact است، دیگری روان‌کاوی آماتور با فونت محصول.

---

# ۱۲. Severity سطح MEDIUM

وقتی review آگاهانه مفید است، ولی Recovery گسترده لازم نیست.

هرکدام ممکن است کافی باشند:

```txt
3–7 actionable items
oldest age = 3–7 days
1–2 items older than 7 days
same Task carried at least twice
more than one affected Goal/Project
meaningful deadline risk
multiple related corrections or drops
```

نمایش:

- card یا entry برجسته
    
- قبل از future planning توصیه می‌شود
    
- همچنان skippable
    
- Today باز می‌ماند
    
- badge بعد از skip باقی می‌ماند
    

## repeated Carry

```txt
first Carry
→ normal rescheduling

second Carry
→ repeated-Carry signal
→ Reconcile eligible
```

ولی Carry دوم:

```txt
≠ RECOVERY automatically
```

---

# ۱۳. Severity سطح RECOVERY

زمانی که backlog:

- گسترده
    
- قدیمی
    
- چندcontextی
    
- یا حل‌کردنش با action کوچک ناامن است
    

قواعد قوی:

```txt
8+ actionable items

oldest age > 7 days
AND actionable count >= 3

3+ affected parent contexts

large actionable backlog after meaningful absence

several periods of unresolved Carry/Drop decisions
```

## قانون edge مهم

```txt
1–2 old items
even older than 7 days
→ MEDIUM at most
```

سن به‌تنهایی Recovery نمی‌سازد. breadth نیز لازم است.

## Presentation

- recovery flow اختصاصی و chunked
    
- امکان ورود به Today اول
    
- همچنان skippable
    
- لحن خنثی
    
- بدون ادعای ناتوانی یا failure کاربر
    

`RECOVERY` توصیف نیاز محصول به سازمان‌دهی backlog است، نه توصیف شخصیت کاربر.

---

# ۱۴. Reconcile در هیچ سطحی Today را قفل نمی‌کند

قاعده:

```txt
Reconcile is non-blocking at every severity.
```

حتی در Recovery، کاربر می‌تواند وارد Today شود. فقط action lifecycle خاصی که conflict دارد ممکن است blocked باشد.

این تصمیم بسیار مهم است.

اگر کاربر برای دیدن کارهای امروز مجبور شود ابتدا ۳۰ تصمیم قدیمی را حل کند، سیستم عملاً backlog را به جریمه‌ی ورود تبدیل کرده است. روشی مؤثر برای اطمینان از اینکه کاربر دیگر هرگز اپ را باز نکند.

---

# ۱۵. Skip در هر severity

## LIGHT

- dismiss برای local day
    
- confirmation لازم نیست
    
- count discoverable باقی می‌ماند
    

## MEDIUM

- skip صریح
    
- گزینه‌ی later today یا tomorrow
    
- Today فوراً باز می‌شود
    

## RECOVERY

- باز هم skippable
    
- می‌گوید unresolved work باقی مانده
    
- review بعدی قابل انتخاب است
    
- urgency مصنوعی ایجاد نمی‌شود.
    

اصل:

```txt
presentation skipped
≠ facts reconciled
```

Skip فقط state نمایش را تغییر می‌دهد.

---

# ۱۶. Trigger timing

Eligibility می‌تواند بررسی شود:

- هنگام app open
    
- هنگام Today open
    
- بعد از occurrence cleanup
    
- بعد از execution action
    
- قبل از parent terminal action
    
- هنگام manual open Reconcile.
    

رفتار خودکار:

```txt
passive evaluation
→ maximum one automatic primary prompt per local day
```

سیستم نباید بعد از هر action، صفحه‌ی Reconcile را دوباره جلوی کاربر پرت کند. انسان یک بار پیام را می‌فهمد؛ یا حداقل محصول باید با خوش‌بینی همین فرض را داشته باشد.

---

# ۱۷. Same-day suppression

حداکثر یک primary prompt خودکار در هر local day.

این محدودیت حتی بعد از این‌ها باقی می‌ماند:

- completion
    
- skip
    
- dismissal
    
- ورود مستقیم به Today.
    

Factهای جدید فقط می‌توانند:

- badge را تغییر دهند
    
- محتوای Reconcile page را update کنند
    
- status غیرinterruptive نشان دهند
    

نه اینکه prompt را دوباره باز کنند.

---

# ۱۸. استثناهای retrigger همان روز

Presentation دوم فقط وقتی مجاز است که:

- کاربر خودش Reconcile را باز کند
    
- conflict جدید scoped ایجاد شود
    
- deadline risk واقعی ایجاد شود
    
- safety-critical execution condition پدید آید.
    

یک Task overdue معمولی جدید، retrigger اجباری را توجیه نمی‌کند.

روز بعد:

- eligibility دوباره محاسبه می‌شود
    
- suppression قبلی تمام می‌شود
    
- severity ممکن است تغییر کند
    
- item resolveشده برنمی‌گردد
    

---

# ۱۹. مرز Reconcile session

سیستم باید تفاوت این‌ها را بداند:

```txt
facts at session start
decisions made during session
facts created after boundary
```

اگر بعد از پایان session fact جدیدی ساخته شود:

```txt
newItemsSinceLastReconcile
```

می‌شود.

سیستم نباید بگوید «همه‌چیز حل شد» وقتی fact جدید بعد از snapshot ایجاد شده است.

این اصل بعداً برای transaction، API state و metric integrity حیاتی است.

---

# ۲۰. `ReconcileContext`

Context مفهومی باید شامل این‌ها باشد:

- local date و timezone
    
- زمان و boundary ارزیابی
    
- trigger reasonها
    
- severity
    
- actionable counts و age
    
- Carry و deadline risk
    
- parent spread
    
- routine patternها
    
- correctionها
    
- absence و confidence
    
- blocking conflict scope
    
- آخرین presentation، skip و completion
    
- new items
    
- presentation state.
    

presentation states:

```txt
NOT_PRESENTED
PRESENTED
DISMISSED
SKIPPED
STARTED
COMPLETED
```

این‌ها lifecycle خود Reconcile presentation هستند، نه lifecycle Taskها.

---

# ۲۱. Discussion 016A چه مشکلی را حل کرد؟

بعد از 012A و 015A، Goal، Project و Task ممکن است `reviewDate` داشته باشند.

وقتی reviewDate می‌رسد، تصمیم لازم است، اما این تصمیم execution failure نیست.

مثلاً:

```txt
Goal:
reviewDate = today

Tasks:
all current
```

کاربر فقط باید بگوید آیا Goal هنوز ادامه دارد، نه اینکه سیستم او را وارد Recovery کند.

---

# ۲۲. `REVIEW_DUE` eligibility

شرط:

```txt
entity remains ACTIVE
AND reviewDate <= currentLocalDate
AND checkpoint not already resolved or deferred
```

برای:

- Goal
    
- Project
    
- Task.
    

Routine review همچنان بر recurrence و observed mismatch مبتنی است، نه generic reviewDate.

---

# ۲۳. Review due execution backlog نیست

تفکیک:

```txt
reviewDueCount
≠ unresolvedExecutionTaskCount
```

Review itemها نباید در thresholdهای Light، Medium یا Recovery مربوط به execution backlog وارد شوند.

مثال:

```txt
10 REVIEW_DUE
0 overdue Tasks
→ Reconcile eligible
→ not automatic Medium or Recovery
```

و:

```txt
1 review-due Goal
8 overdue Tasks
→ execution severity may be Recovery
→ Goal remains in separate lane
```

---

# ۲۴. دو lane در Reconcile

```txt
Reconcile
├── Execution decisions
│   ├── overdue Tasks
│   ├── repeated Carry
│   └── bounded Routine evidence
│
└── Commitment reviews
    ├── Goal continuation
    ├── Project checkpoint
    └── Backlog Task checkpoint
```

این تفکیک باید در UX واضح باشد.

کاربر نباید Goal review را به‌عنوان «کار انجام‌نشده» ببیند.

---

# ۲۵. Grouping و chunking checkpointها

System defaultها ممکن است باعث شوند چند reviewDate هم‌زمان برسند.

قاعده:

```txt
multiple REVIEW_DUE
→ group by entity type and stable ownership
→ limited chunks
→ no separate prompt per entity
```

رفتار پیشنهادی:

- target/deadline نزدیک‌تر اول
    
- grouping بر اساس Goal و Project
    
- summary count قبل از expand
    
- پردازش chunk محدود
    
- امکان ادامه‌ی Today
    
- بقیه discoverable باقی بمانند
    

exact chunk size به UX و validation واگذار شده است.

---

# ۲۶. Review checkpoint prompt جدا نمی‌سازد

سیاست یک primary prompt در هر local day همچنان برقرار است.

اگر checkpoint دیگری بعداً همان روز due شود:

- badge update
    
- indicator غیرinterruptive
    
- manual open
    
- یا conflict-specific flow
    

مجاز است، ولی general prompt دوم نه.

Goal Continuation Check علاوه بر این suppression، cadence اختصاصی per-Goal دارد که در 017 تعریف می‌شود.

---

# ۲۷. Absence و Goal intent

Absence حق ندارد مستقیماً نتیجه بگیرد Goal دیگر مهم نیست.

مدل درست:

```txt
absence or stale execution
→ may schedule a deterministic future checkpoint

checkpoint reached
→ explicit bounded user decision
```

مدل نادرست:

```txt
user absent for 20 days
→ probably abandoned Goal
```

Intent باید از پاسخ صریح کاربر بیاید، نه از سکوت.

---

# ۲۸. reason codeها و deduplication

یک entity ممکن است هم‌زمان چند reason داشته باشد:

```txt
EXECUTION_OVERDUE
REVIEW_DUE
REPEATED_CARRY
DEADLINE_RISK
STRUCTURAL_CONFLICT
```

اما باید فقط یک بار در resolution group coherent نمایش داده شود و تمام reasonها حفظ شوند.

مثلاً یک Task:

- overdue است
    
- review آن رسیده
    
- deadline risk دارد
    

نباید در سه بخش به سه Task متفاوت تبدیل شود.

## استفاده‌ی reasonها

- deadline ممکن است actionها را محدود کند
    
- execution severity فقط از execution reasonها می‌آید
    
- ordering review می‌تواند target proximity را ببیند
    
- structural conflict flag جدا باقی می‌ماند
    

---

# ۲۹. action familyهای review lane

016A فقط presentation را تعریف می‌کند، ولی action familyهای مورد انتظار را به 017 می‌دهد:

```txt
Goal:
CONTINUE
REVIEW_LATER
ABANDON_GOAL
```

```txt
Project:
KEEP_WITH_NEW_REVIEW_DATE
ADJUST_CHILD_EXECUTION
COMPLETE
STOP
```

```txt
Backlog Task:
SCHEDULE
KEEP_IN_BACKLOG_WITH_NEW_REVIEW_DATE
DROP
```

actionهای lifecycle همچنان تأیید کاربر و cascadeهای 015 را می‌خواهند.

---

# ۳۰. اثر Discussion 016 و 016A روی مپ

این خانواده روی بخش‌های زیر اثر مستقیم دارد:

```txt
MVP Core Loop
Reconcile User Flow
Execution Flow
AI Responsibilities
AI Guardrails
Traction Metrics
Data Events / Context
Current Decisions
Open Configuration
```

---

## A. MVP Core Loop

اثر اصلی:

```txt
execution evidence
→ deterministic cleanup
→ eligibility
→ severity
→ separate lanes
→ optional review
→ explicit decision
→ confirmed mutation
```

مپ فعلی Reconcile را بعد از execution evidence و قبل از authority confirmation قرار داده است.

همچنین Today از Reconcile جدا و قابل‌دسترسی باقی می‌ماند.

### نتیجه

```txt
MVP Core Loop → ACCEPTED
```

---

## B. Reconcile Flow

مپ فعلی صریحاً این مسیر را دارد:

```txt
derive facts
→ clean / deduplicate
→ calculate Light / Medium / Recovery
→ separate execution and commitment-review lanes
→ optional AI
→ confirmation
→ deterministic mutation
```

این تقریباً projection مستقیم 016 و 016A است.

نکات درست منتقل‌شده:

- cleanup قبل از severity
    
- laneهای جدا
    
- severity deterministic
    
- AI بعد از facts
    
- Today non-blocking
    
- confirmation پیش از mutation
    

### نتیجه

```txt
Reconcile Flow → ACCEPTED
```

---

## C. Execution Flow

اثر غیرمستقیم:

- overdue از execution تولید می‌شود
    
- review due از temporal checkpoint
    
- Today فقط execution باقی می‌ماند
    
- Reconcile این دو را جدا دریافت می‌کند
    

مپ Execution نیز Today و unresolved work را از هم جدا می‌کند.

### نتیجه

```txt
Execution-to-Reconcile boundary → ACCEPTED
```

---

## D. AI Responsibilities

AI نباید eligibility یا severity را آزادانه حدس بزند.

سیستم deterministic باید اول مشخص کند:

- factها چیستند
    
- کدام actionable هستند
    
- severity چیست
    
- reason codeها چیست
    
- actionهای مجاز چیست
    

بعد AI می‌تواند:

- خلاصه کند
    
- گروه‌بندی را توضیح دهد
    
- priority را قابل‌فهم کند
    
- recommendation bounded بدهد
    

### نتیجه

```txt
AI Responsibilities → ACCEPTED
```

---

## E. AI Guardrails

Guardrailهای مهم:

```txt
no diagnosis from severity
no absence-based capacity inference
no raw Missed-count inflation
no review-due inflation
no Today blocking
no repeated same-day prompting
no duplicate entity presentation
no urgency without real risk
```

مپ فعلی:

- deterministic facts before AI
    
- no hidden cause inference
    
- Today accessible
    
- review lane جدا
    
- neutral framing
    

را حفظ کرده است.

### نتیجه

```txt
AI Guardrails → ACCEPTED
```

---

## F. Metrics

016A metricهای مهمی اضافه می‌کند:

- checkpoint due per session
    
- groupهای بازشده
    
- resolved/deferred count
    
- درصد sessionهایی که Today ادامه پیدا کرده
    
- repeated same-day prompt rate
    
- burst size cohortها
    

guardrail metrics:

```txt
review item counted as execution backlog → expected zero
review-only Recovery → expected zero
prompt per entity → expected zero
Goal prompt inside suppression window → expected zero
```

مپ metrics این‌ها را در سطح hard gate و trust/regret نگه می‌دارد؛ metricهای جزئی باید در validation spec باشند.

### نتیجه

```txt
Metrics impact → ACCEPTED
```

---

## G. Data و Context

ReconcileContext باید snapshot و reason codeها را نگه دارد تا:

- severity بازتولیدپذیر باشد
    
- session boundary روشن باشد
    
- same-day suppression قابل‌اعتماد باشد
    
- item جدید از item قبلی جدا شود
    
- review و execution deduplicate شوند
    

مپ Data Events و Runtime این dependency را دارد، هرچند fieldها در node سطح بالا فهرست نشده‌اند.

### نتیجه

```txt
Data/context impact → ACCEPTED
```

---

## H. Current Decisions

تصمیم‌های بسته‌شده:

- eligibility با severity فرق دارد
    
- conflict scoped با severity فرق دارد
    
- severity deterministic است
    
- Light، Medium و Recovery بر actionable backlog متکی‌اند
    
- age بدون breadth Recovery نمی‌سازد
    
- absence trigger نیست
    
- Today همیشه باز است
    
- prompt خودکار حداکثر روزی یک‌بار
    
- skip resolution نیست
    
- REVIEW_DUE lane جدا دارد
    
- review burst group و chunk می‌شود
    
- entity چندreason فقط یک‌بار نمایش داده می‌شود
    

### نتیجه

```txt
Current Decisions → ACCEPTED
```

---

## I. Open Configuration

چیزهای باقی‌مانده سؤال product semantics نیستند:

- exact chunk size
    
- copy دقیق bannerها
    
- visual prominence
    
- reminder UX
    
- badge behavior
    
- exact deadline-risk rules
    
- storage context
    
- per-Goal cadence exact value
    

این‌ها UX، validation یا implementation config هستند.

### نتیجه

```txt
Open configuration classification → ACCEPTED
```

---

# ۳۱. سناریوهای تست

## سناریو ۱: یک Task از دیروز

```txt
1 actionable item
age = 1 day
```

نتیجه:

```txt
eligible = true
severity = LIGHT
Today accessible
dismiss suppresses prompt today
```

---

## سناریو ۲: یک Task نه‌روزه

```txt
1 actionable item
age = 9 days
```

نتیجه:

```txt
MEDIUM
not RECOVERY
```

چون breadth وجود ندارد.

---

## سناریو ۳: سه Task نه‌روزه

```txt
3 actionable items
oldest = 9 days
```

نتیجه:

```txt
RECOVERY may apply
```

چون age و breadth با هم وجود دارند.

---

## سناریو ۴: غیبت یک‌ماهه بدون backlog

نتیجه:

```txt
no Reconcile
neutral welcome-back possible
no capacity inference
```

---

## سناریو ۵: غیبت یک‌ماهه با ۱۰ Task قدیمی

نتیجه:

```txt
eligible
likely RECOVERY
severity from backlog
absence lowers confidence
Today remains accessible
```

---

## سناریو ۶: ۲۰ occurrence reconstructشده

```txt
20 MISSED
0 actionable decisions
```

نتیجه:

```txt
no 20-item backlog
possibly summarized pattern later
```

---

## سناریو ۷: Carry دوم

```txt
same Task carried twice
```

نتیجه:

```txt
repeated-Carry signal
eligible
LIGHT or MEDIUM
not automatic Recovery
```

---

## سناریو ۸: Complete Project با child فعال

نتیجه:

```txt
blockingConflict = true
scope = PROJECT_COMPLETION
severity independent
Today accessible
```

---

## سناریو ۹: ده Goal review هم‌زمان

```txt
10 REVIEW_DUE
0 overdue execution
```

نتیجه:

```txt
Reconcile eligible
commitment-review lane
grouped and chunked
not Recovery
one general prompt only
```

---

## سناریو ۱۰: Task با سه reason

```txt
EXECUTION_OVERDUE
REVIEW_DUE
DEADLINE_RISK
```

نتیجه:

- یک Task نمایش داده می‌شود
    
- هر سه reason حفظ می‌شوند
    
- severity از execution inputها می‌آید
    
- deadline actionها را محدود می‌کند
    

---

# ۳۲. آیا تعارضی پیدا شد؟

## با Discussion 015

سازگار است:

- overdue derived است
    
- Missed raw debt نیست
    
- Carry دوم evidence است
    
- absence uncertainty است
    
- parent conflict scoped است
    

## با 012A و 015A

سازگار است:

- REVIEW_DUE eligibility دارد
    
- Today entry ایجاد نمی‌کند
    
- reviewDate execution failure نیست
    
- review reason از execution count جداست
    

## با Discussion 017

مرزها درست واگذار شده‌اند:

- 016 می‌گوید چه چیزی و با چه شدتی ظاهر شود
    
- 017 می‌گوید چگونه توضیح، group و resolve شود
    

## با مپ

مپ تصمیم‌های اصلی را دقیق منتقل کرده:

- deterministic cleanup
    
- Light/Medium/Recovery
    
- separate lanes
    
- non-blocking Today
    
- AI بعد از facts
    
- explicit confirmation
    

هیچ تعارض یا omission blocking پیدا نشد.

---

# جمع‌بندی وضعیت مپ

```txt
Eligibility distinct from severity           ACCEPTED
Blocking conflict distinct from severity     ACCEPTED
Actionable facts only                        ACCEPTED
Cleanup before severity                      ACCEPTED
Raw MISSED does not inflate backlog          ACCEPTED
LIGHT rules                                  ACCEPTED
MEDIUM rules                                 ACCEPTED
RECOVERY requires breadth                    ACCEPTED
Old age alone not Recovery                   ACCEPTED
Repeated Carry signal                        ACCEPTED
Absence affects confidence only              ACCEPTED
Today always accessible                      ACCEPTED
Skip is not resolution                       ACCEPTED
One primary prompt per local day              ACCEPTED
Scoped same-day exceptions                   ACCEPTED
Session boundary and new items               ACCEPTED
REVIEW_DUE eligibility                       ACCEPTED
Separate commitment-review lane              ACCEPTED
Review bursts grouped and chunked            ACCEPTED
Reason-code deduplication                     ACCEPTED
Review-only session not Recovery             ACCEPTED
```

# تعریف یک‌جمله‌ای Discussion 016

```txt
Reconcile فقط برای factهای حل‌نشده‌ای فعال می‌شود که واقعاً تصمیم می‌خواهند؛
شدت آن از backlog پاک‌سازی‌شده و deterministic محاسبه می‌شود،
هیچ سطحی Today را قفل نمی‌کند،
و absence یا تعداد خام Missedها به‌تنهایی بحران نمی‌سازند.
```

# تعریف یک‌جمله‌ای Discussion 016A

```txt
رسیدن reviewDate می‌تواند نیاز به تصمیم ایجاد کند،
اما execution failure نیست؛
Goal، Project و Backlog Taskهای review-due در lane جدا،
به‌صورت گروه‌بندی‌شده و بدون promptهای تکراری نمایش داده می‌شوند.
```

## نتیجه نهایی

```txt
Discussion 016       ACCEPTED
Discussion 016A      ACCEPTED
Map projection       ACCEPTED
Product conflict     NONE
Blocking omission    NONE
Required change      NONE
```

مرحله‌ی بعد **Discussion 017 و amendmentهای آن** است: AI داخل Reconcile دقیقاً چه چیزی را می‌بیند، چگونه itemها را group می‌کند، چه recommendationهایی مجازند، protected action چیست، Goal Continuation Check چگونه کار می‌کند و کدام تصمیم‌ها حتماً باید به‌صورت دستی تأیید شوند.