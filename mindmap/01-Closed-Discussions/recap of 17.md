# مرور Discussion 017

## هوشمندی Reconcile، Rule Catalog، actionهای مجاز و مرز قطعی اختیار AI

Discussion 016 مشخص کرد Reconcile **چه زمانی** ظاهر شود و severity آن چقدر باشد. Discussion 017 مشخص می‌کند بعد از ورود به Reconcile:

```txt
factها چگونه گروه‌بندی می‌شوند؟
چه ruleهایی اجازه دارند match شوند؟
چه recommendationهایی مجازند؟
کدام actionها destructive یا protected هستند؟
AI دقیقاً چه چیزی را می‌تواند توضیح دهد؟
چه چیزی فقط با تصمیم صریح کاربر تغییر می‌کند؟
```

نکته‌ی مهم این است که repository اکنون یک فایل نهایی و consolidated برای 017 دارد. draftها و amendment میانی حذف شده‌اند و همین سند تنها مرجع semantics محصول است.

---

# ۱. مسئله‌ی اصلی چه بود؟

اگر Reconcile فقط factها را نشان دهد، محصول هنوز بخش مهمی از ارزش خود را ایجاد نکرده است. کاربر دوباره با فهرستی از Taskهای قدیمی، Carryهای تکراری و Routineهای ناسازگار تنها می‌ماند.

اما اگر AI آزاد باشد هر تحلیلی تولید کند، خطرهای دیگری ایجاد می‌شود:

- علت انجام‌نشدن کار را حدس بزند
    
- ظرفیت کاربر را پایین اعلام کند
    
- Goal را بی‌اهمیت تشخیص دهد
    
- Drop گسترده پیشنهاد کند
    
- چند Task مشابه متنی را یک گروه فرض کند
    
- recommendationی خارج از مدل محصول بسازد
    
- free text کاربر را به metric روان‌شناختی تبدیل کند
    

پس مسئله این بود:

> چگونه AI فضای تصمیم‌گیری را کوچک کند، بدون اینکه facts، rules یا authority جدید اختراع کند؟

---

# ۲. اصل حاکم Reconcile

pipeline نهایی:

```txt
deterministic canonical facts
→ stable ownership grouping
→ approved metric calculation
→ versioned bounded rule match
→ predefined action options
→ explicit user decision
```

AI فقط می‌تواند matched factها را به زبان ساده توضیح دهد.

نمی‌تواند اختراع کند:

- problem جدید
    
- metric جدید
    
- reason جدید
    
- recommendation type جدید
    
- lifecycle conclusion جدید
    

## تعریف ساده

```txt
Rules decide what may be recommended.
AI explains why the rule matched.
User decides what happens.
```

این یکی از مهم‌ترین authority boundaryهای کل محصول است.

---

# ۳. مرز سؤال‌پرسیدن AI

AI در Reconcile حق ندارد بپرسد:

- چرا این کار را انجام ندادی؟
    
- انگیزه‌ات کم شده؟
    
- چه احساسی داشتی؟
    
- مشکل انضباط داری؟
    
- ظرفیت فعلی‌ات چقدر است؟
    
- این برنامه با سبک زندگی‌ات هماهنگ نیست؟
    
- چه زمانی انرژی بیشتری خواهی داشت؟
    
- چه زمانی فکر می‌کنی حالت بهتر شود؟
    

همچنین نباید free text توضیحی برای rule matching درخواست کند.

## Free text چه می‌شود؟

متن آزاد کاربر می‌تواند:

```txt
user-authored note
```

باقی بماند، اما:

```txt
must not enter rule matching
must not become inferred metric
must not become AI rationale
```

این تصمیم ظریف ولی بسیار مهم است.

مثلاً کاربر می‌نویسد:

> این هفته خیلی درگیر بودم.

سیستم حق ندارد از این جمله metric زیر بسازد:

```txt
capacity = LOW
motivation = DECLINING
```

متن کاربر testimony است، نه خوراک آزاد برای روان‌شناسی ماشینی.

---

# ۴. Closed decision checkpoint با clarification فرق دارد

Reconcile می‌تواند سؤال قطعی و بسته بپرسد، وقتی پاسخ مستقیماً state محصول را تغییر می‌دهد.

مثلاً:

```txt
Do you still want to continue this Goal?
```

این سؤال clarification آزاد AI نیست. یک product action با گزینه‌های محدود است.

تفاوت:

```txt
Open-ended AI question:
Why do you no longer care about this Goal?

Deterministic checkpoint:
Do you still want to continue this Goal?
```

اولی علت و احساس را حدس می‌زند. دومی intent فعلی را ثبت می‌کند.

---

# ۵. Goal Continuation Check

## Trigger

این check زمانی نمایش داده می‌شود که:

```txt
Goal.status = ACTIVE
AND Goal.reviewDate <= currentLocalDate
AND checkpoint unresolved
AND per-Goal suppression elapsed
```

Absence یا execution قدیمی می‌تواند از طریق policy deterministic باعث تعیین review checkpoint آینده شود، ولی مستقیم نتیجه نمی‌گیرد Goal دیگر مهم نیست.

---

## متن ثابت و خنثی

```txt
Do you still want to continue this Goal?
```

prompt نباید اشاره کند به:

- failure
    
- backlog
    
- abandonment
    
- inactivity
    
- discipline
    
- motivation
    
- decline in interest
    

---

## actionهای مجاز

```txt
CONTINUE
REVIEW_LATER
ABANDON_GOAL
```

### CONTINUE

- Goal همچنان Active است
    
- intent فعلی کاربر reaffirm می‌شود
    
- review checkpoint بعدی تعیین می‌شود
    

### REVIEW_LATER

- Goal همچنان Active می‌ماند
    
- lifecycle ساختگی `PAUSED` ساخته نمی‌شود
    
- reviewDate آینده تعیین می‌شود
    

### ABANDON_GOAL

- terminal flow پذیرفته‌شده‌ی Goal آغاز می‌شود
    
- child resolutionهای Discussion 015 اجرا می‌شوند
    

## Guardrail مهم

محصول abandonment را **توصیه نمی‌کند**.

فقط آن را به‌عنوان action lifecycle قابل‌انتخاب نشان می‌دهد.

---

# ۶. cadence مربوط به Goal

نمایش خودکار:

```txt
maximum once per 30 local days per Goal
```

کاربر می‌تواند دستی زودتر review را باز کند، ولی سیستم خودکار نباید بیشتر از این cadence سؤال را تکرار کند.

هم‌زمان قانون عمومی Discussion 016 هم برقرار است:

```txt
maximum one automatic primary Reconcile prompt per local day
```

پس دو suppression داریم:

```txt
global daily suppression
+
per-Goal 30-day suppression
```

---

# ۷. Grouping deterministic

ترتیب grouping:

```txt
1. canonical ownership
2. entity type and review lane
3. matched rule relationship
4. risk / protection constraints
```

## ownership groupها

- Taskهای Project-owned زیر همان Project
    
- direct Goal work زیر همان Goal
    
- standaloneها در گروه standalone
    
- occurrenceها زیر Routine خودشان
    

## موارد ردشده

MVP ندارد:

- semantic grouping آزاد
    
- inferred shared intent
    
- duplicate detection فقط با شباهت متن
    

مثلاً دو Task با title مشابه الزاماً یک intention ندارند:

```txt
Send report to finance
Send report to manager
```

مدل زبانی نباید فقط به‌خاطر شباهت کلمات آن‌ها را یک bulk group اعلام کند.

---

# ۸. اختیار کاربر روی grouping

کاربر می‌تواند:

- item را از rule group خارج کند
    
- item را جدا بررسی کند
    
- recommendation را reject کند
    
- action را فقط روی selected itemها اعمال کند
    

AI group پیشنهاد می‌کند، ولی group یک زندان منطقی نیست.

---

# ۹. Protected Item چیست؟

Task زمانی protected است که condition deterministic پذیرفته‌شده‌ای داشته باشد، از جمله:

- explicit user protection
    
- hard deadline
    
- تعهد legal، financial، health یا external
    
- blocking relationship
    
- parent با اولویت بالا
    
- reaffirmation صریح اخیر
    
- currently in progress.
    

## رفتار protected item

- bulk Drop پیشنهاد نمی‌گیرد
    
- خودکار یا پنهانی Backlog نمی‌شود
    
- risk و deadline آن visible باقی می‌ماند
    
- فقط actionهای امن وابسته به rule نمایش داده می‌شوند
    

Protected بودن صرفاً styling نیست؛ action surface را محدود می‌کند.

---

# ۱۰. Rule Catalog نهایی MVP

Discussion 017 هفت خانواده‌ی rule را نهایی می‌کند.

---

## R1 — Repeated Carry Task

شرط:

```txt
Task.status = ACTIVE
carryCount >= 2
```

actionهای مجاز:

```txt
REPLAN_TO_EXPLICIT_DATE
MOVE_TO_BACKLOG
SPLIT_TASK
DROP_TASK when safe
KEEP_UNCHANGED
```

قواعد:

- Carry اول عادی است.
    
- Carry count مربوط به همان Task identity است.
    
- تغییر reviewDate، Carry حساب نمی‌شود.
    
- Drop فقط برای Task غیرprotected و بدون deadline risk مجاز است.
    

---

## R2 — Old Execution-Unresolved Task

این rule فقط برای execution placement قدیمی است، نه review checkpoint.

شرط:

```txt
Task.status = ACTIVE
executionAgeDays >= 7 local days
```

actionها:

```txt
REPLAN_TO_EXPLICIT_DATE
MOVE_TO_BACKLOG
DROP_TASK when safe
KEEP_UNCHANGED
```

## نکته

threshold هفت‌روزه‌ی این rule با threshold severity در 016 یکی نیست.

ممکن است یک Task rule R2 را match کند ولی severity کل session فقط Medium باشد.

```txt
rule match
≠ severity band
```

---

## R3 — Deadline Risk

شرط:

```txt
deadline exists
Task unresolved
remaining execution window <= deterministic threshold
```

actionهای مجاز:

```txt
SCHEDULE_NEXT_ACTION
SPLIT_TASK
REVIEW_CONFLICTING_TASKS
KEEP_WITH_ACKNOWLEDGED_RISK
```

ممنوع:

- Drop خودکار
    
- concealing Backlog suggestion
    

برای Task دارای deadline، «بفرستیمش Backlog تا صفحه خلوت شود» همان نوع هوشمندی است که معمولاً کمی قبل از فاجعه دیده می‌شود.

---

## R4 — Routine Mismatch Candidate

شرط:

```txt
Routine.status = ACTIVE
postCalibrationObservedOccurrenceCount >= 6
missedRatio >= 0.5
evidenceQuality = SUFFICIENT
```

actionها:

```txt
CHANGE_ROUTINE_DAYS
REDUCE_ROUTINE_FREQUENCY
REVIEW_ROUTINE_TIME
STOP_ROUTINE
KEEP_ROUTINE_UNCHANGED
```

## Guardrailهای evidence

- calibration period count نمی‌شود
    
- raw reconstructed Missed count استفاده نمی‌شود
    
- absence-contaminated data کافی نیست
    
- evidence quality یک‌بار canonical محاسبه و توسط rule مصرف می‌شود
    

Stop confirmation می‌خواهد و Resume بعدی Routine جدید می‌سازد.

---

## R5 — Project Execution Overload Candidate

برای جلوگیری از مشکل small-project blindness، دو branch دارد.

### Absolute branch

```txt
activeTaskCount >= 4
AND repeatedCarryTaskCount >= 2
```

### Proportional branch

```txt
activeTaskCount >= 2
AND repeatedCarryTaskCount >= 2
AND repeatedCarryTaskCount / activeTaskCount >= 0.5
```

و حداقل:

```txt
2 observed periods
2 affected Tasks
```

لازم است.

actionها:

```txt
MOVE_SELECTED_TASKS_TO_BACKLOG
SPLIT_SELECTED_TASKS
KEEP_PROJECT_UNCHANGED
```

AI باید exact evidence را نمایش دهد:

- تعداد Task فعال
    
- تعداد repeated Carry
    
- ratio
    
- Taskهای affected
    
- observed periods
    

جمله‌ی مبهم زیر مجاز نیست:

> به‌نظر می‌رسد این Project برای تو سنگین است.

نسخه‌ی معتبر:

> از ۴ Task فعال این Project، ۲ Task در دو دوره‌ی قابل‌مشاهده حداقل دوبار جابه‌جا شده‌اند.

اولی شخصیت‌خوانی است. دومی evidence.

---

## R6 — Structural Lifecycle Conflict

این rule AI-discovered نیست، کاملاً deterministic است.

مثلاً:

```txt
Complete Project
+ active child Tasks
→ structural conflict
```

فقط actionهای lifecycle پذیرفته‌شده‌ی Discussion 015 را نمایش می‌دهد.

AI می‌تواند توضیح دهد:

- کدام childها مانع‌اند
    
- هر action چه consequenceای دارد
    

اما نمی‌تواند برای کاربر انتخاب کند.

---

## R7 — Review Checkpoint Resolution

این rule lane مربوط به commitment review را استفاده می‌کند.

### Task checkpoint

```txt
SCHEDULE_TO_EXPLICIT_DATE
KEEP_IN_BACKLOG_WITH_NEW_REVIEW_DATE
KEEP_CURRENT_PLACEMENT_WITH_NEW_REVIEW_DATE
DROP_TASK when safe
```

### Project checkpoint

```txt
KEEP_WITH_NEW_REVIEW_DATE
ADJUST_CHILD_EXECUTION
COMPLETE_PROJECT
STOP_PROJECT
```

### Goal checkpoint

از Goal Continuation Check استفاده می‌کند.

همچنان:

```txt
REVIEW_DUE
does not inflate execution severity
```

---

# ۱۱. Bulk Action چه زمانی مجاز است؟

Bulk suggestion فقط وقتی مجاز است که:

- همه‌ی itemها یک rule را match کنند
    
- همه action مشترک داشته باشند
    
- protected itemها حذف شده باشند
    
- همه‌ی affected itemها visible باشند
    
- consequences preview شوند
    
- کاربر صریحاً confirm کند.
    

## Bulk-safe candidates

```txt
MOVE_SELECTED_TASKS_TO_BACKLOG
REPLAN_SELECTED_TASKS_TO_ONE_EXPLICIT_DATE
KEEP_SELECTED_ITEMS
DROP_SELECTED_TASKS only when all safe
```

---

# ۱۲. consequence خالی‌شدن parent

قبل از bulk Backlog یا Drop، اگر نتیجه این باشد که Project یا Goal هیچ work اجرایی فعالی نداشته باشد، سیستم باید هشدار دهد.

مثلاً:

```txt
Drop 4 selected Tasks
→ Project will have no active executable work
→ Project remains ACTIVE
```

این consequence باید قبل از confirmation visible باشد.

## تصمیم مهم

خالی‌شدن Project:

```txt
does not automatically complete or stop Project
```

lifecycle parent فقط با action جداگانه‌ی کاربر تغییر می‌کند.

---

# ۱۳. چه actionهایی bulk نمی‌شوند؟

item-level confirmation برای این‌ها الزامی است:

- completion
    
- correction تاریخی
    
- splitting
    
- stopping Routine
    
- reparenting
    
- Drop دارای contextual risk
    
- تمام parent terminal actionها.
    

دلیلش روشن است: consequence این actionها فقط «تغییر چند row» نیست؛ history، ownership یا lifecycle را تغییر می‌دهند.

---

# ۱۴. تعداد recommendationها

Recommendationها باید:

```txt
limited
prioritized
consolidated
chunked
```

باشند.

exact numeric limit به UX و validation واگذار شده.

## تصمیم مهم

برای item ساده، AI text لازم نیست.

مثلاً یک Task از دیروز:

```txt
Complete
Reschedule
Move to Backlog
Drop
```

می‌تواند quick action deterministic داشته باشد.

لازم نیست AI پاراگرافی تولید کند درباره‌ی «بازنگری در تعهدات». گاهی مفیدترین هوشمندی، تولیدنکردن متن اضافه است. اتفاقی نادر و ارزشمند.

---

# ۱۵. Evidence and Rationale Contract

هر recommendation باید این اطلاعات را حفظ کند:

```txt
matchedRuleId and version
affectedEntityIds
observedMetrics
reasonCodes
exact problem statement
allowedActions
consequence summary
evidenceQuality
```

## rationale فقط fact را توضیح می‌دهد

مجاز:

> این Task در ۱۰ روز گذشته دو بار به تاریخ جدید منتقل شده است.

غیرمجاز:

> احتمالاً انگیزه‌ی کافی برای انجام این Task نداری.

ممنوع:

- motivation
    
- productivity identity
    
- discipline
    
- lifestyle fit
    
- personal failure
    
- Goal meaning
    
- unsupported capacity
    

همچنین confidence percentage ساختگی نمایش داده نمی‌شود.

```txt
AI confidence: 87%
```

وقتی هیچ calibration معتبر برای این درصد وجود ندارد، فقط ریاضی تزئینی است.

---

# ۱۶. مرز Reconcile و Adaptive Planning

Reconcile می‌تواند evidence ساختاریافته تولید کند:

- Task completed، replanned، Backlog یا dropped
    
- Routine تغییر یا Stopشده
    
- review deferred
    
- intent reaffirmed
    
- recommendation accepted یا rejected
    
- evidence quality
    
- absence contamination.
    

اما Reconcile نمی‌تواند:

- هفته‌ی جدید را silently regenerate کند
    
- future workload را خودکار تغییر دهد
    
- long-term capacity را حدس بزند
    
- یک session را اجازه‌ی broad adaptation بداند
    

می‌تواند entry به یک planning review جدا ارائه دهد.

```txt
Reconcile resolves past decisions.
Adaptive Planning redesigns future execution.
```

---

# ۱۷. سناریوهای کلیدی

## یک Task تازه‌ی overdue

```txt
deterministic quick actions
no AI interpretation
```

## Task با دو Carry

```txt
R1 matched
exact carry count shown
limited actions
```

## Routine با داده‌ی calibration یا absence

R4 match نمی‌شود تا:

```txt
6 post-calibration observed occurrences
+
sufficient evidence
```

وجود داشته باشد.

## Project دو Taskه که هر دو repeated Carry دارند

R5 proportional branch می‌تواند بعد از دو observed period match شود.

## ده review checkpoint بدون overdue

```txt
commitment-review lane
grouped and chunked
execution severity unchanged
```

## Goal checkpoint

- prompt ثابت
    
- سه action محدود
    
- suppression سی‌روزه
    
- بدون پرسش علت یا احساس
    

## Bulk Drop که Project را خالی می‌کند

- consequence preview می‌شود
    
- Project خودکار Stop یا Complete نمی‌شود.
    

---

# ۱۸. اثر Discussion 017 روی مپ

این Discussion مستقیماً روی این بخش‌ها اثر دارد:

```txt
Product Vision
MVP Core Loop
Reconcile User Flow
AI Responsibilities
AI Guardrails
Authority and Confirmation
Data Events
Current Decisions
Metrics and Validation
```

---

## A. Product Vision

اثر اصلی:

```txt
AI organizes operational evidence.
AI does not guess about the user.
```

همچنین:

- commitmentها temporally visible می‌مانند
    
- Backlog deferral آگاهانه است
    
- review failure تلقی نمی‌شود.
    

### وضعیت مپ

Vision فعلی می‌گوید:

```txt
AI reduces decision space
user authorizes consequences
```

این دقیقاً essence تصمیم 017 است.

### نتیجه

```txt
Product Vision → ACCEPTED
```

---

## B. MVP Core Loop

flow مورد انتظار:

```txt
Open Reconcile
→ deterministic cleanup
→ temporal derivation
→ ownership and lane grouping
→ bounded rule matching
→ exact evidence and limited actions
→ explicit user decision
→ structured evidence handoff
```

### وضعیت مپ

مپ فعلی:

```txt
derive facts
→ clean/deduplicate
→ calculate severity
→ separate lanes
→ optional bounded AI
→ preview/confirmation
→ deterministic mutation
```

را نمایش می‌دهد.

تفاوت فقط سطح abstraction است. Rule matching در عبارت optional bounded AI و formal specs پوشش داده می‌شود.

### نتیجه

```txt
MVP Core Loop → ACCEPTED
```

---

## C. Reconcile User Flow

اثرهای لازم:

- execution-decision lane
    
- commitment-review lane
    
- Goal Continuation Check
    
- grouped/chunked checkpoint burst
    
- parent-empty bulk consequence preview.
    

### وضعیت مپ

دو lane و bounded recommendation در مپ وجود دارند.

جزئیات Goal cadence، protected items و parent-empty preview در node سطح بالا نیستند، اما باید در UX و specs باشند. این omission برای Mind Map سطح محصول قابل‌قبول است.

### نتیجه

```txt
Reconcile Flow → ACCEPTED
```

---

## D. AI Responsibilities

AI مجاز است:

- matched rule را توضیح دهد
    
- فقط predefined action نشان دهد
    
- recommendationهای تکراری را consolidate کند
    
- resolved evidence را summarize کند.
    

### وضعیت مپ

Node AI Responsibilities می‌گوید AI:

- recommendation bounded می‌سازد
    
- deterministic evidence را توضیح می‌دهد
    
- fact یا authority خلق نمی‌کند
    

کاملاً سازگار است.

### نتیجه

```txt
AI Responsibilities → ACCEPTED
```

---

## E. AI Guardrails

Guardrailهای مستقیم 017:

```txt
no causal questions
no emotional questions
no motivation/capacity questions
no free-text rule matching
no recommendation without rule
no destructive suggestion for protected items
no Goal/Project lifecycle inference
no conflation of review and overdue
```

### وضعیت مپ

مپ اصول کلی زیر را دارد:

- no diagnosis
    
- no hidden causes
    
- no autonomous mutation
    
- no Goal outcome inference
    
- deterministic facts before AI
    
- review lane separate
    

این‌ها تصمیم 017 را به‌درستی پوشش می‌دهند.

### نتیجه

```txt
AI Guardrails → ACCEPTED
```

---

## F. Authority and Confirmation

017 مرز authority را روشن‌تر می‌کند:

```txt
rule match
→ allowed action
→ visible consequence
→ explicit selection
→ confirmation
```

Bulk action نیز confirmation و preview می‌خواهد.

این با node Authority فعلی سازگار است:

```txt
visible consequences
→ explicit confirmation
→ commit-time revalidation
→ atomic mutation
```

### نتیجه

```txt
Authority Boundary → ACCEPTED
```

---

## G. Product Model

017 lifecycle تازه‌ای اختراع نمی‌کند.

- `REVIEW_LATER` حالت Paused نمی‌سازد.
    
- Project خالی خودکار terminal نمی‌شود.
    
- Goal abandonment از flow رسمی 015 استفاده می‌کند.
    
- Routine Stop و continuation semantics حفظ می‌شوند.
    
- Task Backlog placement است، نه status.
    

### نتیجه

```txt
Product Model consistency → ACCEPTED
```

---

## H. Data Events

eventهای مفهومی موردنیاز:

```txt
RECONCILE_RULE_EVALUATED
RECONCILE_RULE_MATCHED
RECONCILE_RECOMMENDATION_PRESENTED
RECONCILE_RECOMMENDATION_ACCEPTED
RECONCILE_RECOMMENDATION_REJECTED
RECONCILE_BULK_PREVIEWED
RECONCILE_BULK_CONFIRMED
TEMPORAL_CHECKPOINT_REACHED
ENTITY_REVIEW_DEFERRED
ENTITY_INTENT_REAFFIRMED
GOAL_CONTINUATION_PRESENTED
GOAL_CONTINUATION_RESOLVED
```

authority نهایی schema متعلق به 019C است.

مپ درست عمل می‌کند و این dependency را به event specification واگذار کرده است.

### نتیجه

```txt
Data Events impact → ACCEPTED
```

---

## I. Metrics و Validation

Discussion 021 باید تست کند:

- rule match deterministic
    
- thresholdها
    
- evidence quality
    
- calibration exclusion
    
- absence contamination
    
- protected item filtering
    
- free-text exclusion
    
- Goal cadence
    
- burst chunking
    
- parent-empty warning
    
- forbidden inferenceها.
    

### وضعیت مپ

مپ hard gateهای safety، determinism و trust را دارد.

جزئیات rule-specific در validation plan نگه داشته شده‌اند، که محل درستشان همان‌جاست.

### نتیجه

```txt
Validation dependency → ACCEPTED
```

---

# ۱۹. Finding مهم درباره‌ی ساختار اسناد

فایل اصلی صریحاً می‌گوید:

> earlier drafts and intermediate amendment were removed; this document is the sole authority.

اما خلاصه‌ی فارسی انتهای همان فایل می‌گوید:

```txt
۰۱۷A اثرات temporal آن را برای Mind Map تجمیع می‌کند
```

این wording کمی گمراه‌کننده است، چون در status گفته شده amendment میانی حذف و داخل فایل نهایی consolidate شده است.

بااین‌حال از نظر semantics تناقضی ایجاد نمی‌کند؛ authority بالای سند کاملاً روشن است.

و چون تصمیم گرفته‌ایم تغییرات غیرضروری انجام ندهیم:

```txt
017-DOC-01
Persian summary references 017A despite consolidated sole-authority status
Severity: Minor documentation wording
Action: None
```

---

# ۲۰. آیا تعارض محصولی پیدا شد؟

## با Discussion 016

کاملاً سازگار است:

- 016 eligibility و severity را می‌دهد
    
- 017 rule و action را می‌دهد
    
- review lane جدا باقی می‌ماند
    
- Today قفل نمی‌شود
    

## با Discussion 015

سازگار است:

- Carry placement است
    
- Routine Stop confirmation می‌خواهد
    
- continuation entity جدید است
    
- parent terminal flow رسمی حفظ می‌شود
    
- history بازنویسی نمی‌شود
    

## با 012A و 016A

سازگار است:

- review checkpointها deterministic هستند
    
- Goal Continuation intent فعلی را ثبت می‌کند
    
- review due execution failure نیست
    
- deferral reviewDate جدید می‌خواهد
    

## با Authority بعدی 018

017 فقط action options و confirmation requirement را تعریف می‌کند. transaction، reversibility، stale state و commit authority را به Discussion 018 و بعدتر واگذار می‌کند.

## با مپ

هیچ missing section یا contradiction مهم پیدا نشد.

---

# جمع‌بندی وضعیت مپ

```txt
Deterministic facts before AI               ACCEPTED
Versioned bounded rules                     ACCEPTED
Predefined action catalog                   ACCEPTED
No free-text rule matching                  ACCEPTED
No psychological questioning                ACCEPTED
Goal Continuation Check                     ACCEPTED
Neutral fixed wording                       ACCEPTED
30-day per-Goal cadence                     ACCEPTED AT SPEC LEVEL
Ownership-first grouping                    ACCEPTED
No semantic grouping by text similarity     ACCEPTED AT SPEC LEVEL
Protected-item rules                        ACCEPTED AT SPEC LEVEL
Repeated Carry rule                         ACCEPTED
Old unresolved Task rule                    ACCEPTED
Deadline-risk rule                          ACCEPTED
Routine mismatch evidence gate              ACCEPTED
Small-Project proportional overload rule    ACCEPTED
Structural-conflict rule                    ACCEPTED
Commitment-review actions                   ACCEPTED
Bulk action preview and confirmation        ACCEPTED
Parent-empty consequence warning            ACCEPTED AT SPEC LEVEL
No automatic parent terminal transition     ACCEPTED
Evidence and rationale contract             ACCEPTED
Reconcile/Adaptive Planning separation      ACCEPTED
```

# تعریف یک‌جمله‌ای Discussion 017

```txt
Reconcile فقط بر canonical factها، metricهای deterministic
و ruleهای versioned تکیه می‌کند؛
AI نتیجه‌ی rule را با evidence دقیق توضیح می‌دهد،
فقط actionهای ازپیش‌تعیین‌شده را نشان می‌دهد،
و هیچ recommendation یا lifecycle change
بدون انتخاب و تأیید صریح کاربر اعمال نمی‌شود.
```

## نتیجه نهایی

```txt
Discussion 017       ACCEPTED
Map projection       ACCEPTED
Product conflict     NONE
Blocking omission    NONE
Required change      NONE
Minor doc wording    consolidated 017 vs 017A reference
```

مرحله‌ی بعد **Discussion 018 و 018A** است: authority، confirmation، reversibility، failure، privacy، hostile input، crisis handling و اینکه پیشنهاد تأییدشده در چه شرایطی هنوز نباید commit شود.