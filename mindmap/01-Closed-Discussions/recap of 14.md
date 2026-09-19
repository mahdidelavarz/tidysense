# مرور Discussion 014 و 014A

## قرارداد `PlanningDraft`، اعتبارسنجی و مرز تبدیل پیشنهاد به داده‌ی واقعی

Discussion 013 مشخص کرد مکالمه چگونه به یک draft برسد. Discussion 014 مشخص می‌کند آن draft **دقیقاً چه ساختاری دارد، چه محدودیت‌هایی دارد، چه چیزی source of truth است، و چه زمانی اصلاً قابل تأیید نیست**.

Discussion 014A نیز قانون temporal visibility را وارد همین قرارداد می‌کند تا هیچ Goal، Project یا Task فعالی بدون یک checkpoint زمانی قابل‌استخراج تأیید نشود.

به زبان ساده:

```txt
013:
چطور از intention به draft برسیم؟

014:
draft چه شکلی است و چگونه review می‌شود؟

014A:
draft چگونه تضمین می‌کند تعهد فعال در زمان گم نشود؟
```

---

# ۱. مسئله‌ی Discussion 014 چه بود؟

خروجی AI نمی‌توانست صرفاً چنین متنی باشد:

```txt
برای رسیدن به هدفت بهتر است:
۱. رزومه‌ات را بهبود بدهی
۲. هر روز تمرین کنی
۳. چند پروژه بسازی
```

این متن برای گفتگو مناسب است، ولی پاسخ نمی‌دهد:

- کدام مورد Goal است؟
    
- کدام Project است؟
    
- parent هر Task چیست؟
    
- تاریخ پیشنهادی از حرف کاربر آمده یا حدس AI است؟
    
- Routine دقیقاً چه recurrenceای دارد؟
    
- کدام آیتم blocker دارد؟
    
- اگر parent حذف شود، child چه می‌شود؟
    
- آیا پیشنهاد از سقف‌های MVP عبور کرده؟
    
- کدام داده واقعاً هنگام approval باید ساخته شود؟
    

پس خروجی Planning باید یک قرارداد ساختاریافته و محدود باشد که:

```txt
renderable
editable
validatable
reviewable
approvable
```

باشد، نه یک پاراگراف الهام‌بخش با اعتمادبه‌نفس بالا و مسئولیت حقوقی صفر.

Discussion 014 این قرارداد را تعریف می‌کند و تأکید می‌کند `PlanningDraft` کاملاً ephemeral است؛ هیچ موجودیت canonical پیش از تأیید صریح کاربر ساخته نمی‌شود.

---

# ۲. موجودیت‌های قابل پیشنهاد

AI می‌تواند این موارد را پیشنهاد دهد:

```txt
Goal
Project
Task
Routine
```

ولی نمی‌تواند مستقیماً `RoutineOccurrence` تولید کند. occurrence از recurrence و زمان ساخته می‌شود، نه از خروجی آزاد مدل.

ownership همان مدل Discussion 012 را رعایت می‌کند:

```txt
Project → Goal یا standalone
Task → Goal یا Project یا standalone
Routine → Goal یا Project یا standalone
```

Task و Routine نمی‌توانند هم‌زمان owner از نوع Goal و Project داشته باشند.

---

# ۳. اصل اول: Draft است، اجرای پنهان نیست

Planning AI فقط proposal تولید می‌کند.

نباید:

- پیش از approval entity بسازد
    
- review را با action پنهان دور بزند
    
- مفهوم جدیدی خارج از مدل 012 اختراع کند
    
- intent کاربر را بی‌صدا عوض کند
    
- وانمود کند ownership، recurrence یا تاریخ پیشنهادی قبلاً اعمال شده است.
    

قاعده:

```txt
Generated draft
≠ canonical state
≠ permission
≠ committed mutation
```

---

# ۴. یک intention منسجم و حداکثر یک Goal

هر `PlanningDraft` باید یک intention منسجم را نمایش دهد.

در هر draft:

```txt
Goal count = 0 or 1
```

بیش از یک Goal مجاز نیست.

اگر کاربر چند outcome مستقل بیان کند، AI باید یکی از این کارها را انجام دهد:

- از کاربر بخواهد یکی را انتخاب کند
    
- یک intention فوری را اولویت دهد و omissionها را شفاف کند
    
- پیشنهاد کند flowهای جدا ساخته شوند
    

نباید سه Goal مستقل را داخل یک draft عظیم بریزد و نام آن را «برنامه‌ی جامع زندگی» بگذارد. بشر به اندازه‌ی کافی با برنامه‌های جامع زندگی آسیب دیده است.

---

# ۵. ساختار حداقلی ولی کامل

Draft فقط hierarchyای را می‌سازد که واقعاً لازم است.

ساختارهای معتبر:

```txt
یک standalone Task

یک standalone Routine

یک standalone Project + child work

یک Goal + direct Tasks/Routines

یک Goal + Projects + child work

چند standalone Task برای یک intention منسجم
```

AI نباید wrapper مصنوعی بسازد.

این تصمیم ادامه‌ی مستقیم Discussion 012 و 013 است:

```txt
Minimal complete structure
نه
Maximum possible hierarchy
```

---

# ۶. افق بلندمدت و جزئیات هفت‌روزه

Goal، Project و Routine ممکن است ماه‌ها یا سال‌ها ادامه داشته باشند، ولی یک draft فقط برای حداکثر هفت روز متوالی جزئیات اجرایی می‌چیند.

مثلاً برای Goal دوساله:

```txt
Goal:
Become a strong software engineer

Projects:
- Strengthen JavaScript fundamentals
- Build system-design knowledge
- Improve communication

Detailed scheduled Tasks:
فقط هفت روز اول
```

نباید برای ۷۳۰ روز آینده Task تاریخ‌دار تولید شود. مدل زبانی ظرفیت آینده‌ی انسان را نمی‌داند و تقویم دو‌ساله‌ی دقیق معمولاً فقط داستان علمی‌تخیلی با فرمت جدول است.

## نکته مهم

```txt
Seven-day horizon
= detailed execution placement limit

Seven-day horizon
≠ entity lifetime
```

---

# ۷. اولین هفته به‌عنوان calibration

اولین پنجره‌ی هفت‌روزه یک دوره‌ی calibration است، چون محصول هنوز نمی‌داند:

- ظرفیت واقعی کاربر چقدر است
    
- friction کجاست
    
- cadence پیشنهادی مناسب است یا نه
    
- Taskها واقعاً عملی هستند یا نه
    

در انتقال از هفته‌ی اول به دوم، یک تصمیم سبک و صریح لازم است:

```txt
CONTINUE_AS_IS
ADJUST
PAUSE_OR_STOP
REVIEW_WITH_AI
```

این review مربوط به **پنجره‌ی اجرایی بعدی** است، نه reconfirm کردن وجود Goal و Project.

بعد از اولین review، ادامه‌ی پنجره‌های بعدی می‌تواند خودکار باشد، مگر اینکه Reconcile drift معناداری پیدا کند.

## تصمیم مهم

این check نباید تبدیل به interruption هفتگی اجباری و جدا از Reconcile شود.

یعنی:

```txt
First transition:
explicit calibration

Later transitions:
signal-based
```

---

# ۸. شکل اصلی `PlanningDraft`

```txt
PlanningDraft
- draftSummary
- proposals[]
- assumptions[]
- warnings[]
- unresolvedQuestions[]
- firstWeekPlan?
- continuationPolicy
```

این تفکیک بسیار مهم است:

- `proposals`: چیزهایی که ممکن است ساخته شوند
    
- `assumptions`: چیزهایی که AI استنتاج کرده
    
- `warnings`: مشکل یا ریسک ساختاری
    
- `unresolvedQuestions`: ابهام‌هایی که هنوز مانده‌اند
    
- `firstWeekPlan`: projection هفت‌روزه برای review
    
- `continuationPolicy`: رفتار عبور از هفته اول
    

---

# ۹. شکل هر Proposal

```txt
Proposal
- draftId
- entityType: GOAL | PROJECT | TASK | ROUTINE
- title
- description?
- parentDraftId?
- source: EXPLICIT | INFERRED
- confidence: HIGH | MEDIUM | LOW
- fields
```

## `draftId`

شناسه‌ی موقت داخل draft است و نباید با ID canonical اشتباه گرفته شود.

کاربرد:

```txt
Task.parentDraftId = temporary Project draftId
```

بعد از approval، backend relationship واقعی را با IDهای canonical می‌سازد.

## `source`

```txt
EXPLICIT
```

یعنی از ورودی صریح کاربر آمده.

```txt
INFERRED
```

یعنی مدل یا policy آن را پیشنهاد کرده است.

این تفاوت برای trust و review حیاتی است. کاربر باید بفهمد کدام بخش حرف خودش است و کدام بخش برداشت سیستم.

## `confidence`

confidence permission نیست. فقط نشانه‌ی عدم قطعیت proposal است.

```txt
HIGH confidence
≠ auto-approve
```

---

# ۱۰. فیلدهای Goal

نسخه‌ی پایه:

```txt
GoalFields
- desiredOutcome
```

Goal باید outcome داشته باشد و draft نمی‌تواند درصد achievement ساختگی برای آن محاسبه کند.

Discussion 014A این ساختار را توسعه می‌دهد:

```txt
GoalFields
- desiredOutcome
- targetDate?
- reviewDate
- reviewDateSource: USER | SYSTEM_DEFAULT
```

قواعد:

- `targetDate` اختیاری است
    
- `reviewDate` پیش از approval الزامی است
    
- نبود reviewDate نباید سؤال اجباری جدید بسازد
    
- default visible و editable است
    
- default نمی‌تواند بعد از target زودتر باشد
    

policy:

```txt
defaultGoalReviewDate = createdLocalDate + 90 days
reviewDate = min(defaultGoalReviewDate, targetDate?)
```

---

# ۱۱. فیلدهای Project

نسخه‌ی پایه:

```txt
ProjectFields
- completionMeaning?
```

Project باید تلاش محدود یا مستقلاً قابل‌مدیریت باشد، نه container تزئینی.

نسخه‌ی 014A:

```txt
ProjectFields
- completionMeaning?
- targetDate?
- reviewDate?
- reviewDateSource?: USER | SYSTEM_DEFAULT
```

Project فعال باید حداقل یکی داشته باشد:

```txt
targetDate
OR
reviewDate
```

default:

```txt
createdLocalDate + 30 days
```

و با target زودتر cap می‌شود.

---

# ۱۲. فیلدهای Task

نسخه‌ی پایه:

```txt
TaskFields
- plannedDate?
```

تاریخ فقط وقتی قابل پیشنهاد است که:

- صریح باشد
    
- deterministic از context تأییدشده استخراج شود
    
- یا به‌عنوان assumption visible و editable نمایش داده شود
    

هر `plannedDate` تفصیلی باید داخل پنجره‌ی هفت‌روزه باشد.

نسخه‌ی نهایی 014A:

```txt
TaskFields
- plannedDate?
- reviewDate?
- reviewDateSource?: USER | SYSTEM_DEFAULT
- placement: SCHEDULED | BACKLOG
- deadline?
```

Task فعال باید حداقل یکی داشته باشد:

```txt
plannedDate
OR
reviewDate
```

Task بدون برنامه‌ی اجرا معتبر است:

```txt
plannedDate = null
placement = BACKLOG
reviewDate exists
```

`deadline` نیز جدا از placement است.

این تفکیک مهم است:

```txt
plannedDate
= چه زمانی قصد اجرای Task را داریم

deadline
= آخرین مرز سخت

reviewDate
= چه زمانی دوباره commitment را بررسی کنیم

placement
= اکنون scheduled است یا backlog
```

این‌ها چهار نام برای یک تاریخ نیستند. اگر یکی شوند، سیستم خیلی سریع شروع به تولید رفتارهای مبهم و پیام‌های تهدیدآمیز می‌کند.

---

# ۱۳. فیلدهای Routine

```txt
RoutineFields
- recurrence
- preferredStartDate?
- preferredTime?
- durationMinutes?
```

recurrenceهای اولیه:

```txt
DAILY
WEEKDAYS
SPECIFIC_WEEKDAYS
WEEKLY
N_TIMES_PER_WEEK
MONTHLY_ON_DAY
```

recurrence unsupported نباید silently به نزدیک‌ترین pattern تبدیل شود.

مثلاً:

```txt
هر سه روز یک‌بار
```

اگر MVP این pattern را پشتیبانی نمی‌کند، مدل حق ندارد آن را `SPECIFIC_WEEKDAYS` جا بزند و وانمود کند مسئله حل شده است.

014A تأیید می‌کند Routine برای temporal visibility نیاز به reviewDate جدا ندارد، به شرط اینکه recurrence معتبر occurrence بعدی تولید کند.

---

# ۱۴. Continuation Policy

```txt
ContinuationPolicy
- firstTransitionRequiresExplicitReview: true
- laterContinuationMode: SIGNAL_BASED
- allowedChoices:
  - CONTINUE_AS_IS
  - ADJUST
  - PAUSE_OR_STOP
  - REVIEW_WITH_AI
```

این policy متعلق به execution window است، نه lifecycle entityها.

یعنی `PAUSE_OR_STOP` لزوماً به معنی حذف Goal نیست؛ ممکن است فقط ادامه‌ی برنامه‌ی هفت‌روزه متوقف شود.

---

# ۱۵. Assumption، Warning و Question

هر تصمیم inferred مهم باید visible باشد، مخصوصاً:

- ownership
    
- date
    
- recurrence
    
- entity classification
    
- structural choice
    

warning levelها:

```txt
INFO
IMPORTANT
BLOCKING
```

## Blocking warning

تا وقتی اصلاح یا exclusion انجام نشود، approval را مسدود می‌کند.

نمونه:

- parent نامعتبر
    
- recurrence پشتیبانی‌نشده
    
- تاریخ ناممکن
    
- بیش از یک Goal
    
- ownership هم‌زمان Goal و Project
    
- تاریخ تفصیلی خارج از هفت روز
    
- Goal outcome آن‌قدر مبهم که child hierarchy قابل‌اعتماد نیست
    

## Unresolved question

اجازه می‌دهد partial draft وجود داشته باشد، ولی نباید دوباره interview نامحدود ایجاد کند.

## Crisis

crisis اصلاً PlanningDraft تولید نمی‌کند. مسیر از همان Discussion 013 به `SAFETY_FALLBACK` می‌رود.

---

# ۱۶. `FirstWeekPlan` و source of truth

```txt
FirstWeekPlan
- startDate
- endDate
- entries[]
```

```txt
FirstWeekEntry
- draftId
- date
- note?
```

پنجره:

```txt
endDate - startDate <= 6 days
```

اما `firstWeekPlan` منبع حقیقت مستقل نیست؛ فقط projection برای review است.

## برای Task

```txt
TaskFields.plannedDate
= source of truth

FirstWeekEntry.date
= derived projection
```

## برای Routine

```txt
Routine recurrence
= source of truth

FirstWeekEntry dates
= derived projection
```

این تصمیم جلوی دو منبع تاریخ را می‌گیرد.

اگر کاربر Task را در weekly view جابه‌جا کند، باید `TaskFields.plannedDate` تغییر کند، نه اینکه فقط card ظاهری به روز دیگری برود و backend همچنان تاریخ قبلی را نگه دارد. محصول‌ها عاشق این نوع اختلاف‌اند؛ کاربران کمتر.

---

# ۱۷. محدودیت‌های عددی

برای هر draft:

```txt
Goals: max 1
Projects: max 5
Tasks: max 15
Routines: max 5
Total proposals: max 20
First-week entries: max 21
Assumptions: max 10
Warnings: max 10
Unresolved questions: max 5
Detailed horizon: max 7 days
```

این محدودیت‌ها فقط مربوط به یک draft هستند، نه کل داده‌های کاربر.

اگر ورودی بزرگ‌تر باشد، AI نباید silently truncate کند. باید:

- immediate coherent subset را اولویت دهد
    
- omissionها را صریح بگوید
    

---

# ۱۸. اعتبارسنجی deterministic

Draft فقط وقتی معتبر است که:

- همه‌ی `draftId`ها unique باشند
    
- entity type معتبر باشد
    
- حداکثر یک Goal وجود داشته باشد
    
- title و required fieldها وجود داشته باشند
    
- parent mapping معتبر باشد
    
- exclusive ownership حفظ شود
    
- recurrence معتبر یا blocked باشد
    
- تاریخ‌ها parse شوند
    
- detailed dates داخل هفت روز باشند
    
- first-week entry به proposal معتبر اشاره کند
    
- projection با Task dates و recurrence هماهنگ باشد
    
- countها از سقف عبور نکنند
    
- assumptions و warnings به itemهای معتبر اشاره کنند.
    

014A اضافه می‌کند:

- Goal بعد از default باید reviewDate داشته باشد
    
- Project target یا review داشته باشد
    
- Task planned یا review داشته باشد
    
- Routine occurrence بعدی قابل‌استخراج باشد
    
- default بعد از deadline یا target زودتر نباشد
    
- provenance قابل‌دیدن باشد
    
- `reviewDate` می‌تواند خارج هفت روز باشد.
    

---

# ۱۹. Repair محدود

sequence:

```txt
1. deterministic validation
2. one bounded structural repair attempt
3. revalidation
4. GENERATION_FAILED if still invalid
```

Repair می‌تواند:

- JSON formatting را درست کند
    
- reference واضح را اصلاح کند
    
- structural defect ساده را تعمیر کند
    
- deterministic default زمانی اضافه کند
    

اما نمی‌تواند silently تغییر دهد:

- intent
    
- entity classification
    
- ownership
    
- dates
    
- recurrence
    
- parent-removal consequence
    
- seven-day horizon
    

این boundary مهم است:

```txt
Repair fixes representation.
It does not redesign the plan.
```

---

# ۲۰. Review UX

hierarchy باید قابل‌فهم باشد:

```txt
Goal
├── Project
│   ├── Task
│   └── Routine
├── direct Task
└── direct Routine
```

نباید به یک list تخت و مبهم تبدیل شود.

هر item باید نشان دهد:

- entity type
    
- parent یا standalone
    
- review state
    
- assumptions/warnings
    
- first-week placement
    

کاربر پیش از approval می‌تواند consequential fieldها را edit کند:

- title
    
- description
    
- entity classification
    
- ownership
    
- Task date
    
- Routine recurrence
    
- timing
    
- weekly placement
    
- inclusion/exclusion
    

هر revision با AI همچنان unapproved باقی می‌ماند.

---

# ۲۱. Review stateها

canonical review states شامل این موارد است:

```txt
INCLUDED
EXCLUDED
BLOCKED
BLOCKED_BY_ANCESTOR
```

معنای `BLOCKED_BY_ANCESTOR` این است که child ممکن است خودش valid باشد، ولی چون parent blocked یا excluded شده، نمی‌تواند فعلاً commit شود.

مثلاً:

```txt
Goal = BLOCKED
Project child = structurally valid
Task child = structurally valid

نتیجه:
Project / Task = BLOCKED_BY_ANCESTOR
```

این بهتر از حذف خاموش childهاست.

---

# ۲۲. حذف parent چه می‌کند؟

هر child به parent وابسته است، ولی حذف parent نباید رفتار مبهم ایجاد کند.

سیستم باید نتیجه را visible کند، مثلاً:

- child هم exclude شود
    
- child standalone شود
    
- child به parent معتبر دیگری منتقل شود
    
- action blocked شود تا کاربر تصمیم بگیرد
    

نکته‌ی بنیادی:

```txt
No silent reparenting
No silent cascade loss
```

این تصمیم بعداً در Discussionهای authority و transaction رسمی‌تر می‌شود، ولی ریشه‌ی UX آن در 014 است.

---

# ۲۳. تصمیم‌های Discussion 014A درباره‌ی friction

AI نباید فقط برای review checkpoint سؤال‌هایی مثل این بسازد:

```txt
این Goal را چه زمانی دوباره بررسی کنیم؟
این Project چه زمانی برگردد؟
این Backlog Task چه زمانی دوباره دیده شود؟
```

به‌جای آن:

```txt
missing checkpoint
→ deterministic visible default
→ editable in review
→ approval remains possible
```

defaultها policy محصول‌اند، نه حدس AI درباره‌ی:

- motivation
    
- capacity
    
- lifestyle
    
- availability
    

---

# ۲۴. تفاوت تاریخ‌های اجرایی و review در UX

Review باید صریحاً تفکیک کند:

```txt
plannedDate / targetDate
→ execution or target timing

reviewDate
→ future commitment review
```

defaultهای سیستم نباید طوری نمایش داده شوند که انگار کاربر آن‌ها را گفته است.

مثلاً:

```txt
Review on October 25
System default
```

نه:

```txt
You said you want to review this on October 25
```

وقتی کاربر هیچ‌وقت چنین چیزی نگفته، جعل نقل‌قول تجربه‌ی کاربری محسوب نمی‌شود، هرچند بعضی محصولات ظاهراً هنوز مرددند.

---

# ۲۵. رابطه با هفت روز

هفت روز فقط detailed execution را محدود می‌کند.

بنابراین:

```txt
Task.plannedDate
→ must be inside first execution window

Goal.reviewDate
Project.reviewDate
Task.reviewDate
→ may be later than seven days
```

`reviewDate` Today entry تولید نمی‌کند.

---

# ۲۶. اثر Discussion 014 و 014A روی مپ

این خانواده‌ی تصمیم روی بخش‌های متعددی اثر دارد:

```txt
MVP Core Loop
Planning User Flow
AI Responsibilities
AI Guardrails
Product Model
Data Model
Current Decisions
Open Configuration
Implementation Plan
```

---

## A. MVP Core Loop

اثر اصلی:

```txt
bounded conversation
→ structured PlanningDraft
→ deterministic validation
→ review/edit/exclude
→ explicit confirmation
→ canonical commit
```

مپ فعلی این مراحل را دارد:

- bounded conversation
    
- validated PlanningDraft
    
- review + confirmation
    
- deterministic commit
    

### ارزیابی

جهت به‌درستی منتقل شده است.

جزئیات `one repair attempt`، numeric limits و review stateها عمداً در node سطح بالای loop نیستند و باید در spec بمانند.

### نتیجه

```txt
MVP Core Loop → ACCEPTED
```

---

## B. Planning Flow

مپ فعلی Planning را چنین توصیف می‌کند:

- entryهای مختلف
    
- clarification محدود
    
- draft ساختاریافته
    
- visible assumptions
    
- editable proposal
    
- ephemeral before approval
    

این با 014 سازگار است.

اما Discussion 014 محتوای غنی‌تری در سطح UX دارد:

- hierarchy visible
    
- warning severity
    
- include/exclude
    
- blocked-by-ancestor
    
- first-week projection
    
- source explicit/inferred
    
- confidence
    
- continuation policy
    

این‌ها بیشتر باید در formal UX spec و wireframe بعدی دیده شوند، نه لزوماً در خلاصه‌ی mind map.

### نتیجه

```txt
Planning Flow → ACCEPTED AS HIGH-LEVEL PROJECTION
```

---

## C. AI Responsibilities

AI در این خانواده می‌تواند:

- proposal ساختاریافته بسازد
    
- source و confidence مشخص کند
    
- assumptionهای material را آشکار کند
    
- first-week projection بسازد
    
- structure محدود را پیشنهاد دهد
    
- یک repair ساختاری محدود انجام دهد
    

اما نمی‌تواند:

- entity بسازد
    
- داده‌ی unsupported اختراع کند
    
- oversized input را پنهانی truncate کند
    
- hierarchy مصنوعی بسازد
    
- invalid recurrence را تبدیل کند
    
- repair را به تغییر intent تبدیل کند
    

مپ فعلی این boundary را در عبارت کلی زیر پوشش می‌دهد:

```txt
AI may propose bounded plans.
It may not create facts, authority, or mutation.
```

### نتیجه

```txt
AI Responsibilities → ACCEPTED
```

---

## D. AI Guardrails

Guardrailهای کلیدی:

```txt
maximum one Goal
no artificial hierarchy
no silent truncation
no unsupported recurrence conversion
no hidden dates or ownership
no approval with blocking warning
no draft for crisis content
no duplicate editable source of truth
no user-specific temporal default by AI inference
```

مپ همه را تک‌تک نام نمی‌برد، ولی guardrail کلی و formal specs این محدودیت‌ها را پوشش می‌دهند.

### نتیجه

```txt
AI Guardrails → ACCEPTED
Detailed constraints remain in specs
```

---

## E. Product Model

اثر:

- PlanningDraft فقط Goal، Project، Task و Routine پیشنهاد می‌کند
    
- occurrence خارج draft است
    
- hierarchy model 012 حفظ می‌شود
    
- canonical Plan ساخته نمی‌شود
    

مپ فعلی این موارد را درست نشان می‌دهد.

### نتیجه

```txt
Product Model impact → ACCEPTED
```

---

## F. Temporal Model

اثر 014A:

```txt
Goal → target/review
Project → target/review
Task → planned/review/deadline/placement
Routine → recurrence
```

و:

```txt
nextTemporalCheckpoint = derived
```

این جزئیات در مپ سطح بالا خلاصه شده‌اند و در Reconcile lane و temporal policy دیده می‌شوند.

### نتیجه

```txt
Temporal Planning Contract → ACCEPTED
```

---

## G. Execution Flow

Discussion 014 هنوز occurrence mechanics را تعریف نمی‌کند، ولی source of truth را تعیین می‌کند:

```txt
Task plannedDate
→ execution placement source

Routine recurrence
→ occurrence projection source
```

این dependency برای Discussion 015 حیاتی است.

مپ Execution نیز Task و RoutineOccurrence را جدا می‌کند و با این قرارداد سازگار است.

### نتیجه

```txt
Execution dependency → ACCEPTED
```

---

## H. Reconcile Flow

اثرهای مهم:

- continuation بعد از هفته‌ی اول
    
- later signal-based review
    
- Backlog و reviewDate
    
- unresolved drift
    
- no automatic weekly interruption
    

مپ Reconcile را adaptation engine معرفی می‌کند و commitment-review lane دارد، پس با این قرارداد سازگار است.

### نتیجه

```txt
Reconcile dependency → ACCEPTED
```

---

## I. Data Model و Source of Truth

این Discussion چند قانون معماری مهم ایجاد می‌کند:

```txt
firstWeekPlan is projection
not source of truth

nextTemporalCheckpoint is derived
not editable truth

draftId is temporary
not canonical ID

reviewDateSource preserves provenance
```

این‌ها باید در specs و implementation plan دقیق باشند.

مپ سطح بالا source-of-truth principle را دارد، ولی field-level جزئیات را نمایش نمی‌دهد که قابل‌قبول است.

### نتیجه

```txt
Data source-of-truth impact → ACCEPTED
```

---

## J. Current Decisions

تصمیم‌های بسته‌شده:

- draft ساختاریافته است
    
- حداکثر یک Goal دارد
    
- افق جزئی هفت روز است
    
- first week calibration دارد
    
- later continuation signal-based است
    
- partial draft معتبر است
    
- blocking warning approval را متوقف می‌کند
    
- hierarchy باید قابل review باشد
    
- source و assumption باید visible باشند
    
- temporal defaults سؤال اجباری اضافه نمی‌کنند
    
- Backlog معتبر است
    
- reviewDate خارج هفت روز مجاز است
    

مپ scope و decision inventory این جهت را حفظ می‌کنند.

### نتیجه

```txt
Current Decisions → ACCEPTED
```

---

# ۲۷. سناریوهای تست

## سناریو ۱: Task ساده

ورودی:

```txt
فردا به مدیر پروژه ایمیل بزنم
```

Draft:

```txt
Proposal:
entityType = TASK
title = Email project manager
source = EXPLICIT
plannedDate = tomorrow
placement = SCHEDULED
```

بدون Goal و Project.

---

## سناریو ۲: Goal بلندمدت

ورودی:

```txt
می‌خواهم طی یک سال انگلیسی‌ام را به B2 برسانم.
```

Draft می‌تواند داشته باشد:

- یک Goal
    
- یک یا چند Project
    
- Routineهای بلندمدت
    
- Taskهای هفت روز اول
    

نباید ۵۲ هفته Task تاریخ‌دار تولید کند.

---

## سناریو ۳: دو Goal مستقل

```txt
می‌خواهم شغل جدید پیدا کنم و ۱۰ کیلو وزن کم کنم.
```

یک draft با دو Goal نامعتبر است.

باید:

- یکی انتخاب شود
    
- یا دو flow جدا پیشنهاد شود
    

---

## سناریو ۴: Backlog Task

```txt
بعداً درباره مهاجرت دیتابیس تحقیق کنم، ولی فعلاً نمی‌خواهم زمان‌بندی‌اش کنم.
```

Draft:

```txt
plannedDate = null
placement = BACKLOG
reviewDate = deterministic default
reviewDateSource = SYSTEM_DEFAULT
```

---

## سناریو ۵: recurrence unsupported

```txt
هر سه روز یک‌بار تمرین کنم.
```

اگر pattern پشتیبانی نمی‌شود:

```txt
BLOCKING warning
```

نه تبدیل پنهانی به سه روز مشخص هفته.

---

## سناریو ۶: Parent excluded

```txt
Goal excluded
Project child included
Task grandchild included
```

childها باید:

- blocked-by-ancestor شوند
    
- یا با تصمیم visible reparent شوند
    

نه اینکه پنهانی standalone شوند.

---

## سناریو ۷: oversized request

کاربر ۴۰ Task می‌دهد.

AI:

- یک subset منسجم را انتخاب می‌کند
    
- omission را شفاف می‌گوید
    

نباید فقط ۱۵ مورد اول را بی‌صدا بردارد.

---

## سناریو ۸: invalid output

مدل JSON نامعتبر می‌دهد.

```txt
deterministic validation
→ bounded repair
→ revalidate
→ fail if still invalid
```

نه loop repair بی‌نهایت.

---

# ۲۸. آیا تعارضی پیدا شد؟

## با Discussion 012

سازگار است:

- entity model حفظ شده
    
- ownership invariant حفظ شده
    
- Plan canonical نیست
    
- occurrence مستقیم تولید نمی‌شود
    

## با Discussion 013

سازگار است:

- conversation bounded است
    
- `Draft now` partial draft ممکن می‌سازد
    
- approval boundary حفظ می‌شود
    
- crisis draft تولید نمی‌کند
    

## با Discussion 012A

014A temporal fields را درست وارد کرده:

- defaults visible
    
- no extra clarification
    
- deadline/target cap
    
- derived checkpoint
    
- Backlog reviewability
    

## با مپ

هیچ تعارض محصولی پیدا نشد.

مپ قرارداد را در سطح مناسب خلاصه می‌کند، درحالی‌که جزئیات field، enum، count و validation در formal specs باقی می‌مانند.

---

# ۲۹. نکته‌ای برای طراحی آینده

هنگام طراحی UI review، این موارد باید واقعاً قابل‌دیدن باشند:

```txt
Entity type
Parent / standalone
Explicit vs inferred source
System default
Assumption
Warning level
Blocked state
First-week placement
Review checkpoint
Include / exclude
```

اگر همه در یک card کوچک با شش tooltip پنهان شوند، technically قرارداد رعایت شده ولی عملاً review غیرممکن می‌شود. طراحی هم گاهی با رعایت تمام requirementها، نتیجه را نابود می‌کند؛ استعداد قابل‌توجهی است.

این finding فعلاً نقص مپ نیست، بلکه **Design Requirement برای مرحله UX** است.

---

# جمع‌بندی وضعیت مپ

```txt
Structured PlanningDraft             ACCEPTED
Ephemeral draft                      ACCEPTED
Maximum one Goal                     ACCEPTED
Minimal hierarchy                    ACCEPTED
Seven-day detailed horizon           ACCEPTED
First-week calibration               ACCEPTED
Signal-based later continuation      ACCEPTED
Proposal source/confidence           ACCEPTED AT SPEC LEVEL
Visible assumptions                  ACCEPTED
Warning levels                       ACCEPTED AT SPEC LEVEL
Blocking approval behavior           ACCEPTED
Partial draft                        ACCEPTED
FirstWeekPlan as projection          ACCEPTED
Task/Routine source of truth         ACCEPTED
Numeric limits                       ACCEPTED AT SPEC LEVEL
Bounded repair                       ACCEPTED
Hierarchy review                     ACCEPTED
Include/exclude/block states         ACCEPTED AT SPEC LEVEL

Temporal defaults                    ACCEPTED
Goal review checkpoint               ACCEPTED
Project checkpoint                   ACCEPTED
Task scheduled/backlog checkpoint    ACCEPTED
Routine recurrence checkpoint        ACCEPTED
Default provenance                   ACCEPTED
No extra clarification               ACCEPTED
Derived nextTemporalCheckpoint       ACCEPTED
Review dates outside seven days      ACCEPTED
```

# تعریف یک‌جمله‌ای Discussion 014

```txt
Planning AI یک draft محدود، ساختاریافته و قابل‌ویرایش می‌سازد
که حداکثر یک Goal و حداکثر هفت روز جزئیات اجرایی دارد؛
assumptionها و blockerها شفاف‌اند،
و هیچ proposalی پیش از review و approval به داده‌ی canonical تبدیل نمی‌شود.
```

# تعریف یک‌جمله‌ای Discussion 014A

```txt
هر proposal فعال پیش از approval باید checkpoint زمانی معتبر داشته باشد؛
تاریخ‌های پیش‌فرض از policy deterministic محصول می‌آیند،
به‌عنوان default نمایش داده می‌شوند،
قابل‌ویرایش‌اند و هیچ سؤال اجباری تازه‌ای به مکالمه اضافه نمی‌کنند.
```

## نتیجه نهایی

```txt
Discussion 014      ACCEPTED
Discussion 014A     ACCEPTED
Map projection      ACCEPTED
Product conflict    NONE
Required map change NONE
Future UX concern  REVIEW INFORMATION DENSITY
```

مرحله‌ی بعدی **Discussion 015، 015A و 015B** است: مدل اجرای Task و Routine، ساخت Today، Carry، Missed occurrence، correction، restore و اینکه «آنچه واقعاً اتفاق افتاد» چگونه بدون بازنویسی تاریخ ثبت می‌شود.

بریم سراغ **Discussion 015، 015A و 015B**.

این خانواده مشخص می‌کند بعد از approval، کاربر دقیقاً چه چیزی را در Today می‌بیند، تفاوت Task و RoutineOccurrence در اجرا چیست، Carry چه معنایی دارد، Missed چگونه ثبت می‌شود، و correction/restore چطور تاریخچه را حفظ می‌کنند. یعنی نقطه‌ای که planner از «طرح قشنگ» تبدیل می‌شود به چیزی که باید با واقعیت روزمره‌ی انسان کنار بیاید. کار دشواری است؛ انسان‌ها طبق برنامه رفتار نمی‌کنند، بی‌ادبی محض.