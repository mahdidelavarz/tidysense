# مرور Discussion 015، 015A و 015B

## اجرای روزانه، Today، Carry، RoutineOccurrence و حفظ حقیقت تاریخی

این خانواده‌ی تصمیم مشخص می‌کند بعد از تأیید PlanningDraft، برنامه چگونه وارد زندگی روزمره می‌شود.

سه سند نقش‌های جدا دارند:

```txt
015
→ مدل اصلی اجرای Task، Routine، RoutineOccurrence و Today

015A
→ معنای دقیق تاریخ‌ها، Backlog و REVIEW_DUE

015B
→ هویت روزانه‌ی occurrence و مرزهای local-date مربوط به Routine
```

اصل مشترک هر سه سند این است:

```txt
سیستم باید آنچه واقعاً اتفاق افتاده را ثبت کند،
نه اینکه برای مرتب‌ماندن صفحه،
گذشته را بازنویسی یا کارهای عقب‌افتاده را مخفیانه جابه‌جا کند.
```

---

# ۱. مسئله‌ی اصلی چه بود؟

تا قبل از Discussion 015، می‌دانستیم:

- چه موجودیت‌هایی داریم
    
- AI چه draftی تولید می‌کند
    
- approval چه مرزی دارد
    
- Task و Routine چه تفاوت مفهومی دارند
    

اما هنوز execution semantics روشن نبود:

- Today چگونه ساخته می‌شود؟
    
- Task چه زمانی وارد Today می‌شود؟
    
- آیا overdue یک status است؟
    
- آیا Task عقب‌افتاده خودکار به امروز منتقل می‌شود؟
    
- Carry دقیقاً چیست؟
    
- Routine چگونه اجرا می‌شود؟
    
- اگر اپ چند روز باز نشود، occurrenceها چه می‌شوند؟
    
- آیا Missed بدهی محسوب می‌شود؟
    
- آیا تاریخچه قابل اصلاح است؟
    
- آیا Routine متوقف‌شده دوباره Active می‌شود؟
    
- وقتی Project یا Goal تمام می‌شود، childهای فعال چه می‌شوند؟
    
- timezone و local date چگونه رفتار می‌کنند؟
    

Discussion 015 این behaviorها را می‌بندد و اجرای روزانه را از Reconcile و Adaptive Planning جدا می‌کند.

---

# ۲. جدایی Execution، Reconcile و Adaptive Planning

سه responsibility متفاوت داریم.

## Execution

ثبت می‌کند چه اتفاقی برای کار canonical افتاده است:

```txt
Task:
complete / carry / drop / unresolved

RoutineOccurrence:
done / missed

Project:
complete / stop

Routine:
stop
```

## Reconcile

کارهای حل‌نشده یا ناسازگار گذشته را برای تصمیم آگاهانه جمع می‌کند.

مثلاً:

- Task تاریخش گذشته ولی هنوز Active است
    
- Task بارها Carry شده
    
- occurrenceهای گذشته نیاز به correction دارند
    
- parent در حال terminal شدن است ولی child فعال دارد
    

## Adaptive Planning

با استفاده از evidence قابل‌اعتماد، برای آینده پیشنهاد تغییر workload یا schedule می‌دهد.

اصل‌های مهم:

```txt
absence is not failure
missing data is not negative evidence
one weak period is not a stable pattern
major adaptation needs repeated reliable evidence
or explicit user feedback
```

یعنی اگر کاربر یک ماه اپ را باز نکرد، سیستم حق ندارد نتیجه بگیرد:

> ظرفیت تو پایین آمده؛ برنامه را نصف کردم.

شاید کاربر اپ را حذف کرده، اینترنت نداشته یا صرفاً حوصله‌ی گزارش‌دادن به نرم‌افزار را نداشته است. رفتارهایی که عجیب نیستند، برخلاف اعتماد بعضی سیستم‌ها به telemetry ناقص.

---

# ۳. Today چیست؟

Today یک موجودیت canonical یا Plan ذخیره‌شده نیست.

بلکه یک view مشتق‌شده از local date است:

```txt
Today(localDate)
=
active Tasks with plannedDate = localDate
+
pending RoutineOccurrences scheduled for localDate
+
entry points for unresolved earlier work
```

Goal و Project فقط context و grouping می‌دهند؛ خودشان checklist اجرایی نیستند.

## قانون ورود Task به Today

تنها source of truth:

```txt
Task.status = ACTIVE
AND
Task.plannedDate = currentLocalDate
```

فرقی نمی‌کند Task:

- standalone باشد
    
- مستقیم متعلق به Goal باشد
    
- متعلق به Project باشد
    

ownership روی eligibility Today اثر ندارد.

## پیامدهای این تصمیم

- Task بدون تاریخ هر روز ظاهر نمی‌شود.
    
- Task آینده زودتر وارد Today نمی‌شود.
    
- Task کامل یا Dropشده اجراشدنی نیست.
    
- Carry به امروز یعنی `plannedDate` واقعاً به امروز تغییر می‌کند.
    
- membership پنهان دوم برای Today وجود ندارد.
    

---

# ۴. Overdue status نیست

Task overdue وقتی است که:

```txt
Task.status = ACTIVE
AND
Task.plannedDate < currentLocalDate
```

`OVERDUE` یک derived condition است، نه lifecycle state.

بنابراین lifecycle Task همچنان:

```txt
ACTIVE → COMPLETED | DROPPED
```

است.

Task عقب‌افتاده:

- Active باقی می‌ماند
    
- تاریخ قبلی‌اش حفظ می‌شود
    
- خودکار به امروز منتقل نمی‌شود
    
- Reconcile-eligible می‌شود
    
- جدا از checklist عادی Today نمایش داده می‌شود
    

## دلیل جداسازی overdue از Today

اگر همه‌ی Taskهای عقب‌افتاده هر روز داخل Today ریخته شوند، Today خیلی سریع تبدیل می‌شود به انبار بدهی گذشته.

تصمیم پذیرفته‌شده:

```txt
Today = کارهای واقعاً برنامه‌ریزی‌شده‌ی امروز

Unresolved/Reconcile =
کارهای گذشته که هنوز تصمیم می‌خواهند
```

---

# ۵. مدل اجرای Task

## Complete

تکمیل Task:

- status را `COMPLETED` می‌کند
    
- زمان ثبت completion را نگه می‌دارد
    
- effective local date اعلام‌شده توسط کاربر را ثبت می‌کند
    
- Task را از اجرای فعال خارج می‌کند
    
- ownership و history را حفظ می‌کند
    
- Project یا Goal والد را خودکار کامل نمی‌کند.
    

## Drop

Drop یعنی کاربر دیگر قصد انجام آن Task را ندارد.

پیامد:

- status به `DROPPED` می‌رود
    
- placement فعال حذف می‌شود
    
- history و parent باقی می‌مانند
    
- ممکن است evidence برای Reconcile باشد
    
- siblingها خودکار تغییر نمی‌کنند.
    

---

# ۶. Carry چیست؟

Carry یک transition صریح placement است:

```txt
Task remains ACTIVE
old plannedDate → new plannedDate
Carry event recorded
```

قواعد:

- فقط Task فعال Carry می‌شود.
    
- destination date باید صریح باشد.
    
- Task جدید ساخته نمی‌شود.
    
- identity و ownership حفظ می‌شوند.
    
- `plannedDate` جدید source of truth می‌شود.
    
- Carry history حفظ می‌شود.
    
- نیمه‌شب هیچ Carry مخفی انجام نمی‌دهد.
    

## Carry status نیست

نباید lifecycle چنین چیزی شود:

```txt
ACTIVE → CARRIED → ACTIVE
```

بلکه:

```txt
status remains ACTIVE
placement changes
```

این تمایز برای metrics و history مهم است. تعداد Carryها از eventهای واقعی placement محاسبه می‌شود، نه از status فعلی.

---

# ۷. Task حل‌نشده‌ی گذشته

اگر تاریخ Task بگذرد و هیچ‌کدام از این‌ها اتفاق نیفتد:

- Complete
    
- Drop
    
- Carry
    

آنگاه:

```txt
Task stays ACTIVE
old plannedDate remains
no automatic new date
Task becomes Reconcile-eligible
```

این یعنی سیستم واقعیت را جعل نمی‌کند.

اگر Task سه‌شنبه انجام نشده، چهارشنبه نباید تاریخش را عوض کند و وانمود کند از اول برای چهارشنبه بوده است. بعضی سیستم‌ها این کار را «smart scheduling» می‌نامند. تاریخ احتمالاً نظر دیگری دارد.

---

# ۸. correction تاریخی Task

کاربر ممکن است بعداً بگوید:

> این Task را شنبه انجام دادم، فقط آن موقع ثبت نکردم.

سیستم دو زمان را جدا نگه می‌دارد:

```txt
recordedAt
= چه زمانی correction ثبت شد

completedForLocalDate
= کاربر می‌گوید کار چه روزی انجام شد
```

اصول:

- محدودیت قطعی هفت‌روزه برای correction وجود ندارد.
    
- غیبت طولانی نباید حقیقت تاریخی را برای همیشه غیرقابل‌اصلاح کند.
    
- event اصلی حذف نمی‌شود.
    
- correction قدیمی یا consequential می‌تواند confirmation قوی‌تر بخواهد.
    

---

# ۹. Restore کردن Task

Task کامل یا Dropشده می‌تواند با correction صریح دوباره `ACTIVE` شود.

اما:

- terminal event قبلی باقی می‌ماند
    
- Task تاریخ جدید می‌گیرد یا undated می‌شود
    
- restoration history را overwrite نمی‌کند.
    

اصل consistency:

> یک entity فقط وقتی درجا restore می‌شود که بازگشت status باعث ازسرگیری رفتار generative یا cascade نشود.

Task قابل Restore است چون:

- occurrence تولید نمی‌کند
    
- child cascade ندارد
    

اما Routine یا Project درجا reopen نمی‌شوند.

---

# ۱۰. مدل اجرای Routine

Lifecycle:

```txt
ACTIVE → STOPPED
```

در MVP حالت canonical به نام `PAUSED` وجود ندارد.

Routine متوقف‌شده به‌عنوان همان entity دوباره `ACTIVE` نمی‌شود.

## Resume چه معنایی دارد؟

UI می‌تواند دکمه‌ی Resume نشان دهد، اما معنای محصولی آن:

```txt
old Routine remains STOPPED
→ create new ACTIVE continuation Routine
```

Routine قدیمی و occurrenceهایش دست‌نخورده می‌مانند.

Routine جدید می‌تواند:

- recurrence متفاوت داشته باشد
    
- ownership متفاوت داشته باشد
    
- از نسخه‌ی قبلی به‌عنوان editable source استفاده کند
    
- رابطه‌ی مفهومی `continuesFrom` داشته باشد
    

## چرا همان Routine دوباره Active نمی‌شود؟

چون Routine رفتار generative دارد.

اگر entity قدیمی reopen شود، باید مشخص کنیم:

- recurrence قبلی از چه تاریخی دوباره شروع می‌شود؟
    
- gap میان Stop و Resume چه معنایی دارد؟
    
- occurrenceهای احتمالی آن دوره چه می‌شوند؟
    
- metrics یک Routine حساب می‌شوند یا دو phase؟
    

ساخت continuation جدید، تاریخچه را شفاف نگه می‌دارد.

---

# ۱۱. Stop و تغییر recurrence

Stop:

- occurrenceهای آینده را بعد از boundary متوقف می‌کند
    
- history را حفظ می‌کند
    
- occurrenceهای گذشته را به Done تبدیل نمی‌کند
    
- Missedها را Carry نمی‌کند.
    

تغییر recurrence به‌صورت prospective اعمال می‌شود.

default:

```txt
effectiveDate = next local date after edit
```

اعمال از امروز فقط وقتی مجاز است که occurrence امروز هنوز `PENDING` باشد و پیامد آن شفاف نمایش داده شود.

قواعد:

- occurrenceهای گذشته regenerate نمی‌شوند
    
- occurrence Done یا Missed امروز replace نمی‌شود
    
- آینده از effective date دوباره محاسبه می‌شود
    
- same-day change confirmation صریح می‌خواهد
    

---

# ۱۲. RoutineOccurrence چیست؟

یک occurrence یعنی:

```txt
one Routine
+ one scheduled local date
```

در MVP:

```txt
at most one ordinary RoutineOccurrence
per Routine per local date
```

هویت اصلی که 015B نهایی می‌کند:

```txt
(routineId, scheduledLocalDate)
```

## رفتار دوبار در روز

اگر رفتار باید روزی دو بار اجرا شود، در MVP دو Routine جدا ساخته می‌شود:

```txt
Take morning medication
Take evening medication
```

یک Routine واحد با دو slot روزانه فعلاً پشتیبانی نمی‌شود.

این تصمیم ساده‌سازی مهم MVP است و جلوی تغییر پیچیده‌ی identity occurrence را می‌گیرد.

---

# ۱۳. occurrence چگونه ساخته می‌شود؟

رفتار کاربر نباید وابسته باشد به اینکه occurrence:

- از قبل در دیتابیس materialize شده
    
- یا هنگام query مشتق شده
    

semantics لازم:

- occurrence امروز هنگام ساخت Today در دسترس باشد
    
- روزهای گذشته deterministic reconstruct شوند
    
- duplicate occurrence ممنوع باشد
    
- projection آینده که دست‌نخورده است، historical fact محسوب نشود.
    

## در صورت بازنکردن اپ

وقتی اپ چند روز باز نشده:

- scheduled dateهای گذشته از recurrence بازسازی می‌شوند
    
- occurrenceهای حل‌نشده‌ی گذشته `MISSED` می‌شوند
    
- به بدهی Carryشونده‌ی Today تبدیل نمی‌شوند
    
- کاربر بعداً می‌تواند correction انجام دهد.
    

---

# ۱۴. lifecycle occurrence

```txt
PENDING → DONE
PENDING → MISSED
```

MVP حالت canonical به نام `SKIPPED` ندارد.

معنا:

- `DONE`: رفتار scheduled رخ داده است
    
- `MISSED`: تا resolution boundary به‌عنوان Done ثبت نشده است
    

علت‌هایی مثل:

- بیماری
    
- استراحت آگاهانه
    
- نامرتبط‌بودن در آن روز
    

ممکن است feedback اختیاری باشند، نه statusهای تازه.

## Missed خنثی است

```txt
MISSED
≠ punishment
≠ moral failure
≠ streak debt
```

این فقط یک execution fact است.

---

# ۱۵. Resolution boundary

Occurrence `PENDING` بعد از پایان local date مربوط به خود و در اولین evaluation بعدی، `MISSED` می‌شود.

نیازی نیست نیمه‌شب background job حتماً اجرا شود.

مثلاً:

```txt
Routine occurrence for Monday
app next opens Wednesday
→ Monday occurrence resolves as MISSED
```

معنای محصول مستقل از زمان اجرای job فنی باقی می‌ماند.

---

# ۱۶. correction تاریخی occurrence

کاربر می‌تواند صریحاً اصلاح کند:

```txt
MISSED → DONE
DONE → MISSED
```

اما:

- `scheduledLocalDate` تغییر نمی‌کند
    
- correction time ثبت می‌شود
    
- history قبلی auditable می‌ماند
    
- occurrence Carry نمی‌شود
    
- محدودیت قطعی هفت‌روزه وجود ندارد.
    

## No Carry

انجام رفتار امروز، occurrence ازدست‌رفته‌ی دیروز را منتقل یا duplicate نمی‌کند.

مثلاً:

```txt
Monday workout = MISSED
Tuesday workout = DONE
```

نه:

```txt
Monday workout carried to Tuesday
```

---

# ۱۷. معنای تاریخ‌ها در 015A

چهار تاریخ جدا داریم:

```txt
plannedDate
→ intended execution date of Task

deadline
→ latest meaningful external boundary

reviewDate
→ date to reconsider commitment or placement

targetDate
→ Goal or Project target boundary
```

این‌ها مترادف نیستند و ممکن است هم‌زمان وجود داشته باشند.

---

# ۱۸. Today فقط execution است

قانون Today تغییر نمی‌کند:

```txt
Task appears in Today
iff
status = ACTIVE
AND plannedDate = currentLocalDate
```

بنابراین اگر `reviewDate` امروز باشد ولی `plannedDate` امروز نباشد، Task وارد Today نمی‌شود.

Review checkpoint باید در:

- Reconcile
    
- یا review surface مجزا
    

دیده شود، نه checklist execution.

---

# ۱۹. `EXECUTION_OVERDUE` و `REVIEW_DUE`

```txt
EXECUTION_OVERDUE
=
Task ACTIVE
AND plannedDate < currentLocalDate
```

```txt
REVIEW_DUE
=
entity ACTIVE
AND reviewDate <= currentLocalDate
AND checkpoint has not been moved by later resolution
```

یک entity ممکن است هر دو reason را هم‌زمان داشته باشد، ولی باید به‌عنوان یک مورد با چند reason نمایش داده شود، نه دو کارت تکراری.

`REVIEW_DUE`:

- failure نیست
    
- missed execution نیست
    
- debt نیست
    
- lifecycle را تغییر نمی‌دهد
    

---

# ۲۰. Task placement

دو placement مفهومی داریم:

```txt
SCHEDULED
→ plannedDate exists

BACKLOG
→ no current execution placement
→ reviewDate exists
```

Backlog صرفاً از `plannedDate = null` استنتاج نمی‌شود؛ یک تصمیم صریح کاربر یا draft تأییدشده است.

Invariant:

```txt
ACTIVE Task
→ plannedDate exists
OR reviewDate exists
```

Task فعال بدون هر دو، نامعتبر است.

---

# ۲۱. actionهای review checkpoint

وقتی reviewDate Task می‌رسد، actionهای مجاز:

```txt
SCHEDULE_TO_EXPLICIT_DATE
KEEP_IN_BACKLOG_WITH_NEW_REVIEW_DATE
DROP_TASK
KEEP_CURRENT_PLACEMENT_WITH_NEW_REVIEW_DATE
```

قواعد:

- Drop تأیید کاربر می‌خواهد
    
- Keep باید reviewDate آینده تعیین کند
    
- schedule کردن، placement را `SCHEDULED` می‌کند
    
- انتقال به Backlog صریحاً plannedDate را پاک و reviewDate آینده تعیین می‌کند
    

## reviewDate change Carry نیست

```txt
reviewDate changed
≠ Task carried
```

Carry فقط زمانی است که execution placement از یک plannedDate به plannedDate دیگر تغییر کند.

این distinction برای metrics حیاتی است؛ وگرنه هر defer مدیریتی به اشتباه «کار عقب‌انداخته‌شده» شمرده می‌شود.

---

# ۲۲. ترتیب deterministic evaluation

در app-open یا Reconcile boundary:

```txt
1. determine current local date and timezone
2. derive/materialize required RoutineOccurrences
3. derive Task execution-overdue facts
4. derive Goal/Project/Task review-due facts
5. deduplicate entities with multiple reason codes
6. pass reason-coded facts to Reconcile
```

evaluation خودش mutation lifecycle انجام نمی‌دهد.

---

# ۲۳. local-date semantics در 015B

Routine بازه‌ی مؤثر محلی دارد:

```txt
effectiveFromLocalDate
→ first eligible local date

effectiveUntilLocalDate
→ final eligible local date
```

مرزها inclusive هستند.

`createdAt` و `stoppedAt` فقط audit timestamp هستند و جای local date را نمی‌گیرند.

چرا؟

Routine ممکن است ساعت ۲۳:۵۵ در timezone خاصی ساخته یا متوقف شود. timestamp UTC به‌تنهایی پاسخ نمی‌دهد occurrence کدام local day معتبر بوده است.

---

# ۲۴. Stop semantics دقیق Routine

هنگام توقف:

- status به `STOPPED` می‌رود
    
- `stoppedAt` timestamp دقیق را ثبت می‌کند
    
- `effectiveUntilLocalDate` آخرین local day معتبر را ثبت می‌کند
    
- occurrenceهای تاریخی تغییر نمی‌کنند
    
- handling آینده به‌صورت transaction در 019B انجام می‌شود.
    

query occurrence:

```txt
scheduledLocalDate >= effectiveFromLocalDate
AND
(
  effectiveUntilLocalDate IS NULL
  OR scheduledLocalDate <= effectiveUntilLocalDate
)
```

duplicate برای یک `(routineId, scheduledLocalDate)` ممنوع است و retry باید occurrence موجود را برگرداند.

---

# ۲۵. پایان Project و childهای فعال

هیچ Task فعالی نباید زیر Project terminal باقی بماند.

پیش از `COMPLETED` یا `STOPPED` شدن Project، سیستم child Taskهای فعال را نشان می‌دهد و اجازه می‌دهد:

```txt
complete selected Tasks
drop selected Tasks
detach or reparent eligible Tasks
cancel Project transition
```

سیستم نباید childها را خودکار:

- Complete
    
- Drop
    
- preserve
    
- detach
    
- reparent
    

کند.

## Routineهای Project-owned

برای هر دو transition:

```txt
Project ACTIVE
→ COMPLETED | STOPPED
→ active Project-owned Routines STOPPED
```

Routine فقط وقتی زنده می‌ماند که قبل از transition ownership آن صریحاً تغییر کرده باشد.

## operation واحد

این موارد یک operation مؤثر هستند:

- terminal شدن Project
    
- resolution Taskها
    
- توقف خودکار Routineها
    

transaction فنی در Discussion 019B تعریف می‌شود.

---

# ۲۶. occurrence همان روز پایان Project

اگر Project در local date D پایان یابد:

- occurrenceهای قبل از D تاریخی می‌مانند
    
- بعد از D eligibility قطع می‌شود
    
- occurrence Done یا Missed همان روز تغییر نمی‌کند
    
- occurrence Pending همان روز همچنان قابل انجام است
    
- اگر تا پایان روز حل نشود، Missed می‌شود.
    

یعنی پایان Project آینده را متوقف می‌کند، اما occurrenceای که از قبل متعلق به امروز بوده پاک نمی‌شود.

---

# ۲۷. Project terminal دوباره باز نمی‌شود

Project کامل یا Stopشده بعداً به همان entity فعال برنمی‌گردد.

ادامه‌ی تلاش:

```txt
old Project remains terminal
→ create new active phase or Project
```

یک Undo خیلی کوتاه برای action اشتباه ممکن است rollback باشد، ولی reopening بعدی lifecycle نیست.

این همان consistency principle مربوط به entityهای cascadeدار است.

---

# ۲۸. پایان Goal

## Achieve

Achievement فقط با تأیید outcome واقعی توسط کاربر انجام می‌شود.

قبل از finalization، تمام childهای فعال باید دیده و حل شوند:

- Projectها: complete، stop یا detach
    
- Taskها: complete، drop یا detach
    
- Routineها: stop یا detach
    

هیچ child فعالی زیر Goal achieved باقی نمی‌ماند.

## Abandon

default cascade:

- direct Taskها Drop می‌شوند مگر detach شوند
    
- direct Routineها Stop می‌شوند مگر detach شوند
    
- child Projectها Stop می‌شوند مگر detach شوند
    

باز هم هیچ child فعال تحت Goal abandoned باقی نمی‌ماند.

---

# ۲۹. timezone و پایداری تاریخچه

Execution از timezone انتخاب‌شده‌ی IANA استفاده می‌کند:

```txt
Asia/Tehran
Europe/Berlin
America/Toronto
```

UTC برای storage مفید است، اما معنای روزانه بر اساس local date است.

تغییر timezone نباید scheduled dateهای تاریخی را بازنویسی کند.

برای تفسیر تاریخچه باید context کافی حفظ شود:

- scheduled local date
    
- timezone استفاده‌شده
    
- UTC event timestamp
    

در سفر یا تغییر timezone:

- future Today از timezone جدید استفاده می‌کند
    
- recurrence آینده با timezone جدید ارزیابی می‌شود
    
- occurrenceهای گذشته local context قبلی را حفظ می‌کنند
    
- duplicate occurrence ایجاد نمی‌شود
    
- fixed timezone برای هر Routine در MVP وجود ندارد.
    

---

# ۳۰. Reconcile eligibility

## Task

ممکن است Reconcile-eligible شود وقتی:

- تاریخش گذشته و unresolved مانده
    
- بارها Carry شده
    
- درحالی‌که parent فعال است Drop شده
    
- correction یا Restore تاریخی داشته
    
- parent terminal با آن conflict دارد
    

## Routine و occurrence

ممکن است eligible شوند وقتی:

- repeated Missed در periodهای قابل‌ارزیابی وجود دارد
    
- correctionهای تاریخی pattern را تغییر داده‌اند
    
- recurrence بارها edit شده
    
- parent lifecycle Routine را متوقف کرده است
    

یک Missed منفرد intervention بزرگ ایجاد نمی‌کند.

---

# ۳۱. اثر روی مپ

این خانواده تقریباً روی تمام بخش‌های عملیاتی مپ اثر دارد:

```txt
Product Vision
MVP Core Loop
Execution User Flow
Reconcile Flow
AI Responsibilities
AI Guardrails
Data Events
Traction Metrics
Current Decisions
Open Questions
```

---

## A. Product Vision

### اثر مورد انتظار

Vision باید این اصول را منتقل کند:

```txt
Truthful execution, not guilt accumulation
Today is a local-date execution surface
Past unresolved work is consciously resolved
History is correctable but not silently rewritten
Absence is uncertainty, not failure
```

این‌ها صریحاً در Mind Map impact سند 015 ثبت شده‌اند.

### وضعیت مپ

Vision فعلی Today را evidence engine و Reconcile را adaptation engine معرفی می‌کند.

اصل «absence is uncertainty» بیشتر در guardrailها و metrics دیده می‌شود تا متن اصلی Vision. این abstraction قابل‌قبول است؛ Vision قرار نیست تمام lifecycle semantics را حمل کند.

### نتیجه

```txt
Product Vision → ACCEPTED
```

---

## B. MVP Core Loop

اثر اجرای loop:

```txt
approved execution window
→ derive Today
→ resolve Tasks and occurrences
→ surface unresolved past
→ Reconcile explicit decisions
→ reliable repeated evidence
→ future adaptation
```

همراه با invariantهای:

- Carry صریح
    
- occurrence بدون Carry
    
- overdue جدا از Today
    
- یک Missed برای adaptation بزرگ کافی نیست
    
- absence confidence را کاهش می‌دهد.
    

### وضعیت مپ

Core Loop فعلی:

```txt
Today execution
→ deterministic Reconcile evidence
→ optional AI
→ confirmed adaptation
```

جهت درست است. جزئیات Carry و Missed در Execution node قرار گرفته‌اند، نه Core Loop؛ این تقسیم سالم است.

### نتیجه

```txt
MVP Core Loop → ACCEPTED
```

---

## C. Execution User Flow

مپ فعلی صریحاً نشان می‌دهد:

- Today از Taskهای scheduled امروز و occurrenceهای امروز ساخته می‌شود
    
- Carry برای Task صریح است
    
- occurrence فقط Done یا Missed می‌شود
    
- occurrence Carry نمی‌شود
    
- Stop، correction و Restore history را حفظ می‌کنند
    

این دقیقاً هسته‌ی Discussion 015 است.

### مواردی که در متن کوتاه node دیده نمی‌شوند

- overdue surface جدا
    
- Routine Resume به‌عنوان continuation جدید
    
- terminal parent child resolution
    
- local-date effective range
    
- twice-daily behavior با دو Routine
    
- distinction میان reviewDate و Today
    

این‌ها در levelهای formal spec، Current Decisions و flowهای جزئی‌تر قرار دارند و لازم نیست همه در یک node فشرده شوند.

### نتیجه

```txt
Execution User Flow → ACCEPTED
```

---

## D. Overdue و Reconcile Flow

مپ Reconcile دو lane دارد:

```txt
execution lane
commitment-review lane
```

این با تمایز زیر سازگار است:

```txt
EXECUTION_OVERDUE
≠ REVIEW_DUE
```

همچنین unresolved Taskها داخل Today عادی باقی نمی‌مانند و Reconcile-eligible می‌شوند.

### نتیجه

```txt
Overdue / Review separation → ACCEPTED
```

---

## E. Product Model

اثرهای مهم:

- Today entity نیست
    
- OVERDUE status نیست
    
- Carry status نیست
    
- RoutineOccurrence entity مستقل اجرایی است
    
- Routine و Project terminal درجا reopen نمی‌شوند
    
- Task Restore فقط به‌علت نداشتن رفتار generative/cascade مجاز است
    
- terminal parent نمی‌تواند child فعال نگه دارد
    

مپ فعلی اصل‌های مهم را در Product Model و Execution Flow حفظ می‌کند.

### نتیجه

```txt
Product Model impact → ACCEPTED
```

---

## F. AI Responsibilities

AI باید:

- فقط `plannedDate` canonical را برای placement استفاده کند
    
- rule دوم پنهان برای Today نسازد
    
- Carry، Drop، Complete و occurrence outcome را evidence ببیند
    
- missing interaction را با execution failure اشتباه نگیرد
    
- adaptation بزرگ را فقط بر evidence تکرارشده یا feedback صریح بنا کند
    
- در periodهای absence-contaminated confidence را پایین بیاورد
    
- Goal بلندمدت را با تغییر window آینده اشتباه نگیرد.
    

مپ فعلی AI را از creation facts و mutation منع می‌کند و evidence-based recommendation را می‌پذیرد.

### نتیجه

```txt
AI Responsibilities → ACCEPTED
```

---

## G. AI Guardrails

Guardrailهای لازم:

```txt
Absence is not failure
Missing data is not negative evidence
One weak period is not a stable pattern
Carry must be explicit
RoutineOccurrence is never Carried
MISSED is neutral
History is not silently rewritten
Terminal generative entities are not reopened in place
No active child remains under terminal parent
```

### وضعیت مپ

بخش AI Guardrails اصول کلی زیر را دارد:

- no hidden mutation
    
- no unsupported inference
    
- no Goal achievement inference
    
- history and authority boundaries
    
- deterministic facts before AI
    

جزئیات execution-specific در Execution و Current Decisions پخش شده‌اند. این انتقال منطقی است.

### نتیجه

```txt
AI Guardrails → ACCEPTED
```

---

## H. Data Events

سند 015 نیاز مفهومی eventهای زیر را ایجاد می‌کند:

### Task

```txt
TASK_PLANNED_DATE_SET
TASK_COMPLETED
TASK_DROPPED
TASK_CARRIED
TASK_RESTORED
TASK_HISTORY_CORRECTED
```

### Routine

```txt
ROUTINE_CREATED
ROUTINE_STOPPED
ROUTINE_CONTINUATION_CREATED
ROUTINE_RECURRENCE_CHANGED
```

### Occurrence

```txt
ROUTINE_OCCURRENCE_DONE
ROUTINE_OCCURRENCE_MISSED
ROUTINE_OCCURRENCE_CORRECTED
```

### Parent lifecycle

```txt
PROJECT_COMPLETED
PROJECT_STOPPED
PROJECT_CHILD_TASK_RESOLVED
PROJECT_CHILD_ROUTINE_AUTO_STOPPED
GOAL_ACHIEVED
GOAL_ABANDONED
GOAL_CHILD_RESOLVED
```

015B نیز candidateهایی برای effective range و duplicate prevention معرفی می‌کند، ولی authority نهایی eventها متعلق به 019C است.

### وضعیت مپ

مپ Data Events را به final event inventory متصل می‌کند، نه اینکه candidateهای این Discussion را کورکورانه canonical کند.

### نتیجه

```txt
Data Events impact → ACCEPTED
```

---

## I. Traction Metrics

Discussion 015 می‌گوید raw completion rate به‌تنهایی معیار موفقیت نیست.

گروه‌های metric:

### Execution usability

- درصد Taskهای Today که صریحاً resolve شده‌اند
    
- درصد overdueهایی که بعداً Complete، Carry یا Drop شده‌اند
    
- زمان تا resolution
    
- کاهش unresolved accumulation
    

### Routine quality

- Done/Missed در periodهای قابل‌ارزیابی
    
- correction rate
    
- recurrence edit frequency
    
- continuation Routine frequency
    

### Adaptive trust

- acceptance rate پیشنهادهای adjustment
    
- درصد پیشنهادهای مبتنی بر pattern تکرارشده
    
- low-confidence warnings
    
- rejection در periodهای absence-contaminated
    
- کاهش repeated Carry بعد از adaptation.
    

مپ metrics فعلی H1/H2 و trust/regret gateها را در سطح بالاتر نشان می‌دهد. metricهای execution-specific باید در measurement spec باشند.

### نتیجه

```txt
Traction Metrics impact → ACCEPTED
```

---

## J. Current Decisions

مپ باید این تصمیم‌ها را حفظ کند:

- Today derived است
    
- plannedDate تنها مسیر ورود Task به Today است
    
- overdue جداست
    
- Carry صریح است
    
- occurrence Carry نمی‌شود
    
- Missed خنثی است
    
- Paused و Skipped canonical نداریم
    
- Resume Routine یک entity جدید می‌سازد
    
- correction expiry ثابت ندارد
    
- parent terminal child فعال نگه نمی‌دارد
    
- تاریخ روزانه local-date محور است
    
- Reconcile گذشته را resolve می‌کند
    
- Adaptive Planning آینده را تغییر می‌دهد
    
- absence confidence را کاهش می‌دهد.
    

### وضعیت مپ

تصمیم‌های هسته‌ای به Execution، Product Model، Guardrails و Reconcile منتقل شده‌اند.

### نتیجه

```txt
Current Decisions → ACCEPTED
```

---

## K. Open Questions

Discussion 015 این سؤال‌ها را بسته است:

- Today آیا Plan ذخیره‌شده است؟ خیر.
    
- overdue آیا status است؟ خیر.
    
- Carry خودکار است؟ خیر.
    
- occurrence Carry می‌شود؟ خیر.
    
- Routine به Pause نیاز دارد؟ در MVP خیر.
    
- stopped Routine reopen می‌شود؟ خیر.
    
- Project stopped هم Routine را متوقف می‌کند؟ بله.
    
- child فعال زیر terminal Project می‌ماند؟ خیر.
    
- Missed بدهی می‌سازد؟ خیر.
    
- absence عملکرد ضعیف محسوب می‌شود؟ خیر.
    

موارد باقی‌مانده implementation/policy هستند، مثل:

- materialization horizon
    
- confirmation شدت correction قدیمی
    
- event retention
    
- DST instant selection
    
- Undo duration
    
- evidence weights.
    

### نتیجه

```txt
Open-question classification → ACCEPTED
```

---

# ۳۲. سناریوهای کلیدی

## سناریو ۱: Task سه‌شنبه انجام نشده

```txt
plannedDate = Tuesday
Tuesday ends unresolved
```

نتیجه:

```txt
status stays ACTIVE
plannedDate stays Tuesday
condition = OVERDUE
Reconcile-eligible
not ordinary Wednesday Today
```

---

## سناریو ۲: Carry چندباره

```txt
Monday → Tuesday → Thursday
```

نتیجه:

- یک Task باقی می‌ماند
    
- identity تغییر نمی‌کند
    
- plannedDate فعلی Thursday است
    
- Carry history دو transition دارد
    
- repeated Carry ممکن است evidence شود
    

---

## سناریو ۳: اپ یک ماه باز نشده

- occurrenceهای قابل‌محاسبه reconstruct می‌شوند
    
- unresolved occurrenceها Missed می‌شوند
    
- correction بعدی ممکن است
    
- absence به‌تنهایی low capacity اثبات نمی‌کند
    

---

## سناریو ۴: Resume Routine

```txt
Routine A = STOPPED
Resume
→ Routine B = ACTIVE
→ continuesFrom A
```

history A تغییر نمی‌کند.

---

## سناریو ۵: توقف Project امروز

- child Taskها resolve می‌شوند
    
- Routineهای Project-owned Stop می‌شوند
    
- occurrence Pending امروز باقی می‌ماند
    
- occurrence فردا تولید نمی‌شود
    

---

## سناریو ۶: correction قدیمی

کاربر دو ماه بعد می‌گوید occurrence قدیمی Done بوده:

```txt
old MISSED remains in audit history
correction recorded now
effective fact becomes DONE
scheduledLocalDate unchanged
```

---

## سناریو ۷: Routine دوبار در روز

در MVP:

```txt
Routine 1: Morning medication
Routine 2: Evening medication
```

نه یک Routine با دو occurrence در یک local date.

---

## سناریو ۸: Backlog Task

```txt
placement = BACKLOG
plannedDate = null
reviewDate = future date
```

Task در Today نیست، ولی در زمان گم نمی‌شود.

---

# ۳۳. آیا تعارضی پیدا شد؟

## میان 015 و مدل 012

سازگار است:

- Task و Routine lifecycle حفظ شده‌اند
    
- occurrence Carry نمی‌شود
    
- Goal outcome خودکار نیست
    
- Project-owned Routine با Project پایان می‌یابد
    

## میان 015 و 014A

سازگار است:

- plannedDate source اجرای Task است
    
- reviewDate Today entry نیست
    
- Backlog checkpoint دارد
    
- temporal visibility حفظ می‌شود
    

## میان 015A و Reconcile

تفکیک execution overdue و review due به‌درستی به دو lane منتقل شده است.

## میان 015B و data model

هویت `(routineId, scheduledLocalDate)`، local effective range و duplicate prevention با authority بعدی 019A/019B سازگارند.

## میان این خانواده و مپ

هیچ تعارض محصولی یا حذف blocking پیدا نشد.

جزئیات زیر عمداً در formal specs نگه داشته شده‌اند:

- occurrence identity
    
- effective local range
    
- Resume as continuation
    
- parent terminal resolution
    
- historical correction details
    
- twice-daily split
    

این omission از node خلاصه‌ی مپ قابل‌قبول است، چون تصمیم‌های سطح بالا و روابط اصلی منتقل شده‌اند.

---

# جمع‌بندی وضعیت مپ

```txt
Today as derived local-date view          ACCEPTED
plannedDate as only Today-entry rule      ACCEPTED
Overdue separate from Today               ACCEPTED
Carry explicit, not status                ACCEPTED
No midnight Carry                         ACCEPTED
Task correction and Restore               ACCEPTED
Routine through RoutineOccurrence         ACCEPTED
PENDING → DONE | MISSED                   ACCEPTED
No occurrence Carry                       ACCEPTED
MISSED neutral, no debt                   ACCEPTED
No canonical PAUSED or SKIPPED            ACCEPTED
Routine Resume creates continuation       ACCEPTED AT SPEC LEVEL
Prospective recurrence edits              ACCEPTED AT SPEC LEVEL
No fixed correction expiry                ACCEPTED
Project terminal child resolution         ACCEPTED
Project-owned Routine auto-stop           ACCEPTED
Goal terminal child resolution            ACCEPTED
Stable local-date history                  ACCEPTED
Review due separate from overdue          ACCEPTED
Backlog explicit and reviewable            ACCEPTED
One occurrence per Routine/local day       ACCEPTED AT SPEC LEVEL
Routine effective local-date range         ACCEPTED AT SPEC LEVEL
Absence reduces confidence                 ACCEPTED
Execution/Reconcile/Adapt separation       ACCEPTED
```

# تعریف یک‌جمله‌ای Discussion 015

```txt
Today یک view مشتق‌شده از local date است؛
Taskها فقط با plannedDate امروز وارد آن می‌شوند،
Carry و correction همیشه صریح و auditable هستند،
و Routineها از طریق occurrenceهای مستقل و بدون بدهی اجرا می‌شوند.
```

# تعریف یک‌جمله‌ای Discussion 015A

```txt
plannedDate، reviewDate، deadline و targetDate معانی جدا دارند؛
Today فقط اجرای امروز را نشان می‌دهد،
Backlog placementی صریح و قابل‌بازبینی است،
و review due هرگز به‌معنی failure یا overdue نیست.
```

# تعریف یک‌جمله‌ای Discussion 015B

```txt
در MVP هر Routine در هر local calendar day حداکثر یک occurrence دارد؛
eligibility با effective local dates کنترل می‌شود،
timestamp جای local date را نمی‌گیرد،
و Stop آینده را می‌بندد بدون بازنویسی history.
```

## نتیجه نهایی

```txt
Discussion 015       ACCEPTED
Discussion 015A      ACCEPTED
Discussion 015B      ACCEPTED
Map projection       ACCEPTED
Product conflict     NONE
Blocking omission    NONE
Required change      NONE
```

مرحله‌ی بعد **Discussion 016 و 016A** است: اینکه چه زمانی Reconcile فعال می‌شود، severity چگونه از facts محاسبه می‌شود، چه چیزهایی Light، Medium یا Recovery هستند و چرا تعداد زیاد review checkpoint نباید با شکست اجرایی اشتباه گرفته شود.