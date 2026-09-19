# مرور Discussion 011

## تثبیت محدوده‌ی MVP و ساختن فهرست مرجع تصمیم‌ها

Discussion 010 جهت محصول را عوض کرد. Discussion 011 کار دیگری انجام داد: مشخص کرد این جهت جدید دقیقاً چه محدوده‌ای دارد، تصمیم‌های جزئی‌تر کجا نگهداری می‌شوند، و وقتی چند سند درباره‌ی یک موضوع حرف می‌زنند کدام‌یک مرجع است.

به زبان ساده، 010 گفت «چه محصولی می‌سازیم» و 011 گفت «برای فهم این محصول باید به کدام تصمیم‌ها رجوع کنیم». چون ظاهراً حتی حقیقت هم بدون سیستم بایگانی مناسب دوام نمی‌آورد.

---

## ۱. مسئله‌ی اصلی چه بود؟

بعد از تغییر جهت AI-native، یک بحث چتری لازم بود تا مشخص کند:

- MVP دقیقاً چه loopی را شامل می‌شود؟
    
- هر خانواده‌ی تصمیم متعلق به کدام Discussion است؟
    
- amendmentها و final resolutionها چه رابطه‌ای دارند؟
    
- اسناد قدیمی چه جایگاهی دارند؟
    
- Discussion 022 چه چیزی را باید به مپ و برنامه‌ی اجرا منتقل کند؟
    

بدون این لایه، ممکن بود هر تیم از یک فایل متفاوت برداشت خودش را بسازد:

```txt
Designer → flow اولیه
Backend → ADR قدیمی
Frontend → آخرین draft
Product → final resolution
```

بعد هم همه با اطمینان کامل نسخه‌های متفاوت یک محصول را پیاده کنند. شکوه هماهنگی تیمی.

---

# ۲. تصمیم اصلی چه بود؟

MVP به‌عنوان یک vertical slice کامل پذیرفته شد:

```txt
Goal or intention
→ bounded AI-assisted clarification and Planning
→ structured Goal / Project / Task / Routine proposal
→ user review and explicit confirmation
→ Today execution through Tasks and RoutineOccurrences
→ deterministic Reconcile eligibility and evidence
→ bounded AI explanation and recommendation where allowed
→ user-confirmed adaptation
→ auditable canonical mutation
```

دو نسخه‌ی اشتباه محصول هم صریحاً رد شدند:

- Todo دستی که AI فقط بعد از شکست ظاهر می‌شود
    
- AI coach آزاد که به canonical execution، safety و authority متصل نیست.
    

---

# ۳. اصول حاکم محصول

Discussion 011 نه اصل کلیدی را تثبیت کرد:

1. Planning اولین ارزش را ایجاد می‌کند.
    
2. Execution شواهد واقعی می‌سازد.
    
3. Reconcile برنامه را تطبیق می‌دهد.
    
4. AI پیشنهاد می‌دهد؛ کاربر اجازه می‌دهد.
    
5. وضعیت فعلی هنگام commit مرجع نهایی است.
    
6. تاریخچه حفظ می‌شود.
    
7. Safety می‌تواند generation را متوقف کند.
    
8. claimها باید محدود به شواهد باشند.
    
9. pilot فقط با عبور از gateها مجاز است.
    

این بخش مهم است چون Discussion 011 فقط فهرست فایل‌ها نیست؛ مجموعه‌ای از invariantهای سطح محصول هم ارائه می‌دهد.

---

# ۴. فهرست authority چه شد؟

011 برای هر خانواده‌ی تصمیم یک مرجع تعیین کرد:

|خانواده|مرجع اصلی|
|---|---|
|جهت استراتژیک|010|
|مدل محصول|012 و 012A|
|Planning entry|013|
|Planning output|014 و 014A|
|Execution|015 تا 015B|
|Reconcile trigger|016 و 016A|
|Reconcile intelligence|017|
|Authority و reversibility|018|
|Failure، privacy و crisis|018A|
|Data model|019A|
|Transactions|019B|
|Events|019C|
|Runtime|020A|
|API و frontend states|020B|
|Reliability و cost|020C|
|Validation|021|
|Migration و implementation|022|

## تصمیم مهم authority

وجود یک فایل جدیدتر به‌تنهایی کافی نیست. هر Discussion فقط محدوده‌ی خودش را مالک است.

مثلاً:

```txt
010 owns strategy
012 owns canonical entities
018 owns mutation authority
021 owns validation gates
022 owns migration and sequencing
```

این یعنی 022 حق ندارد هنگام migration رفتار محصول را بی‌سروصدا تغییر دهد.

---

# ۵. قواعد precedence

## Final resolution بر draft مقدم است

اگر یک خانواده شامل proposal، amendment، Claude review و final resolution باشد، نسخه‌ی نهایی مرجع است. amendment پذیرفته‌شده نیز تا جایی معتبر است که final resolution آن را حفظ یا به آن وابسته باشد.

## تصمیم جدید فقط می‌تواند refine کند

یک Discussion بعدی می‌تواند جزئیات داخل یک boundary را اضافه کند، اما اگر boundary را عوض کند باید صریحاً بگوید چه تصمیمی superseded شده و جایگزین چیست.

## canonical state از generated text بالاتر است

AI output، draft snapshot و frontend state هیچ‌وقت از canonical state و invariantهای پذیرفته‌شده بالاتر نیستند.

## سند قدیمی به‌خاطر سنش معتبر نمی‌ماند

تصمیم legacy فقط وقتی معتبر است که در reconciliation صریحاً حفظ شده باشد.

---

# ۶. اثر Discussion 011 روی مپ

011 تقریباً روی تمام مپ اثر دارد، ولی جنس اثرش بیشتر **coverage و navigation** است تا تعریف جزئی رفتار.

---

## A. Product Vision

### اثر مورد انتظار

مپ باید نشان دهد محصول:

- AI-native است
    
- loop کامل دارد
    
- Planning و Adapt هر دو داخل MVP هستند
    
- neither Todo-only nor coach-only
    

### وضعیت فعلی مپ

Node `vision` همین جهت را نمایش می‌دهد:

```txt
Turn an intention into a credible plan,
help the user execute it,
and adapt when reality diverges.
```

و سپس Planning، Today و Reconcile را تفکیک می‌کند.

### نتیجه

```txt
Product Vision → ACCEPTED
```

---

## B. MVP Core Loop

### اثر مورد انتظار

تمام مراحل اصلی 011 باید دیده شوند:

- intention
    
- Planning
    
- structured proposal
    
- confirmation
    
- canonical commit
    
- Today
    
- deterministic Reconcile
    
- optional AI
    
- confirmed adaptation
    
- auditable mutation
    

### وضعیت فعلی مپ

Node `mvp-loop` تمام این مراحل را دارد و با baseline file نیز مرتبط شده است.

### نتیجه

```txt
MVP Core Loop → ACCEPTED
```

---

## C. User Flow

Discussion 011 الزام می‌کند که مپ فقط یک flow کلی نداشته باشد؛ Planning، Execution و Reconcile باید جدا دیده شوند.

مپ فعلی سه node مستقل دارد:

- `planning-flow`
    
- `execution-flow`
    
- `reconcile-flow`
    

و edgeها آن‌ها را به ترتیب loop وصل می‌کنند:

```txt
Planning
→ approved plan
→ Execution
→ execution evidence
→ Reconcile
```

### نتیجه

```txt
User Flow coverage → ACCEPTED
```

---

## D. AI Responsibilities و Authority Boundary

Discussion 011 دو اصل جدا را الزام می‌کند:

```txt
AI proposes
Current canonical state controls commit
```

مپ نیز این دو را در nodeهای مستقل قرار داده:

- `ai-responsibilities`
    
- `authority-confirmation`
    

این جداسازی خوب است، چون مسئولیت AI و فرآیند mutation یک چیز نیستند. مدل زبانی ممکن است پیشنهاد تولید کند، ولی از آنجا تا database mutation یک دره‌ی عمیق از authentication، versioning و transaction وجود دارد. خوشبختانه این‌بار دره واقعاً روی مپ دیده شده است.

### نتیجه

```txt
AI Responsibilities → ACCEPTED
Authority Boundary → ACCEPTED
```

---

## E. AI Guardrails

011 می‌گوید safety باید بتواند generation را متوقف کند و claimها باید محدود به evidence باشند.

مپ فعلی شامل این‌هاست:

- no diagnosis
    
- no hidden motivation/capacity inference
    
- no Goal-achievement inference
    
- crisis zero leakage
    
- manual path
    
- imported content has no authority.
    

### نتیجه

```txt
AI Guardrails → ACCEPTED
```

---

## F. Data Model

011 مشخص می‌کند map باید مدل کامل را داشته باشد:

```txt
Goal
Project
Task
Routine
RoutineOccurrence
```

و نه مدل قدیمی Goal/Task-only.

مپ فعلی این مدل را در `product-model` دارد و canonical Plan را نیز رد کرده است.

### نتیجه

```txt
Data Model coverage → ACCEPTED
```

---

## G. Data Events و Observability

Discussion 011 الزام می‌کند که semantic events، AI observability و evidence در مپ باشند.

مپ فعلی یک node کامل فایل‌محور برای Discussion 019C دارد:

```txt
events → metrics
label: evidence
```

### نتیجه

```txt
Data Events coverage → ACCEPTED
```

---

## H. Traction Metrics و Gates

011 می‌گوید pilot با validation gateها کنترل می‌شود و فعالیت صرف اثبات موفقیت یا causality نیست.

مپ فعلی:

- H1 و H2 را جدا دارد
    
- hard gateها را بالاتر از conversion metrics قرار می‌دهد
    
- research را با edge `supports, does not prove` به metrics وصل کرده است.
    

### نتیجه

```txt
Metrics and Gates → ACCEPTED
```

---

## I. Current Decisions

این بخش در Discussion 011 نقش مرکزی دارد، چون خود Discussion یک navigation index است.

مپ فعلی به فایل زیر مستقیم لینک دارد:

```txt
accepted-decision-inventory-001-021.md
```

و edge آن به scope می‌گوید:

```txt
decision inventory
→ authorizes
→ scope
```

### نکته

این اثر بسیار درست است. خود مپ نباید جای inventory را بگیرد؛ باید projection باشد و برای جزئیات به source برگردد.

### نتیجه

```txt
Current Decisions → ACCEPTED
```

---

## J. Open Configuration / Readiness

011 میان product semantics و configurationهای باقی‌مانده تفاوت می‌گذارد.

مپ صریحاً می‌گوید:

```txt
No product-semantic question remains.
```

و سپس فقط configurationهای pilot، auth، provider، privacy، UX و operations را فهرست می‌کند.

### نتیجه

```txt
Open Questions classification → ACCEPTED
```

---

## K. Implementation Plan

Discussion 011، Discussion 022 را مسئول این موارد کرد:

- migration
    
- formal docs
    
- milestones
    
- ownership
    
- readiness.
    

مپ فعلی implementation را مستقیماً به 022 وصل کرده و team ownership و runtime/API را هم کنار آن نشان می‌دهد.

### نتیجه

```txt
Implementation / Delivery Plan → ACCEPTED
```

---

## L. References و Study Needs

011 تأکید می‌کند research و historical artifacts authority محصول نیستند.

مپ فعلی:

```txt
social evidence
→ anecdotal input
→ research
→ supports, does not prove
→ metrics
```

### نتیجه

```txt
Research authority boundary → ACCEPTED
```

---

# ۷. یک مسئله‌ی تاریخی در خود Discussion 011

قبلاً Discussion 011 هنوز 022 را Open معرفی می‌کرد. این مورد در مرحله‌ی قبل اصلاح شد.

الان فایل:

- 022 را complete معرفی می‌کند
    
- handoff را پایان‌یافته می‌داند
    
- current operational state را از historical wording جدا کرده است
    

پس finding قبلی بسته شده است.

```txt
Discussion status synchronization → FIXED
```

---

# ۸. آیا چیزی در مپ کم است؟

در سطح پوشش موردنیاز Discussion 011، تقریباً همه‌چیز وجود دارد:

```txt
AI-native vision                  present
complete core loop                present
canonical model                   present
Planning flow                     present
Execution flow                    present
Reconcile flow                    present
authority and reversibility       present
privacy/crisis boundaries         present
data/events/observability         present
runtime/API states                present
validation and gates              present
deferred/rejected scope           present
```

Discussion 011 خودش جزئیات nodeها را تعیین نمی‌کند؛ فقط می‌گوید تمام این خانواده‌ها باید پوشش داده شوند. مپ فعلی این coverage را دارد.

---

# ۹. یافته‌های نهایی

## Finding 011-MAP-01

### Coverage کامل است

هیچ خانواده‌ی تصمیمی که 011 الزام کرده از مپ غایب نیست.

```txt
ACCEPTED
```

## Finding 011-MAP-02

### Authority separation درست است

مپ بین:

- decision inventory
    
- baseline
    
- implementation plan
    
- research
    
- visual projection
    

تمایز مناسبی ایجاد کرده است.

```txt
ACCEPTED
```

## Finding 011-DOC-01

### status قدیمی 022 اصلاح شده

```txt
FIXED
```

## Finding 011-SEMANTIC-01

### تعارض معنایی پیدا نشد

011، baseline، README و مپ همگی یک scope واحد را ارائه می‌دهند.

```txt
ACCEPTED
```

---

# جمع‌بندی Discussion 011

```txt
Scope umbrella                    ACCEPTED
Authority index                   ACCEPTED
Precedence rules                  ACCEPTED
Product Vision coverage           ACCEPTED
MVP Core Loop coverage            ACCEPTED
User Flow coverage                ACCEPTED
AI and authority coverage         ACCEPTED
Safety coverage                   ACCEPTED
Data and event coverage           ACCEPTED
Metrics and gate coverage         ACCEPTED
Implementation handoff            ACCEPTED
Research boundary                 ACCEPTED
```

## تعریف یک‌جمله‌ای 011

```txt
Discussion 011 محدوده‌ی کامل MVP را تثبیت می‌کند
و برای هر خانواده‌ی تصمیم مشخص می‌کند
کدام Discussion مرجع است،
تا مپ، طراحی و پیاده‌سازی نتوانند
از draftها یا اسناد قدیمی رفتار تازه‌ای اختراع کنند.
```

Discussion 011 از نظر سند و اثر روی مپ سالم است و نیاز به تغییر ندارد.

مرحله‌ی بعد وارد اولین بحث مدل واقعی محصول می‌شود:

```txt
Discussion 012 — Core Product Model
```

یعنی Goal، Project، Task، Routine، RoutineOccurrence، ownership، hierarchy و دلیل حذف canonical Plan.