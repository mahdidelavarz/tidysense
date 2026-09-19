# مرور Discussion 010

## تغییر جهت نهایی به MVP مبتنی بر AI

Discussion 010 بنیادی‌ترین تصمیم محصول را گرفته است. تقریباً تمام بحث‌های بعدی دارند جزئیات تصمیمی را مشخص می‌کنند که اینجا گرفته شد.

---

## ۱. مسئله‌ی اصلی چه بود؟

نسخه‌ی قبلی MVP تقریباً این مسیر را داشت:

```txt
کاربر Task را دستی می‌سازد
→ Task انجام نمی‌شود یا عقب می‌افتد
→ هنگام بازگشت، Done / Carry / Drop
```

ارزش متمایز محصول تازه **بعد از خراب‌شدن برنامه** ظاهر می‌شد.

این رویکرد دو مشکل اساسی داشت:

1. از کاربری که در برنامه‌ریزی مشکل دارد انتظار داشت خودش با فرم‌ها برنامه را بسازد.
    
2. ارزش Adaptive Planner را تا زمانی که تعداد کافی Task عقب‌افتاده ایجاد نشده بود، پنهان می‌کرد.
    

در نتیجه محصول ممکن بود در اولین استفاده شبیه یک Todo معمولی دیده شود و تنها بعداً قابلیت Reconcile خود را نشان بدهد. آن هم وقتی کاربر از قبل خسته و بدهکارِ لیست خودش شده است. طراحی بسیار انسانی: اول مشکل را جمع کن، بعد ابزار حل مشکل را معرفی کن.

---

# ۲. تصمیم اصلی چه بود؟

Adaptive Planner به‌عنوان یک محصول **AI-native adaptive planning** تعریف شد، نه یک Todo دستی که AI بعداً به آن چسبانده شود.

حلقه‌ی نهایی سطح بالا:

```txt
Goal or intention
→ AI-assisted clarification and planning
→ user-reviewed plan proposal
→ explicit confirmation
→ Today execution
→ deterministic recovery and AI-assisted Reconcile
→ user-approved adaptation
```

## اولین لحظه‌ی ارزش

اولین ارزش محصول این است:

> کاربر توضیح می‌دهد چه می‌خواهد و محصول کمک می‌کند آن را به برنامه‌ای معتبر و قابل‌استفاده تبدیل کند، بدون آنکه کنترل را از او بگیرد.

بنابراین:

```txt
Planning = first-value engine
Today = execution evidence engine
Reconcile = adaptation engine
```

Reconcile حذف یا Post-pilot نشد. فقط از «نقطه‌ی ورود اصلی محصول» به «بخش Adapt در حلقه‌ی کامل» منتقل شد.

---

# ۳. منطق جدید محصول

مسیر جدید دیگر این نیست:

```txt
کارهای عقب‌افتاده را یکی‌یکی بررسی کن
```

بلکه:

```txt
یک برنامه‌ی معتبر بساز
→ اجرای واقعی را مشاهده کن
→ drift معنادار را تشخیص بده
→ فضای تصمیم‌گیری برای بازیابی را کوچک کن
→ اجازه بده کاربر adaptation را تأیید کند
```

این تفاوت مهم است:

- Recovery ساده، هر Task را جداگانه مدیریت می‌کند.
    
- Adaptation بررسی می‌کند آیا **خود برنامه** هنوز با واقعیت سازگار است یا نه.
    

---

# ۴. نقش AI چه شد؟

قاعده‌ی اصلی:

```txt
AI reduces the decision space.
The user owns consequential decisions.
```

## AI در Planning می‌تواند

- نیت را روشن کند
    
- محدودیت‌ها و فرض‌ها را آشکار کند
    
- برنامه‌ای ساختاریافته پیشنهاد دهد
    
- در صورت نیاز Goal، Project، Task و Routine پیشنهاد دهد
    
- یک افق اجرایی کوتاه‌مدت آماده کند
    
- پیشنهاد را برای کاربر توضیح دهد.
    

## AI در Reconcile می‌تواند

پس از آنکه سیستم به‌صورت deterministic وضعیت، facts، eligibility و actions مجاز را تعیین کرد:

- موارد را گروه‌بندی کند
    
- شواهد را خلاصه کند
    
- drift را توضیح دهد
    
- پیشنهاد adaptation بدهد
    
- تعداد تصمیم‌های لازم را کاهش دهد.
    

## AI نمی‌تواند

- متن تولیدشده را به‌عنوان permission تلقی کند
    
- Task مهمی را مخفیانه Drop کند
    
- Goal را achieved یا abandoned اعلام کند
    
- تاریخچه را بازنویسی کند
    
- rescheduling گسترده و خودکار انجام دهد
    
- علت روان‌شناختی یا ظرفیت پنهان کاربر را حدس بزند
    
- در وضعیت crisis به Planning معمولی ادامه دهد.
    

---

# ۵. پیامد برای مدل محصول

Discussion 010 مدل نهایی داده را تعریف نکرد، اما جهت آن را تغییر داد.

موجودیت‌های مفهومی پذیرفته‌شده:

```txt
Goal
Project
Task
Routine
RoutineOccurrence
```

`Plan` موجودیت canonical نیست؛ طرح پیشنهادی یا draft موقت است، مگر اینکه یک قرارداد بعدی خلاف آن را صریحاً تصویب کند.

همچنین:

- Planning نباید فقط Task و Routine تولید کند.
    
- Goal و Project در صورت توجیه واقعی قابل پیشنهادند.
    
- AI نباید برای مرتب به‌نظررسیدن خروجی hierarchy مصنوعی بسازد.
    
- هفت روز، افق جزئیات اجرایی است، نه عمر کامل Goal یا Project.
    
- RoutineOccurrence عقب‌افتاده نباید مثل Task از طریق Carry به بدهی دائمی تبدیل شود.
    
- execution activity اثبات نمی‌کند Goal در دنیای واقعی محقق شده است.
    

---

# ۶. چه چیزهایی از نسخه‌ی اولیه 010 superseded شدند؟

این موارد دیگر معتبر نیستند:

- انتقال AI Reconcile به Phase 2
    
- محدودکردن خروجی AI فقط به Task و Routine
    
- محدودیت اولیه‌ی حداکثر سه Task و دو Routine
    
- تلقی هفت روز به‌عنوان کل عمر plan
    
- recurrence ساده‌ی اولیه
    
- Reconcile صرفاً بر پایه‌ی `complete / move / drop`
    
- event list اولیه
    
- activation metricهای اولیه
    
- map editهای مقدماتی
    
- توالی اجرایی هشت‌مرحله‌ای اولیه.
    

این نکته مهم است: Discussion 010 authority استراتژیک دارد، ولی جزئیات بعداً توسط 012 تا 021 جایگزین یا تکمیل شده‌اند.

---

# ۷. اثر Discussion 010 روی مپ

حالا خود تصمیم را با repository Mind Map مقایسه کنیم.

## A. Product Vision

### وضعیت فعلی مپ

Node `vision` می‌گوید:

```txt
Turn an intention into a credible plan,
help the user execute it,
and adapt when reality diverges.

Planning is the first-value engine.
Today creates evidence.
Reconcile is the adaptation engine.

AI reduces decision space;
the user authorizes consequences.
```

### ارزیابی

این متن تقریباً دقیق‌ترین projection سطح بالای Discussion 010 است.

همه‌ی مفاهیم اصلی را دارد:

- intention
    
- credible plan
    
- execution
    
- divergence
    
- Planning as first value
    
- Today as evidence
    
- Reconcile as adaptation
    
- AI/user authority boundary
    

### نتیجه

```txt
Product Vision → ACCEPTED
```

---

## B. Target Pilot Need State

### وضعیت فعلی مپ

Node `target-jtbd` کاربری را تعریف می‌کند که:

- Goal یا intention واقعی دارد
    
- پیشنهاد AI را review می‌کند
    
- از Today استفاده می‌کند
    
- ممکن است بعد از drift به adaptation نیاز داشته باشد
    
- نباید برایش diagnosis، motivation، capacity یا Goal achievement استنتاج شود.
    

### ارزیابی

این بخش با جهت 010 سازگار است، ولی مستقیماً توسط 010 نهایی نشده است. جزئیات pilot user از baseline و Discussion 021 آمده‌اند.

یعنی حضورش در مپ درست است، اما source اصلی آن 010 نیست.

### نتیجه

```txt
Target Need State → ACCEPTED
Primary authority → Baseline + Discussion 021
010 impact → strategic only
```

---

## C. MVP Core Loop

### وضعیت فعلی مپ

Node `mvp-loop`:

```txt
Intention
→ bounded Planning conversation
→ validated PlanningDraft
→ review + confirmation
→ deterministic commit
→ Today execution
→ deterministic Reconcile
→ optional bounded AI explanation
→ confirmed adaptation
→ CommandResult + events
```

### ارزیابی

این flow جهت Discussion 010 را به‌درستی منتقل کرده و با تصمیم‌های بعدی تکمیل شده است.

ویژگی مثبت آن این است که فقط flow بازاریابی را نشان نمی‌دهد؛ authority و persistence هم وارد شده‌اند:

- validated draft
    
- confirmation
    
- deterministic commit
    
- CommandResult
    
- events
    

اما یک ساده‌سازی کوچک دارد:

`CommandResult + events` فقط در انتهای adaptation نمایش داده شده، درحالی‌که commit اولیه‌ی Planning هم باید `CommandResult` و event داشته باشد.

در واقع دو commit loop داریم:

```txt
Planning proposal
→ confirmation
→ planning commit
→ CommandResult
```

و:

```txt
Adaptation proposal
→ confirmation
→ adaptation commit
→ CommandResult
```

در node فعلی، Planning commit ذکر شده ولی CommandResult آن به‌صورت بصری روشن نیست.

### نتیجه

```txt
MVP Core Loop → NEEDS SMALL MAP AMENDMENT
```

### اصلاح پیشنهادی

به‌جای یک پایان منفرد:

```txt
confirmed adaptation
→ CommandResult + events
```

بهتر است بنویسیم:

```txt
every confirmed mutation
→ commit-time revalidation
→ deterministic commit
→ CommandResult + events
```

یا Planning و Adaptation هر دو به یک node مشترک `Authority + Commit` متصل شوند.

---

## D. ارتباط‌های Core Loop

Edgeهای فعلی:

```txt
Vision → MVP Loop                  realized by
MVP Loop → Planning Flow           Plan
Planning → Execution               approved plan
Execution → Reconcile              execution evidence
Reconcile → Authority              proposed adaptation
Authority → Execution              committed adaptation
```

### ارزیابی

این روابط تصمیم 010 را به‌خوبی نشان می‌دهند:

```txt
Plan
→ Execute
→ Adapt
→ Execute again
```

مخصوصاً edge بازگشت:

```txt
Authority Confirmation
→ Execution Flow
```

نشان می‌دهد adaptation پایان کار نیست؛ برنامه‌ی اصلاح‌شده دوباره وارد Today می‌شود.

### نتیجه

```txt
Core Loop relationships → ACCEPTED
```

---

## E. User Flow — Planning

### وضعیت فعلی مپ

Node `planning-flow` می‌گوید:

- entry جهانی، contextual، manual یا free-intention است
    
- clarification فقط هنگام نیاز material انجام می‌شود
    
- معمولاً حداکثر سه دور
    
- draft ساختاریافته، محدود، قابل ویرایش و موقت است
    
- قبل از confirmation canonical نیست.
    

### ارزیابی

این node تصمیم 010 را درست نمایش می‌دهد، ولی جزئیاتش از Discussions 013 و 014A آمده است.

اثر مستقیم 010 بر این node:

```txt
Planning must begin from intention
AI output must be reviewable
proposal must not become state automatically
```

### نتیجه

```txt
Planning Flow → ACCEPTED
Detailed authority → Discussions 013–014A
```

---

## F. User Flow — Execution

### وضعیت فعلی مپ

Node `execution-flow`:

- Today از Taskهای scheduled و RoutineOccurrenceهای امروز ساخته می‌شود
    
- Carry برای Task صریح است
    
- occurrence فقط Done یا Missed می‌شود
    
- occurrence Carry نمی‌شود
    
- Stop، correction و Restore تاریخچه را حفظ می‌کنند.
    

### ارزیابی

Discussion 010 تنها اصل کلی را تعیین کرد:

```txt
execution must produce real evidence
Routine occurrence ≠ overdue Task
```

جزئیات فعلی از 015 تا 015B آمده‌اند و با 010 سازگارند.

### نتیجه

```txt
Execution Flow → ACCEPTED
```

---

## G. User Flow — Reconcile

### وضعیت فعلی مپ

Node `reconcile-flow`:

```txt
derive facts
→ clean / deduplicate
→ calculate Light / Medium / Recovery
→ separate execution and commitment-review lanes
→ optional rule-gated AI
→ preview / confirmation
→ deterministic mutation
```

همچنین Today هرگز block نمی‌شود.

### ارزیابی

این دقیقاً تکامل تصمیم 010 است:

- Reconcile حذف نشده
    
- فقط item-by-item cleanup نیست
    
- deterministic facts قبل از AI قرار دارند
    
- AI فضای تصمیم را کوچک می‌کند
    
- user mutation را تأیید می‌کند
    
- Reconcile مانع دسترسی به Today نمی‌شود
    

### نتیجه

```txt
Reconcile Flow → ACCEPTED
Detailed authority → Discussions 016–017A
```

---

## H. AI Responsibilities

### وضعیت فعلی مپ

Node `ai-responsibilities`:

```txt
AI may classify with closed vocabulary,
propose bounded plans,
organize allowed recommendations,
and explain deterministic evidence.

It may not create facts,
authority,
hidden causes,
or mutation.
```

### ارزیابی

این node اصل 010 را درست نمایش می‌دهد:

```txt
AI proposes and compresses.
AI does not authorize or mutate.
```

عبارت `closed vocabulary classification` از تصمیم‌های بعدی آمده، ولی با 010 تعارض ندارد.

### نتیجه

```txt
AI Responsibilities → ACCEPTED
```

---

## I. Authority and Confirmation

### وضعیت فعلی مپ

Node `authority-confirmation`:

```txt
Auth + ownership
→ current state/version
→ server preview
→ visible consequences/warnings/selection
→ explicit confirmation
→ commit-time revalidation
→ atomic mutation/outbox
→ CommandResult
```

### ارزیابی

این همان authority boundary است که 010 در سطح اصل تعیین کرد و Discussions 018 تا 020B آن را formal کردند.

نکته مثبت:

`explicit confirmation` به‌تنهایی موفقیت محسوب نشده است.

بعد از confirmation هنوز:

- revalidation
    
- transaction
    
- outbox
    
- CommandResult
    

وجود دارد.

### نتیجه

```txt
Authority Boundary → ACCEPTED
```

---

## J. AI Guardrails

### وضعیت فعلی مپ

Guardrails شامل:

- no direct mutation
    
- no repositories, commands or model tools
    
- no stale confirmation
    
- no diagnosis یا hidden capacity/motivation
    
- no Goal achievement inference
    
- imported content has no authority
    
- crisis path causes zero proposal/mutation leakage
    
- manual path remains available.
    

### ارزیابی

Discussion 010 فقط boundary ابتدایی را تعیین کرد:

- no consequential autonomous action
    
- no sensitive hidden-cause inference
    
- no crisis continuation
    

جزئیات فعلی از 018A، 020A، 020C و 021 آمده‌اند.

این انتقال درست است و بیش‌ازحد به 010 نسبت داده نشده، چون sourceهای دقیق هم در node درج شده‌اند.

### نتیجه

```txt
AI Guardrails → ACCEPTED
```

---

## K. Data Model / Domain Concepts

### وضعیت فعلی مپ

Node `product-model`:

```txt
Goal, Project, Task, Routine, RoutineOccurrence
No canonical Plan
Exclusive ownership
Activity never proves Goal achievement
Terminal parent actions resolve children explicitly
```

### ارزیابی

سه اثر مستقیم 010 درست منتقل شده‌اند:

- مدل فقط Goal و Task نیست
    
- Plan canonical نیست
    
- activity برابر Goal achievement نیست
    

`exclusive ownership` و parent lifecycle متعلق به 012 و 019A هستند، اما با جهت 010 هم‌راستا هستند.

### نتیجه

```txt
Product Model impact → ACCEPTED
```

---

## L. Traction Metrics

### وضعیت فعلی مپ

Node metrics دو hypothesis دارد:

- H1: ساخت یک first plan مفید، معتبر و non-trivial
    
- H2: تبدیل Reconcile به تصمیم‌های قابل‌فهم و user-approved
    

و سپس hard gateها، regret، trust، Manual Escape و severity segmentation را ثبت می‌کند.

### ارزیابی

Discussion 010 مشخصاً گفته بود metrics اولیه‌ی خودش نهایی نیستند و validation باید توسط Discussion 021 تعیین شود.

مپ این اصل را رعایت کرده:

- metrics فعلی از 021 آمده‌اند
    
- research فقط support می‌کند و چیزی را prove نمی‌کند
    
- H1 Planning و H2 Reconcile هر دو سنجیده می‌شوند
    

### نتیجه

```txt
Traction Metrics → ACCEPTED
Primary authority → Discussion 021
010 effect → both Planning and Adapt must be validated
```

---

## M. Current Decisions و Scope

### وضعیت فعلی مپ

Node `removed-postpilot` صریحاً حذف کرده:

- canonical Plan
    
- direct AI mutation
    
- partial output
    
- fuzzy repair
    
- raw Reconcile text
    
- old Reconcile-only MVP.
    

### ارزیابی

`old Reconcile-only MVP` نام دقیقی برای چیزی است که 010 supersede کرده است.

همچنین scope file به loop وصل شده و decision inventory آن را authorize می‌کند.

### نتیجه

```txt
Current Decisions / Scope → ACCEPTED
```

---

## N. Implementation Plan

Discussion 010 در نسخه‌ی اولیه یک توالی اجرایی پیشنهاد داده بود، اما نسخه‌ی نهایی صریحاً آن را superseded کرد.

در مپ فعلی:

- implementation plan مستقیماً به Discussion 022 وصل است
    
- runtime/API از implementation plan sequence می‌گیرد
    
- ownership جدا تعریف شده است.
    

پس مپ از sequence قدیمی 010 استفاده نکرده است.

### نتیجه

```txt
Implementation impact → ACCEPTED
Primary authority → Discussion 022
```

---

## O. References and Research

Discussion 010 چند پژوهش و product precedent را حفظ کرد، اما صریحاً گفت آن‌ها:

- وجود مسئله را پشتیبانی می‌کنند
    
- mechanismهای نزدیک را نشان می‌دهند
    
- retention یا superiority محصول را اثبات نمی‌کنند.
    

در مپ:

```txt
Research → Metrics
label: supports, does not prove
```

این edge بسیار مهم و درست است.

### نتیجه

```txt
Research impact → ACCEPTED
```

---

# ۸. وضعیت `MVP Vision — Full Flow` در FigJam

این بخش باید همان تصمیم 010 را به شکل یک narrative کامل نشان دهد:

```txt
کاربر نیت واقعی دارد
→ محصول به روشن‌شدن و ساخت برنامه کمک می‌کند
→ AI یک proposal می‌سازد
→ کاربر review و confirm می‌کند
→ سیستم canonical state را commit می‌کند
→ Today اجرای واقعی را ثبت می‌کند
→ drift تشخیص داده می‌شود
→ Reconcile فضای تصمیم را کوچک می‌کند
→ کاربر adaptation را تأیید می‌کند
→ برنامه‌ی اصلاح‌شده دوباره وارد Today می‌شود
```

اما طبق آخرین وضعیت، section cloned شده و ظاهر قدیمی را دارد، ولی body کامل آن را خودت قرار است تکمیل کنی.

### نتیجه

```txt
MVP Vision — Full Flow → INCOMPLETE / MANUAL COMPLETION PENDING
```

برای اینکه دقیقاً 010 را نمایش دهد، باید حداقل این چهار مفهوم کاملاً واضح باشند:

1. Planning اولین ارزش است.
    
2. Today فقط لیست نیست، evidence generator است.
    
3. Reconcile backlog cleanup صرف نیست، adaptation engine است.
    
4. AI پیشنهاد می‌دهد؛ کاربر پیامدها را تأیید می‌کند.
    

---

# ۹. یافته‌های این مرحله

## Finding 010-MAP-01

### CommandResult فقط در انتهای Adapt دیده می‌شود

در loop متنی، `CommandResult + events` بعد از adaptation آمده است، درحالی‌که Planning commit هم باید CommandResult داشته باشد.

**Severity:** Minor but worth fixing

**وضعیت:**

```txt
NEEDS SMALL MAP AMENDMENT
```

---

## Finding 010-MAP-02

### Full Flow هنوز کامل نشده

ساختار ظاهری وجود دارد، ولی narrative جدید هنوز کامل نشده است.

**Severity:** Important for shared understanding

**وضعیت:**

```txt
INCOMPLETE / USER COMPLETION PENDING
```

---

## Finding 010-DOC-01

### تناقض محصولی پیدا نشد

Discussion 010، baseline، README، core loop و map direction یک حرف می‌زنند:

```txt
Plan → Execute → Adapt
```

و مرز authority در همه‌ی آن‌ها ثابت است.

**وضعیت:**

```txt
ACCEPTED
```

---

# جمع‌بندی نهایی Discussion 010

```txt
Strategic decision             ACCEPTED
Product Vision projection      ACCEPTED
MVP Core Loop                  ACCEPTED WITH SMALL AMENDMENT
Planning Flow                  ACCEPTED
Execution Flow                 ACCEPTED
Reconcile Flow                 ACCEPTED
AI Responsibilities            ACCEPTED
AI Guardrails                  ACCEPTED
Product Model impact           ACCEPTED
Metrics impact                 ACCEPTED
Implementation impact          ACCEPTED
Research boundary              ACCEPTED
MVP Vision — Full Flow         INCOMPLETE
```

## تعریف یک‌جمله‌ای 010

```txt
Adaptive Planner باید از همان اولین تعامل،
به کاربر برای ساخت برنامه‌ای معتبر کمک کند،
اجرای واقعی را ثبت کند،
و هنگام divergence فضای adaptation را کوچک کند؛
AI پیشنهاد می‌دهد، ولی کاربر کنترل پیامدها را حفظ می‌کند.
```

Discussion 010 از نظر تصمیم و انتقال به مپ تقریباً سالم است. فقط نمایش مشترک `CommandResult` برای هر دو نوع commit و تکمیل Full Flow باقی مانده است.