# مرور Discussion 012 و 012A

## مدل هسته‌ی محصول و قانون دیده‌شدن تعهدها در زمان

این خانواده‌ی تصمیم پاسخ دو سؤال بنیادی را می‌دهد:

```txt
چه موجودیت‌هایی واقعاً در محصول وجود دارند؟
و چگونه مطمئن می‌شویم یک موجودیت فعال برای همیشه از دید سیستم ناپدید نمی‌شود؟
```

Discussion 012 مدل مفهومی را تعریف می‌کند.  
Discussion 012A یک نقص مهم آن را اصلاح می‌کند: مدل قبلی می‌گفت چه چیزی فعال است، اما لزوماً نمی‌گفت **چه زمانی دوباره باید دیده شود**.

---

# ۱. مسئله‌ی Discussion 012 چه بود؟

بعد از تثبیت MVP مبتنی بر AI، هنوز معلوم نبود خروجی Planning دقیقاً باید به چه چیزهایی تبدیل شود.

ابهام‌های اصلی:

- آیا فقط Goal و Task داریم؟
    
- Project چه زمانی لازم است؟
    
- Routine یک Task تکرارشونده است یا مفهوم جدا؟
    
- آیا هر Task باید داخل Project باشد؟
    
- آیا هر Project باید Goal داشته باشد؟
    
- آیا `Plan` باید به‌عنوان موجودیت ذخیره شود؟
    
- آیا تکمیل کارها یعنی Goal محقق شده؟
    
- یک Routine متعلق به Project بعد از پایان Project چه می‌شود؟
    

Discussion 012 عمداً فقط **اسم‌ها، مرزها، رابطه‌ها و معنای lifecycle** را تعیین کرد؛ نه دیتابیس، API، scheduling یا جزئیات Reconcile.

---

# ۲. تصمیم اصلی: پنج مفهوم canonical

مدل محصول پنج مفهوم اصلی دارد:

```txt
Goal
Project
Task
Routine
RoutineOccurrence
```

ساختار کلی:

```txt
Goal
├── Project
│   ├── Task
│   └── Routine
├── direct Task
└── direct Routine

Standalone:
Project
Task
Routine
```

هیچ موجودیت persisted به نام `Plan` وجود ندارد. «Plan» می‌تواند واژه‌ی UX یا پیشنهاد موقت AI باشد، اما پس از تأیید، محتوا به موجودیت‌های واقعی تبدیل می‌شود.

این تصمیم جلوی یک مشکل معماری را می‌گیرد:

```txt
PlanningDraft
→ Plan row
→ Goal / Project / Task / Routine rows
```

چنین ساختاری دو منبع حقیقت می‌ساخت. بعد باید تصمیم می‌گرفتیم تغییر Task، Plan را هم تغییر دهد یا نه، و تمدن دوباره وارد عصر همگام‌سازی دستی می‌شد.

---

# ۳. Goal چیست؟

Goal یک **نتیجه، جهت یا وضعیت مطلوب** است، نه صرفاً ظرفی برای Taskها.

نمونه:

- رسیدن به B2 انگلیسی
    
- پیدا کردن شغل فرانت‌اند
    
- بهبود آمادگی جسمانی
    
- ساخت محصول شخصی پایدار
    

اصل مهم:

```txt
Tasks completed
+ Routines followed
+ Projects completed
≠ Goal automatically achieved
```

سیستم execution را می‌بیند، اما تحقق واقعی نتیجه را کاربر تأیید می‌کند.

Lifecycle سطح بالا:

```txt
ACTIVE → ACHIEVED | ABANDONED
```

- `ACHIEVED`: کاربر تأیید می‌کند نتیجه حاصل شده.
    
- `ABANDONED`: دیگر قصد ادامه ندارد.
    

## معنای محصولی

این تصمیم از ادعاهای دروغین جلوگیری می‌کند. مثلاً انجام ۳۰ جلسه تمرین زبان، واقعیتی معتبر است؛ اما اثبات نمی‌کند کاربر B2 شده است.

---

# ۴. Project چیست؟

Project یک تلاش محدود یا مستقلاً قابل‌مدیریت است.

نمونه:

- ساخت Portfolio
    
- آماده‌شدن برای مصاحبه
    
- تکمیل یک دوره‌ی زبان
    
- اسباب‌کشی
    

Project نباید فقط برای اینکه ساختار «حرفه‌ای» به‌نظر برسد دور یک Task پیچیده شود.

Project می‌تواند:

- متعلق به یک Goal باشد
    
- standalone باشد
    

و شامل چند Task و Routine شود.

## قانون Routine متعلق به Project

Routine متعلق به Project فقط برای همان Project معنا دارد و بین Projectها share نمی‌شود.

وقتی Project کامل شود:

```txt
Project ACTIVE → COMPLETED
→ active Project-owned Routines become STOPPED
```

نیازی به تأیید اضافه نیست، چون ownership از قبل این پیامد را تعریف کرده است. occurrenceهای تاریخی دست‌نخورده می‌مانند.

این تصمیم منطقی است. مثلاً Routine «هر روز feedbackهای onboarding را بررسی کن» بعد از پایان پروژه‌ی onboarding نباید مثل روح سرگردان تا ابد در Today ظاهر شود.

---

# ۵. Task چیست؟

Task یک کار actionable، غیرتکراری و منفرد است.

می‌تواند:

- مستقیماً متعلق به یک Goal باشد
    
- متعلق به یک Project باشد
    
- standalone باشد
    

اما نمی‌تواند هم‌زمان متعلق به Goal و Project باشد. اگر داخل Project باشد، context هدف را از Project می‌گیرد.

## Carry status نیست

```txt
Task remains ACTIVE
→ planned placement changes
```

Carry یک action یا transition است، نه وضعیت دائمی Task.

Lifecycle:

```txt
ACTIVE → COMPLETED | DROPPED
```

## موارد عمداً حذف‌شده

Task در MVP ندارد:

- dependency graph
    
- generic persisted `order`
    

ترتیب پیشنهادی می‌تواند در AI draft باشد، ولی property canonical Task نیست.

---

# ۶. Routine چیست؟

Routine تعریف یک رفتار تکرارشونده است، نه Taskی که کپی می‌شود.

می‌تواند:

- متعلق به Goal باشد
    
- متعلق به Project باشد
    
- standalone باشد
    

ولی فقط یکی از آن‌ها، نه چند owner هم‌زمان.

معنا:

- **Goal-owned:** در سطح گسترده‌تر از یک Project پشتیبانی می‌کند.
    
- **Project-owned:** مخصوص همان Project است.
    
- **Standalone:** هیچ parentی ندارد.
    

Lifecycle اولیه:

```txt
ACTIVE → STOPPED
```

Pause و Resume در این Discussion تصمیم‌گیری نشده‌اند.

---

# ۷. RoutineOccurrence چیست؟

RoutineOccurrence یک اجرای زمان‌مند از Routine در یک تاریخ مشخص است.

```txt
Routine
→ recurrence
→ RoutineOccurrence for a date
```

هر occurrence دقیقاً متعلق به یک Routine است.

Lifecycle:

```txt
PENDING → DONE | MISSED
```

یک occurrence ازدست‌رفته Carry نمی‌شود و به بدهی انباشته تبدیل نمی‌شود.

این تمایز یکی از مهم‌ترین تصمیم‌های مدل است:

```txt
Task = commitment that may be moved
RoutineOccurrence = historical opportunity for a recurring behavior
```

اگر occurrenceهای از‌دست‌رفته Carry شوند، یک هفته ورزش‌نکردن می‌تواند هفت کارت ورزش برای فردا بسازد. محصول به‌جای planner تبدیل می‌شود به کارخانه‌ی تولید احساس گناه، بازاری که ظاهراً از قبل هم اشباع است.

---

# ۸. قانون ownership

روابط پذیرفته‌شده:

```txt
Goal 1 ── 0..* Project
Goal 1 ── 0..* direct Task
Goal 1 ── 0..* direct Routine

Project 1 ── 0..* Task
Project 1 ── 0..* Routine

Routine 1 ── 0..* RoutineOccurrence
```

و موجودیت‌های standalone معتبرند.

## Exclusive-parent invariant

```txt
Task belongs to at most one of:
Goal, Project

Routine belongs to at most one of:
Goal, Project
```

روابط ممنوع:

- Task همزمان به Goal و Project
    
- Routine همزمان به Goal و Project
    
- چند Goal یا Project برای یک Task/Routine
    
- dependency بین Taskها.
    

## دلیل این تصمیم

اگر Task داخل Projectی باشد که متعلق به Goal است، دوباره ذخیره‌کردن `goalId` روی Task یک رابطه‌ی تکراری و قابل‌تناقض می‌سازد:

```txt
Task.project.goalId = A
Task.goalId = B
```

بعد سیستم باید تصمیم بگیرد کدام واقعیت معتبر است. پاسخ درست این است که اصلاً چنین حالت باشکوهی تولید نشود.

---

# ۹. مسئله‌ای که Discussion 012 حل نکرده بود

مدل 012 اجازه می‌داد این موجودیت‌ها ACTIVE باشند:

- Goal بدون تاریخ
    
- Project بدون تاریخ
    
- Task بدون برنامه
    
- Task در Backlog
    

اما سؤال مهم باقی می‌ماند:

> چه چیزی تضمین می‌کند این تعهد فعال دوباره در آینده دیده شود؟

یک Task می‌توانست technically active باشد، ولی نه در Today باشد، نه overdue، نه review شود. یعنی در دیتابیس زنده و در زندگی مرده.

Discussion 012A دقیقاً برای حل این نقص باز شد.

---

# ۱۰. تصمیم اصلی Discussion 012A

اصل مرکزی:

```txt
No ACTIVE entity may become temporally invisible.
```

هر موجودیت canonical فعال باید یک checkpoint زمانی آینده‌ی قابل‌استخراج داشته باشد.

mapping مفهومی:

```txt
Goal
→ targetDate and/or reviewDate

Project
→ targetDate and/or reviewDate

Task
→ plannedDate and/or reviewDate

Routine
→ next occurrence derived from recurrence
```

## checkpoint الزاماً deadline نیست

ممکن است معنی‌اش این باشد:

- Task را در یک روز اجرا کن
    
- Goal یا Project را دوباره بررسی کن
    
- به target date برس
    
- occurrence بعدی Routine را بساز
    

پس temporal visibility برابر scheduled execution نیست.

---

# ۱۱. قوانین زمانی Goal

فیلدهای مفهومی:

```txt
targetDate?
reviewDate
```

- targetDate اختیاری است.
    
- Goal فعال باید reviewDate داشته باشد.
    
- اگر کاربر وارد نکند، سیستم deterministic default می‌دهد.
    
- صرفاً برای گرفتن reviewDate سؤال جدید mandatory پرسیده نمی‌شود.
    
- default باید قابل‌دیدن و ویرایش باشد.
    

policy اولیه:

```txt
baseGoalReviewDate = createdLocalDate + 90 days

Goal.reviewDate =
  if targetDate exists:
    min(baseGoalReviewDate, targetDate)
  else:
    baseGoalReviewDate
```

یعنی سیستم اجازه نمی‌دهد target زودتر از اولین review برسد.

---

# ۱۲. قوانین زمانی Project

Project فعال باید حداقل یکی از این‌ها را داشته باشد:

```txt
targetDate != null
OR
reviewDate != null
```

default اولیه:

```txt
baseProjectReviewDate = createdLocalDate + 30 days

Project.reviewDate =
  if targetDate exists:
    min(baseProjectReviewDate, targetDate)
  else:
    baseProjectReviewDate
```

---

# ۱۳. قوانین زمانی Task

Task می‌تواند داشته باشد:

```txt
plannedDate?
reviewDate?
deadline?
```

اما Task فعال باید حداقل یکی از این دو را داشته باشد:

```txt
plannedDate != null
OR
reviewDate != null
```

پس Task بدون زمان اجرای مشخص همچنان معتبر است، به شرط اینکه زمان review داشته باشد.

مثال:

```txt
plannedDate = null
reviewDate = 2026-08-15
→ valid ACTIVE Task
```

deadline نیز generated reviewDate را محدود می‌کند:

```txt
reviewDate = min(policyReviewDate, deadline)
```

---

# ۱۴. قانون زمانی Routine

Routine فعال زمانی دیده‌شده محسوب می‌شود که:

```txt
ACTIVE Routine
→ valid recurrence
→ derivable next occurrence
```

بنابراین صرفاً برای رعایت invariant نیازی نیست reviewDate جداگانه داشته باشد.

این تصمیم از ایجاد فیلدهای زائد جلوگیری می‌کند. recurrence خودش checkpoint بعدی را می‌سازد.

---

# ۱۵. Backlog چه معنایی دارد؟

Backlog همچنان placement معتبر است:

```txt
not scheduled for execution now
```

اما معنایش این نیست:

```txt
forgotten forever
```

Taskهای Backlog نیز باید review checkpoint آینده داشته باشند. `reviewDate` جای Backlog را نمی‌گیرد؛ تضمین می‌کند Backlog دوباره بررسی شود.

این distinction بسیار سالم است:

```txt
Backlog = deliberate deferral
not temporal disappearance
```

---

# ۱۶. `nextTemporalCheckpoint` derived است

این مقدار source of truth قابل‌ویرایش جدید نیست.

```txt
Task.nextTemporalCheckpoint
= earliest(plannedDate, reviewDate)

Project.nextTemporalCheckpoint
= earliest(targetDate, reviewDate)

Goal.nextTemporalCheckpoint
= earliest(targetDate, reviewDate)

Routine.nextTemporalCheckpoint
= next occurrence from recurrence
```

دلایل:

- جلوگیری از duplicate date truth
    
- جلوگیری از synchronization bug
    
- query deterministic
    
- حفظ source-of-truth واحد
    

---

# ۱۷. `REVIEW_DUE` با `EXECUTION_OVERDUE` فرق دارد

Execution overdue:

```txt
Task.plannedDate < currentLocalDate
AND Task remains ACTIVE
```

Review due:

```txt
entity.reviewDate <= currentLocalDate
AND entity remains ACTIVE
```

`REVIEW_DUE` نمی‌گوید کاربر شکست خورده یا Task عقب افتاده؛ فقط می‌گوید زمان بررسی commitment رسیده است.

قانون severity:

```txt
multiple REVIEW_DUE items
+ no overdue execution
≠ automatic MEDIUM or RECOVERY
```

و باید جداگانه group و chunk شوند.

این تصمیم اهمیت UX زیادی دارد. ده Goal که reviewDate یکسان دارند نباید به سیستم اجازه دهند با چهره‌ای جدی اعلام کند «وضعیت بازیابی بحرانی است».

---

# ۱۸. Goal Continuation Check

وقتی review Goal برسد، سیستم می‌تواند تصمیم deterministic زیر را نمایش دهد:

```txt
CONTINUE
REVIEW_LATER
ABANDON_GOAL
```

با wording خنثی:

> آیا هنوز می‌خواهی این هدف را ادامه بدهی؟

این سؤال:

- علت تغییر را نمی‌پرسد
    
- motivation یا emotion را حدس نمی‌زند
    
- capacity آینده را نمی‌پرسد
    
- از غیبت، intent استنتاج نمی‌کند
    
- فقط intent فعلی را ثبت می‌کند.
    

---

# ۱۹. اثر Discussion 012 روی مپ

## A. Data Model / Domain Concepts

بخش اصلی اثر 012 همین‌جاست.

مپ فعلی این موارد را دارد:

```txt
Goal
Project
Task
Routine
RoutineOccurrence

No canonical Plan
Exclusive ownership
Activity never proves Goal achievement
Terminal parent actions resolve children explicitly
```

### ارزیابی

موارد اصلی درست منتقل شده‌اند:

- پنج مفهوم
    
- نبود canonical Plan
    
- exclusive-parent
    
- جدایی execution از outcome
    

`Terminal parent actions resolve children explicitly` از Discussionهای بعدی آمده و با 012 سازگار است.

### نتیجه

```txt
Product Model → ACCEPTED
```

---

## B. Product Vision

اثر 012 روی Vision مستقیم ولی مختصر است:

```txt
محصول execution را ثبت می‌کند
اما outcome واقعی را جعل نمی‌کند
```

مپ فعلی در Vision و guardrailها این تفکیک را حفظ کرده است.

### نتیجه

```txt
Goal outcome boundary → ACCEPTED
```

---

## C. Planning Flow

Planning باید بتواند بسته به نیاز واقعی پیشنهاد دهد:

```txt
Goal
Project
Task
Routine
```

و مجبور نیست برای هر Task یک Project مصنوعی یا برای هر Project یک Goal جعلی بسازد.

همچنین PlanningDraft موقت است؛ approval آن موجودیت‌ها را می‌سازد، نه یک `Plan` canonical.

مپ فعلی Planning را به draft موقت و commit موجودیت‌های canonical متصل کرده است.

### نتیجه

```txt
Planning impact → ACCEPTED
```

---

## D. Execution Flow

اثر اصلی:

```txt
Task ≠ RoutineOccurrence
```

Task می‌تواند Carry شود، ولی occurrence فقط Done یا Missed می‌شود.

مپ فعلی این تمایز را صریحاً دارد:

```txt
Carry is explicit for Tasks
RoutineOccurrence is Done or Missed
Occurrence is never Carried
```

### نتیجه

```txt
Execution impact → ACCEPTED
```

---

## E. Reconcile Flow

Reconcile باید تفاوت‌های مدل را حفظ کند:

- overdue Task قابل reschedule یا drop است
    
- missed occurrence بدهی carryشونده نیست
    
- Goal achievement از activity استنتاج نمی‌شود
    
- Project completion ممکن است Routineهای خودش را stop کند
    

این‌ها در nodeهای Reconcile، execution و authority پراکنده شده‌اند و جهت کلی درست است.

### نتیجه

```txt
Reconcile model impact → ACCEPTED
```

---

## F. AI Responsibilities

AI می‌تواند hierarchy پیشنهاد دهد، ولی نباید hierarchy مصنوعی بسازد.

همچنین نمی‌تواند از completion فعالیت‌ها نتیجه بگیرد Goal محقق شده است.

این موضوع در مپ با این guardrail دیده می‌شود:

```txt
AI may not create facts
AI may not infer Goal achievement
```

### نتیجه

```txt
AI model boundary → ACCEPTED
```

---

## G. Current Decisions / Removed Scope

مپ فعلی موارد زیر را حذف‌شده نشان می‌دهد:

- canonical Plan
    
- old Goal/Task-only simplification
    
- direct AI mutation
    
- رفتارهای قدیمی Reconcile-only
    

همچنین تصمیم inventory به مدل رسمی authority می‌دهد.

### نتیجه

```txt
Current Decisions impact → ACCEPTED
```

---

# ۲۰. اثر Discussion 012A روی مپ

این بخش پراکنده‌تر است و فقط در Product Model خلاصه نمی‌شود.

---

## A. Product Vision

012A می‌گوید تعهد فعال نباید ناپدید شود.

در Vision مطلوب باید این معنا وجود داشته باشد:

```txt
Adaptive planning does not merely store commitments.
It ensures every active commitment returns at a meaningful boundary.
```

مپ فعلی روی Plan، Execute و Adapt تمرکز دارد، اما اصل **temporal invisibility** در متن سطح بالای Vision برجسته نیست.

بااین‌حال این تصمیم در بخش‌های دیگر مپ پوشش داده شده و کاربر هم گفته در این مرور فعلاً تغییر لازم نیست.

### نتیجه

```txt
Vision temporal principle → PRESENT INDIRECTLY
No amendment required by current review decision
```

---

## B. MVP Core Loop

اثر 012A باید اینجا دیده شود:

```txt
Create ACTIVE entity
→ explicit checkpoint or deterministic default
→ derive nextTemporalCheckpoint
→ surface at execution or review boundary
```

Core Loop فعلی PlanningDraft، commit، Today و Reconcile را دارد؛ checkpoint mechanism را جزئی نشان نمی‌دهد.

این قابل‌قبول است چون Core Loop قرار است سطح بالا باشد، نه specification تاریخ‌ها.

### نتیجه

```txt
Core Loop temporal detail → ACCEPTED AS ABSTRACTED
```

---

## C. Planning Flow

Planning باید:

- checkpoint کاربر را بپذیرد
    
- در صورت نبود، default deterministic بدهد
    
- صرفاً برای reviewDate سؤال اجباری نسازد
    
- default را visible و editable نمایش دهد
    
- approval را فقط وقتی بپذیرد که temporal visibility معتبر باشد
    

012A این follow-up را صریحاً برای Discussion 014 الزامی کرده است.

مپ فعلی Planning Flow به bounded clarification و visible editable draft اشاره می‌کند، اما policy تاریخ‌ها را در متن خلاصه نکرده است.

### نتیجه

```txt
Planning checkpoint behavior → COVERED BY DOWNSTREAM SPECS
Map abstraction acceptable
```

---

## D. Execution Flow

اثر واضح:

- Today بر اساس `plannedDate = current local date`
    
- Backlog بدون plannedDate معتبر است
    
- reviewDate آن را دوباره visible می‌کند
    
- deadline، plannedDate و reviewDate یک مفهوم نیستند
    

مپ فعلی Today و Backlog را پوشش می‌دهد، ولی تفکیک تمام date semantics احتمالاً در runtime/data specs نگهداری شده است.

### نتیجه

```txt
Execution temporal semantics → ACCEPTED
Primary detail authority → 015 / 019 / 020
```

---

## E. Reconcile Flow

این مهم‌ترین اثر 012A روی مپ است.

Reconcile باید دو lane جدا داشته باشد:

```txt
Execution lane:
overdue Tasks / missed occurrences

Commitment-review lane:
Goals / Projects / Tasks whose reviewDate arrived
```

مپ فعلی صریحاً می‌گوید:

```txt
separate execution and commitment-review lanes
```

و severity نیز از facts deterministic محاسبه می‌شود.

این دقیقاً تصمیم 012A را منتقل کرده است.

### نتیجه

```txt
Review due vs overdue separation → ACCEPTED
```

---

## F. AI Responsibilities

قواعد مورد انتظار:

- AI تاریخ checkpoint را از روان‌شناسی حدس نمی‌زند.
    
- defaultها policy deterministic هستند.
    
- AI می‌تواند default را توضیح دهد.
    
- برای گرفتن default نیاز نیست سؤال اضافه بپرسد.
    

مپ فعلی AI را از facts و policy deterministic جدا می‌کند، هرچند checkpoint به‌طور خاص نام برده نشده است.

### نتیجه

```txt
AI checkpoint responsibility → ACCEPTED BY GENERAL BOUNDARY
```

---

## G. AI Guardrails

Guardrailهای 012A:

```txt
no ACTIVE entity without checkpoint
no mandatory question solely for reviewDate
no conflation of review due and overdue
no editable duplicate nextTemporalCheckpoint
no generated review after earlier target/deadline
```

مپ فعلی guardrailهای کلان را دارد، اما همه‌ی این پنج مورد را در یک node نمایش نمی‌دهد.

این تصمیم‌ها بیشتر implementation invariant هستند تا message سطح بالای مپ.

### نتیجه

```txt
Temporal guardrails → PARTIALLY EXPLICIT, FULLY DELEGATED TO SPECS
No blocking map issue
```

---

## H. Data Model

012A به مدل تاریخ‌ها اضافه می‌کند:

```txt
Goal:
targetDate?
reviewDate

Project:
targetDate?
reviewDate?

Task:
plannedDate?
reviewDate?
deadline?

Routine:
recurrence → next occurrence
```

و `nextTemporalCheckpoint` باید derived باشد.

مپ فعلی Product Model بیشتر entity relationship را نمایش می‌دهد و field-level date model را نشان نمی‌دهد.

برای mind map سطح محصول این قابل‌قبول است، به شرط اینکه formal data specification آن را داشته باشد.

### نتیجه

```txt
Temporal field model → FORMAL-SPEC CONCERN
Mind Map omission acceptable
```

---

## I. Events و Metrics

012A event candidateهایی پیشنهاد کرده:

```txt
TEMPORAL_CHECKPOINT_DEFAULTED
TEMPORAL_CHECKPOINT_CHANGED
TEMPORAL_CHECKPOINT_REACHED
ENTITY_REVIEW_DEFERRED
ENTITY_INTENT_REAFFIRMED
```

اما candidate بودن در 012A به معنی final semantic event contract نیست؛ authority نهایی متعلق به 019C است.

مپ درست عمل کرده و eventها را از فایل نهایی event inventory می‌گیرد، نه مستقیماً از candidate list این amendment.

### نتیجه

```txt
Events impact → ACCEPTED
No duplicate candidate events added blindly
```

---

# ۲۱. سناریوهای تست مدل

## سناریو ۱: خرید مواد غذایی

```txt
Standalone Task
```

نه Goal لازم است، نه Project. سیستم نباید برای خرید شیر یک transformation journey بسازد.

## سناریو ۲: پیدا کردن شغل

```txt
Goal: Find frontend job
├── Project: Build portfolio
├── Project: Prepare for interviews
└── Routine: Review job listings
```

پایان Projectها اثبات نمی‌کند Goal محقق شده.

## سناریو ۳: ورزش روزانه

```txt
Routine: Exercise daily
→ occurrence Monday: MISSED
→ occurrence Tuesday: PENDING
```

Monday به Tuesday Carry نمی‌شود.

## سناریو ۴: Task بدون برنامه

```txt
Task: Compare hosting providers
plannedDate = null
reviewDate = 2026-08-10
placement = Backlog
```

Task معتبر و visible است.

## سناریو ۵: Project با deadline کوتاه

```txt
created = August 1
default review = August 31
targetDate = August 15
```

reviewDate باید August 15 یا قبل از آن باشد، نه August 31.

---

# ۲۲. آیا تعارضی پیدا شد؟

## مدل مفهومی

هیچ تعارض مهمی میان 012، baseline و مپ دیده نمی‌شود.

```txt
Five canonical concepts        consistent
No persisted Plan             consistent
Exclusive ownership           consistent
Standalone work               consistent
Goal outcome boundary         consistent
RoutineOccurrence semantics   consistent
```

## مدل زمانی

اصل temporal visibility با flowهای Planning، Execution و Reconcile سازگار است.

مهم‌ترین تصمیم‌هایش در مپ دیده می‌شوند:

- commitment-review lane
    
- distinction between review and overdue
    
- deterministic policy before AI
    
- Backlog همچنان placement معتبر
    
- recurrence برای occurrence بعدی
    

جزئیات date fieldها طبیعتاً بیشتر در specها هستند تا در نمای سطح بالای مپ.

---

# ۲۳. جمع‌بندی وضعیت مپ

```txt
Product Model entities               ACCEPTED
Ownership relationships              ACCEPTED
Standalone entities                  ACCEPTED
No canonical Plan                    ACCEPTED
Goal outcome boundary                ACCEPTED
Project-owned Routine lifecycle      ACCEPTED
Task vs RoutineOccurrence            ACCEPTED
No Task dependency graph             ACCEPTED
No generic Task order                ACCEPTED

Temporal visibility invariant        ACCEPTED
Backlog reviewability                ACCEPTED
Review due vs execution overdue      ACCEPTED
Commitment-review lane               ACCEPTED
Derived nextTemporalCheckpoint       SPEC-LEVEL, CONSISTENT
Visible deterministic defaults       SPEC-LEVEL, CONSISTENT
```

---

# تعریف یک‌جمله‌ای Discussion 012

```txt
محصول پنج موجودیت واقعی Goal، Project، Task، Routine و RoutineOccurrence دارد؛
کار می‌تواند ساختاریافته یا standalone باشد،
Plan فقط proposal موقت است،
و اجرای فعالیت‌ها هرگز به‌تنهایی اثبات تحقق Goal نیست.
```

# تعریف یک‌جمله‌ای Discussion 012A

```txt
هیچ تعهد فعالی نباید در زمان گم شود؛
هر Goal، Project، Task یا Routine فعال باید
از طریق تاریخ اجرا، تاریخ بررسی، تاریخ هدف
یا occurrence بعدی دوباره به سطح تصمیم‌گیری بازگردد.
```

## نتیجه نهایی

```txt
Discussion 012    ACCEPTED
Discussion 012A   ACCEPTED
Map projection    ACCEPTED
Blocking issue    NONE
Required change   NONE
```

مرحله‌ی بعدی **Discussion 013: AI Planning Entry and Conversation Flow** است؛ جایی که مشخص می‌شود کاربر از کجا وارد Planning می‌شود، AI چند سؤال می‌پرسد، چه زمانی باید سکوت کند و چگونه بدون تبدیل onboarding به بازجویی اداری، context کافی جمع می‌شود.