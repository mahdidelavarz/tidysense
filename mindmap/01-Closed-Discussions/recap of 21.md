# مرور Discussion 021

## فرضیه‌های MVP، معیارها، Hard Gateها و قواعد تصمیم Pilot

Discussion 021 تعیین می‌کند Adaptive Planner چگونه باید درباره‌ی خودش قضاوت کند.

نه با این منطق:

```txt
کاربرها روی دکمه کلیک کردند
→ پس محصول موفق است
```

و نه با این نسخه‌ی کمی شیک‌تر:

```txt
نرخ پذیرش پیشنهاد AI بالا بود
→ پس AI برنامه‌ریزی را بهتر کرده است
```

این Discussion میان چهار چیز فرق می‌گذارد:

```txt
استفاده‌شدن
مفیدبودن
درست و قابل‌اعتماد کارکردن
امن‌بودن برای عرضه
```

ممکن است یک قابلیت استفاده شود ولی قابل‌اعتماد نباشد. ممکن است مفید به‌نظر برسد ولی mutationهایش fail شوند. ممکن است metricهای خوبی داشته باشد ولی یک failure ایمنی کل pilot را متوقف کند.

اصل نهایی:

```txt
Positive product metrics
never override
safety, privacy, reliability or trust failures.
```

---

# ۱. Pilot دقیقاً چه چیزی را ارزیابی می‌کند؟

اولین pilot بررسی می‌کند آیا دو حلقه‌ی اصلی محصول:

```txt
AI-Assisted Creation
AI-Assisted Reconcile
```

به‌اندازه‌ی کافی:

- مفید
    
- قابل‌فهم
    
- قابل‌اعتماد
    
- پایدار
    
- امن
    

هستند که توسعه و rollout کنترل‌شده ادامه پیدا کند.

Pilot قرار نیست ثابت کند AI:

- بهره‌وری انسان را افزایش می‌دهد
    
- استرس را کاهش می‌دهد
    
- wellbeing را بهتر می‌کند
    
- از planning دستی بهتر است
    
- برای همه‌ی کاربران کار می‌کند
    

چون طراحی pilot برای causal inference ساخته نشده است.

## معنای درست

Pilot می‌تواند بگوید:

> در این گروه و این بازه، چه تعداد کاربر به draft قابل‌بررسی رسیدند، چه تعداد آن را مفید دانستند، چه تعداد mutation موفق داشتند و چه failureهایی رخ داد.

ولی نمی‌تواند بگوید:

> AI باعث شد کاربران برنامه‌ریزان بهتری شوند.

انسان‌ها عاشق این جهش از «دیدیم» به «ثابت کردیم» هستند. نمودار هم معمولاً در این جرم شریک است.

---

# ۲. هر metric باید قرارداد کامل داشته باشد

هر metric باید قبل از pilot مشخص کند:

```txt
unit of analysis
numerator
denominator
eligible population
exclusions
observation window
missing-data behavior
segmentation fields
```

مثلاً گفتن:

```txt
Planning acceptance rate = 70%
```

بی‌معناست مگر اینکه بدانیم:

- ۷۰ درصد چه کسانی؟
    
- از تمام attemptها؟
    
- فقط draftهای reviewable؟
    
- فقط افرادی که review را باز کردند؟
    
- draft ویرایش‌شده هم acceptance محسوب شده؟
    
- attemptهای provider failure حذف شده‌اند؟
    
- حساب‌های داخلی داخل denominator بوده‌اند؟
    

## اصل

```txt
No percentage without a denominator.
```

Discussion حتی aggregate success percentage بدون denominator را صریحاً ممنوع می‌کند.

---

# ۳. فرضیه‌ی H1

## AI-Assisted Creation

فرضیه:

> کاربر می‌تواند از طریق AI محدود و کنترل‌شده به یک برنامه‌ی اول مفید، معتبر و غیرسطحی برسد.

H1 فقط درباره‌ی generation نیست.

باید کل funnel را بررسی کند:

```txt
eligible exposure
→ PlanningAttempt
→ valid AI output
→ reviewable PlanningDraft
→ user disposition
→ confirmation
→ deterministic command
→ successful CommandResult
→ short-term survival
```

شواهد H1 باید این ابعاد را پوشش دهد:

- رسیدن به draft قابل review
    
- مفیدبودن plan
    
- درک مرز اعتماد
    
- application موفق
    
- ساختار غیرسطحی
    
- پشیمانی یا reversal سریع.
    

---

# ۴. metricهای لازم H1

حداقل metricها:

```txt
eligible attempt rate
reviewable draft rate
explicit draft disposition rate
unchanged acceptance rate
edited acceptance rate
applied plan rate
useful first plan rate
time to reviewable draft
trust-boundary comprehension
immediate regret/reversal rate
```

---

## Eligible Attempt Rate

چند exposure واجد شرایط واقعاً وارد PlanningAttempt شدند؟

این metric adoption اولیه را می‌سنجد، نه کیفیت خروجی.

---

## Reviewable Draft Rate

چند attempt eligible به draftی رسیدند که:

- complete
    
- schema-valid
    
- semantic-valid
    
- policy-valid
    
- قابل review
    

باشد؟

Provider response به‌تنهایی draft نیست.

---

## Explicit Draft Disposition Rate

کاربر باید نسبت به draft تصمیم مشخصی گرفته باشد:

- قبول
    
- قبول با ویرایش
    
- رد
    
- لغو
    

صرف بازکردن draft یا ناپدیدشدن کاربر decision محسوب نمی‌شود.

---

## Unchanged Acceptance

کاربر draft را بدون تغییر material پذیرفته است.

## Edited Acceptance

کاربر قبل از پذیرش، draft را ویرایش کرده است.

هر دو AI-assisted هستند، ولی باید جدا گزارش شوند.

چرا؟

چون این دو نتیجه‌ی محصولی متفاوت‌اند:

```txt
unchanged acceptance
→ proposal اولیه fit خوبی داشته

edited acceptance
→ AI نقطه شروع مفید ساخته
  ولی proposal اولیه کاملاً مناسب نبوده
```

یکی را نمی‌توان برای زیباترشدن acceptance rate داخل دیگری حل کرد.

---

## Applied Plan Rate

فقط وقتی plan applied محسوب می‌شود که:

```txt
CommandResult = SUCCEEDED
```

نه وقتی:

```txt
Draft accepted
ActionConfirmation submitted
```

چون همان‌طور که 019C با سماجت لازم توضیح داد:

```txt
ACCEPTED
≠ APPLIED
```

---

# ۵. Useful First Plan

این metric مهم‌ترین composite برای H1 است.

یک plan فقط زمانی «مفید» محسوب می‌شود که همه‌ی این شروط را داشته باشد:

```txt
1. positive usefulness response
2. successful CommandResult
3. survival through locked observation window
4. deterministic non-triviality
```

## چرا acceptance کافی نیست؟

کاربر ممکن است:

- برای عبور از flow قبول کرده باشد
    
- plan را نفهمیده باشد
    
- بعداً سریع همه‌چیز را Drop کند
    
- فقط یک Task بسیار ساده دریافت کرده باشد
    
- mutation اصلاً fail شده باشد
    

پس:

```txt
accepted plan
≠ useful first plan
```

---

# ۶. Non-Triviality

برنامه فقط چون accepted شده non-trivial نیست.

Non-triviality باید deterministic و بر اساس canonical structure و eventها محاسبه شود، نه اینکه AI متن plan را بخواند و بگوید:

> این برنامه عمیق و ارزشمند به‌نظر می‌رسد.

نمونه‌های احتمالی non-trivial structure:

- بیش از یک item meaningful
    
- hierarchy توجیه‌شده
    
- حداقل یک execution placement
    
- Routine معتبر
    
- ترکیب bounded Goal/Project/Task
    
- ساختار بیشتر از یک reminder ساده
    

تعریف دقیق classifier باید پیش از pilot قفل شود.

---

# ۷. فرضیه‌ی H2

## AI-Assisted Reconcile

فرضیه:

> کاربر می‌تواند unresolved work را به تعداد کمتری تصمیم روشن و تأییدشده تبدیل کند، بدون اینکه AI facts یا mutation authority را جایگزین کند.

شواهد H2 باید پوشش دهد:

- availability مربوط به deterministic Reconcile
    
- availability توضیح AI
    
- disposition پیشنهادها
    
- application موفق
    
- کاهش unresolved work
    
- comprehension
    
- manual escape
    
- regret یا reopening.
    

---

# ۸. metricهای لازم H2

```txt
eligible Reconcile start rate
deterministic Reconcile availability
AI explanation availability
recommendation disposition rate
unchanged recommendation acceptance
edited recommendation acceptance
applied recommendation rate
unresolved-work reduction
Reconcile understanding score
reopen/regret rate
Manual Escape Success
```

---

## Deterministic Reconcile Availability

چند session eligible واقعاً توانستند:

- facts
    
- reason codes
    
- rule matchها
    
- allowed actions
    

را deterministic تولید کنند؟

اگر این engine fail شود، AI explanation اصلاً معتبر نیست.

---

## AI Explanation Availability

فقط برای sessionهایی محاسبه می‌شود که:

- deterministic facts موجود است
    
- explanation eligible است
    

AI explanation failure نباید deterministic Reconcile availability را صفر کند.

---

## Applied Recommendation Rate

Recommendation فقط وقتی applied است که CommandResult موفق داشته باشد.

حالت زیر باید جدا گزارش شود:

```txt
recommendation accepted
command conflicted
```

---

## Unresolved-Work Reduction

باید بر اساس canonical state قبل و بعد سنجیده شود، نه تعداد cardهایی که UI پنهان کرده است.

مثلاً grouping پنج Task به یک recommendation به‌تنهایی unresolved work را کم نکرده است.

فقط تصمیم‌های canonical مثل:

- Complete
    
- Replan
    
- Backlog
    
- Drop
    
- correction
    
- review defer
    

ممکن است unresolved state را تغییر دهند.

---

# ۹. Decision Compression Ratio

این ratio می‌تواند نشان دهد چند fact به چند تصمیم تبدیل شده‌اند.

مثلاً:

```txt
12 unresolved facts
→ 4 user decisions

Compression Ratio = 3
```

اما این metric فقط توصیفی است.

## چرا higher همیشه بهتر نیست؟

چون compression زیاد ممکن است:

- تفاوت تصمیم‌ها را مخفی کند
    
- bulk action بیش از حد بسازد
    
- protected item را در گروه نامناسب قرار دهد
    
- consequenceهای متفاوت را یکی کند
    

پس:

```txt
high compression
≠ good Reconcile
```

به همان اندازه که فشرده‌کردن تمام مشکلات زندگی در جمله‌ی «بیشتر تلاش کن» کارآمد ولی بی‌فایده است.

---

# ۱۰. تفکیک مراحل lifecycle در metricها

این مراحل هرگز نباید یکی شوند:

```txt
eligible exposure
→ logical attempt/session
→ valid AI output
→ reviewable resource
→ explicit decision
→ deterministic command
→ CommandResult
```

## مثال

یک provider timeout:

```txt
operational failure
```

است، نه user rejection.

یک recommendation accepted با command conflict:

```txt
user acceptance
+
application failure
```

است.

Duplicate retry با idempotency identity یکسان:

```txt
one logical attempt
```

محسوب می‌شود، نه دو attempt.

---

# ۱۱. چهار کلاس metric

هر hypothesis باید از چند نوع evidence استفاده کند:

```txt
behavioral
self-reported
operational
safety/trust
```

هیچ hypothesis فقط با یک کلاس metric پاس نمی‌شود.

## مثال

Self-reported usefulness بالا، ولی:

- draft application failure زیاد
    
- misunderstanding بالا
    
- regret زیاد
    

باشد، H1 Strong نیست.

همچنین conversion خوب ولی safety failure وجود داشته باشد، کل pilot blocked است.

---

# ۱۲. exclusionهای pilot

این حساب‌ها از primary metrics حذف می‌شوند و جدا گزارش می‌شوند:

- internal
    
- seeded
    
- demo
    
- QA
    
- synthetic
    
- close collaborators.
    

چرا close collaborator؟

چون کسی که محصول، تیم یا هدف آزمایش را می‌شناسد:

- صبورتر است
    
- failure را بهتر تحمل می‌کند
    
- flow را حدس می‌زند
    
- feedback متفاوت می‌دهد
    

گنجاندن او در sample اصلی راه ساده‌ای برای کشف این است که دوستان سازنده معمولاً دوستانه رفتار می‌کنند.

---

# ۱۳. Reconcile Severity Segmentation

هر ReconcileSession یک severity ثابت پیش از session دارد:

```txt
LIGHT
MEDIUM
RECOVERY
```

این band:

- deterministic است
    
- immutable برای analysis است
    
- از satisfaction یا outcome بعدی تغییر نمی‌کند
    

هر band جدا گزارش می‌شود.

## Exposure کم

اگر یک band exposure کافی نداشته باشد:

```txt
INCONCLUSIVE
```

است.

نباید پس از دیدن نتایج آن را با band دیگری merge کرد تا sample بهتر به‌نظر برسد.

همچنین contributions کاربران بسیار فعال باید cap یا جدا گزارش شود تا چند نفر سنگین کل نتیجه را کنترل نکنند.

---

# ۱۴. Regret و Reversal

هر reversal به معنی regret نیست.

برای regret-associated بودن، دو شرط لازم است:

```txt
1. inside locked regret window
2. user attributes reversal to original plan/recommendation
   being wrong or unsuitable at acceptance time
```

classification:

```txt
REGRET_ASSOCIATED
CONTEXT_CHANGED
UNCLASSIFIED_REVERSAL
```

## نمونه‌ی Context Changed

کاربر Task را accepted کرده، ولی روز بعد deadline کاری جدید گرفته است.

این reversal الزاماً نشان نمی‌دهد پیشنهاد اولیه بد بوده.

## Missing attribution

اگر دلیل را نمی‌دانیم:

```txt
UNCLASSIFIED_REVERSAL
```

نه اینکه researcher بر اساس نتیجه‌ی دلخواه خودش آن را تفسیر کند. داده‌ی گمشده بسیار بی‌ادب است و حاضر نمی‌شود داستان مناسب ارائه دهد.

---

# ۱۵. Trust-Boundary Comprehension

یک quiz به‌تنهایی نمی‌تواند ثابت کند کاربر مرز اعتماد را فهمیده است.

باید پاسخ quiz با رفتار مشاهده‌شده مقایسه شود.

کاربر باید بفهمد:

- AI output provisional است
    
- confirmation لازم است
    
- confirmation به معنی success نیست
    
- Accepted به معنی Applied نیست
    
- conflict نیاز به refresh دارد
    
- manual fallback موجود است
    

classification:

```txt
QUIZ_PASS_BEHAVIOR_FAIL
QUIZ_FAIL_BEHAVIOR_PASS
CONSISTENT_PASS
CONSISTENT_FAIL
```

## مهم‌ترین mismatch

```txt
QUIZ_PASS_BEHAVIOR_FAIL
```

کاربر جواب درست را می‌داند، ولی در عمل:

- draft را mutation انجام‌شده می‌پندارد
    
- conflict را success می‌بیند
    
- confirmation created را applied می‌فهمد
    

این یک finding جدی UX است و نباید داخل average quiz score پنهان شود.

---

# ۱۶. Manual Escape Success

این metric بررسی می‌کند آیا بعد از:

- AI failure
    
- degraded mode
    
- invalid output
    
- provider unavailable
    
- explanation failure
    

کاربر می‌تواند از مسیر manual یا deterministic ادامه دهد.

قاعده‌ی تصمیم:

```txt
Manual Escape Success
below locked weak-success threshold
→ H2 FAILURE
```

همچنین مقدار پایین آن مانع Strong Success می‌شود، حتی اگر بقیه‌ی metricها خوب باشند.

اصل بسیار سالم:

> Flowی که فقط وقتی همه‌چیز درست کار می‌کند موفق است، محصول موفق نیست؛ demo موفق است.

---

# ۱۷. Hard Gate اصلی

## Crisis Safety Readiness

این gate فقط دو نتیجه دارد:

```txt
PASS
BLOCKED
```

ندارد:

- weak pass
    
- conditional pass
    
- proceed with caution
    
- known issue
    
- fix after pilot
    

هر failure کل rollout pilot را متوقف می‌کند، نه فقط Planning AI را.

---

# ۱۸. Crisis Detection Path

باید با evidence ثابت شود crisis content این مسیر را طی می‌کند:

```txt
DomainSafetyClassificationPort
→ closed CRISIS classification
→ SAFETY_FALLBACK
```

و نباید وارد:

- Planning generation
    
- Reconcile explanation
    
- normal productivity coaching
    

شود.

---

# ۱۹. Zero Proposal Leakage

در corpus تأییدشده‌ی crisis، همه‌ی این‌ها باید صفر باشند:

```txt
PlanningDraft creation rate = 0
Reconcile explanation creation rate = 0
ActionConfirmation creation rate = 0
canonical mutation rate = 0
```

حتی یک leakage gate را fail می‌کند.

این hard zero است، نه threshold آماری.

---

# ۲۰. منابع crisis واقعی و قابل‌استفاده

پیش از launch باید:

- copy نهایی و reviewشده باشد
    
- resourceها placeholder نباشند
    
- country/locale behavior تعریف شود
    
- unknown-location fallback وجود داشته باشد
    
- unavailable-resource behavior تعریف شود
    
- disclaimer جای resource واقعی را نگیرد.
    

یک دکمه‌ی «در صورت بحران با مراکز محلی تماس بگیرید» بدون اینکه محصول بداند مرکز محلی چیست، readiness محسوب نمی‌شود. متن مبهم علاقه‌ی زیادی دارد خودش را feature جا بزند.

---

# ۲۱. Failure classifier باید Fail Closed باشد

اگر safety classification:

- unavailable
    
- timed out
    
- invalid
    
- rate-limited
    
- killed
    

باشد:

```txt
no PlanningDraft
no Reconcile explanation
no confirmation
safe fallback presentation
```

محصول حق ندارد بگوید:

> classifier خراب است، احتمالاً درخواست عادی است، ادامه بدهیم.

---

# ۲۲. Adversarial Corpus

Corpus حداقل باید شامل این موارد باشد:

- crisis language مستقیم
    
- غیرمستقیم
    
- euphemism
    
- spelling mistake
    
- spacing variant
    
- mixed intent
    
- imported hostile text
    
- prompt injection
    
- planning request همراه crisis phrase
    
- benign phraseهای مستعد false positive.
    

هر دو باید گزارش شوند:

```txt
false negative leakage
false positive behavior
```

false positive ممکن است نیازمند بهبود باشد.

اما false negative که proposal leakage تولید کند، release را فوراً متوقف می‌کند.

---

# ۲۳. Crisis Observability و Privacy

باید اثبات شود:

- restricted eventها ثبت می‌شوند
    
- raw crisis text داخل analytics عادی نیست
    
- join و segmentation عادی ممنوع است
    
- personalization با crisis event انجام نمی‌شود
    
- retention و access محدود است
    
- alerting و audit کار می‌کنند.
    

این eventها نباید به ابزاری تبدیل شوند برای:

```txt
users with crisis signals
→ lower engagement cohort
→ targeted retention campaign
```

چون گویا اگر guardrail صریح نباشد، analytics خیلی سریع اخلاق را به dimension جدید تبدیل می‌کند.

---

# ۲۴. Human Sign-Off

Crisis gate فقط با automated test پاس نمی‌شود.

نیازمند sign-off ثبت‌شده از:

```txt
Product owner
Safety / Policy owner
Engineering owner
```

هر سه لازم‌اند، چون:

- Product بررسی می‌کند flow درست است
    
- Safety بررسی می‌کند policy و copy معتبر است
    
- Engineering بررسی می‌کند implementation واقعاً enforce شده
    

---

# ۲۵. سایر Hard Gateها

موارد زیر نیز pilot یا capability مربوطه را block می‌کنند:

- privacy/access-control بحرانی
    
- mutation بدون confirmation
    
- نمایش acceptance به‌عنوان success
    
- partial/invalid output reviewable
    
- graph cyclic یا unresolved
    
- provider calls بیشتر از retry policy
    
- failure در spend cap یا kill switch
    
- استفاده‌ی analytics عادی از crisis events
    
- trust confusion شدید
    
- failure در deterministic Reconcile بدون degraded state درست
    
- manual escape غیرقابل‌استفاده.
    

این gateها جدا از H1/H2 گزارش می‌شوند.

## اصل

```txt
H1 Strong
+
H2 Strong
+
hard gate failure
=
BLOCKED
```

Conversion با لباس رسمی هم نمی‌تواند safety defect را جبران کند.

---

# ۲۶. Threshold Locking

پیش از دیدن outcome data باید analysis plan versioned و signed شود.

باید قفل کند:

- metric definition
    
- event mapping
    
- denominator
    
- exclusion
    
- windows
    
- regret window
    
- non-triviality classifier
    
- severity classifier
    
- minimum sample
    
- Strong/Weak/Failure/Inconclusive threshold
    
- qualitative coding
    
- gate checklist
    
- decision matrix.
    

## تغییر بعد از lock

نیاز دارد:

```txt
explicit amendment
reason and author
timestamp
impact analysis
pre-change and post-change reporting
```

نمی‌توان بعد از دیدن نتیجه threshold را تغییر داد و سپس گفت از ابتدا همین بوده است. این رفتار معمولاً «تحلیل انعطاف‌پذیر» نامیده می‌شود، چون «تقلب با اکسل» برای جلسه‌ی مدیریت کمی تند است.

---

# ۲۷. Evidence و Sample

Pilot ترکیبی است از:

- event metrics
    
- operational reliability
    
- moderated observation
    
- structured interview
    
- comprehension checks
    
- crisis/adversarial test.
    

نتیجه وقتی Inconclusive است که:

- exposure کافی نیست
    
- user diversity کافی نیست
    
- event completeness ناقص است
    
- observation window کامل نشده
    

```txt
INCONCLUSIVE
≠ WEAK SUCCESS
```

و اجازه‌ی rollout گسترده نمی‌دهد.

Pilot همچنین حق ندارد statistical power ادعا کند، مگر sampling design جداگانه‌ای این ادعا را پشتیبانی کند.

---

# ۲۸. Decision Matrix

## هر Hard Gate fail شود

```txt
any H1
+
any H2
→ BLOCK pilot
```

---

## H1 Strong + H2 Strong

هر دو capability وارد controlled rollout بعدی می‌شوند، به شرط readiness مربوط به 022.

---

## H1 Strong + H2 Weak/Failure

```txt
continue AI Creation
reduce/redesign/disable AI Reconcile
preserve deterministic/manual Reconcile
```

یعنی failure Reconcile نباید Creation موفق را با خودش غرق کند.

---

## H1 Weak/Failure + H2 Strong

```txt
continue Reconcile
reduce/redesign AI Creation
preserve manual Planning
```

---

## یکی Inconclusive

فقط capability دارای evidence کافی ادامه پیدا می‌کند.

برای دیگری داده‌ی بیشتر جمع می‌شود، بدون تغییر retroactive threshold.

---

## هر دو Inconclusive

هیچ thesisی تأیید نشده است.

باید:

- recruitment
    
- instrumentation
    
- exposure
    
- observation duration
    

بهبود پیدا کند.

---

## هر دو Fail

محصول نباید فقط prompt را کمی تغییر دهد و دوباره همان thesis را آزمایش کند.

نتیجه:

```txt
reconsider AI-assisted product thesis
reduce scope
```

این تصمیم مهم است. چون گاهی failure محصول با تغییر رنگ button درمان نمی‌شود، هرچند صنعت در این زمینه آزمایش‌های فراوانی انجام داده است.

---

# ۲۹. ادعاهای ممنوع در گزارش Pilot

گزارش نباید ادعا کند AI:

- planning outcome را بهتر کرده
    
- productivity را افزایش داده
    
- wellbeing را بهتر کرده
    
- stress را کم کرده
    
- retention را افزایش داده
    
- از manual planning بهتر است
    
- safeتر از approach دیگر است
    
- برای همه‌ی severityها کار می‌کند
    
- clinical effectiveness دارد
    
- به populationهای دیگر generalize می‌شود.
    

مگر اینکه design جداگانه واقعاً چنین claimی را پشتیبانی کند.

## ادعاهای مجاز

- observed completion
    
- acceptance/edit
    
- applied command
    
- comprehension
    
- self-reported usefulness
    
- reliability
    
- qualitative themes
    
- crisis gate results.
    

---

# ۳۰. خروجی اجباری گزارش Pilot

گزارش باید شامل این موارد باشد:

1. نسخه‌ی analysis plan
    
2. participant/exposure flow
    
3. exclusion و missing data
    
4. جدول H1 با denominator
    
5. جدول H2 با denominator
    
6. severity breakdown
    
7. operational failureها
    
8. edited در برابر unchanged
    
9. regret classification
    
10. trust mismatch table
    
11. Manual Escape Success
    
12. qualitative themes و evidence متناقض
    
13. crisis gate و sign-off
    
14. همه‌ی hard gateها
    
15. threshold classification
    
16. decision matrix result
    
17. limitations و forbidden claims.
    

این ساختار مانع آن می‌شود که گزارش pilot فقط شامل سه نمودار سبز و یک quote خوشحال‌کننده از کاربر باشد. سنتی محبوب، ولی علمی نه.

---

# ۳۱. اثر Discussion 021 روی Mind Map

این Discussion عمدتاً روی پنج بخش اثر دارد:

```txt
Traction Metrics
AI Guardrails
Current Decisions
MVP Core Loop
Implementation / Readiness
```

---

## A. Traction Metrics

مپ باید این موارد را داشته باشد:

### H1 Creation Funnel

```txt
eligible attempt
→ reviewable draft
→ explicit disposition
→ accepted unchanged / edited
→ applied successfully
→ useful non-trivial plan
→ regret/reversal
```

### H2 Reconcile Funnel

```txt
eligible session
→ deterministic facts available
→ explanation available
→ recommendation disposition
→ applied successfully
→ unresolved work reduction
→ understanding
→ regret/reopen
→ manual escape
```

Discussion صریحاً اضافه‌کردن این موارد را به Mind Map درخواست می‌کند:

- denominatorهای روشن
    
- edited/unchanged
    
- applied-command success
    
- non-trivial plan
    
- regret classification
    
- trust mismatch
    
- Manual Escape
    
- severity segmentation
    
- operational failure distribution.
    

### وضعیت مپ

مپ فعلی H1/H2، trust، regret، hard gate و pilot evidence را در سطح اصلی دارد.

جزئیات formula و denominator طبیعتاً باید در metric dictionary و analysis plan باشند.

### نتیجه

```txt
Traction Metrics → ACCEPTED
```

---

## B. AI Guardrails

Map باید صریحاً منتقل کند:

```txt
Crisis Safety Readiness = hard gate
zero proposal leakage
classifier fail closed
no ordinary analytics for crisis
real localized resources
human sign-off
hard gates override conversion
```

این‌ها فقط validation note نیستند؛ بخشی از محصول و rollout authority هستند.

### نتیجه

```txt
AI Guardrails → ACCEPTED
```

---

## C. Current Decisions

تصمیم‌های نهایی:

- pilot descriptive است
    
- thresholdها predeclared هستند
    
- compression diagnostic است
    
- low manual escape H2 failure است
    
- regret نیازمند attribution است
    
- quiz با behavior cross-check می‌شود
    
- crisis failure کل pilot را block می‌کند.
    

### نتیجه

```txt
Current Decisions → ACCEPTED
```

---

## D. MVP Core Loop

021 یک لایه‌ی evaluation به loop اضافه می‌کند:

```txt
Plan
→ Execute
→ Adapt
→ observe bounded evidence
→ evaluate H1/H2
→ apply hard gates
→ capability-specific decision
```

نکته‌ی مهم این است که evaluation فقط روی conversion نیست.

loop pilot باید eventهای زیر را جدا نگه دارد:

```txt
attempt
draft
decision
confirmation
command
success
regret
```

### نتیجه

```txt
MVP Core Loop validation layer → ACCEPTED
```

---

## E. Manual Path

Manual fallback فقط backup UX نیست؛ metric تصمیم‌گیری دارد.

اگر کاربر هنگام failure نتواند flow را ادامه دهد:

```txt
AI-enhanced product
→ becomes AI-dependent product
```

که خلاف 018A و 020A است.

Map manual path را به‌عنوان capability parallel نگه داشته و با 021 سازگار است.

### نتیجه

```txt
Manual escape validation → ACCEPTED
```

---

## F. Safety and Release Readiness

Discussion 021 distinction مهمی می‌سازد:

```txt
Product semantics closed
≠ safe to launch
```

Crisis semantics قبلاً بسته شده‌اند، اما implementation باید gate را پاس کند.

بنابراین status درست:

```txt
Safety semantics       ACCEPTED
Safety implementation REQUIRED
Pilot rollout          BLOCKED UNTIL PASS
```

نه اینکه crisis هنوز open product question باشد.

### نتیجه

```txt
Release gate projection → ACCEPTED
```

---

## G. Data Events و Analytics

Metricها باید از event mapping versioned استفاده کنند.

نکات مهم:

- acceptance و application جدا
    
- retry duplicate نشود
    
- severity pre-session ثابت
    
- missing attribution unclassified
    
- internal account excluded
    
- crisis event restricted
    
- event completeness condition لازم است
    

019C event model با این نیازها سازگار است.

### نتیجه

```txt
Event-to-metric integrity → ACCEPTED
```

---

## H. Open Questions

Discussion صریحاً می‌گوید سؤال semantic بازی باقی نمانده است.

اما موارد زیر باید instantiate شوند:

- threshold عددی
    
- minimum sample
    
- regret window
    
- observation window
    
- non-triviality rule
    
- Manual Escape threshold
    
- usefulness question
    
- recruitment plan
    
- crisis corpus
    
- sign-off process
    

این‌ها:

```txt
OPEN CONFIGURATION
```

هستند، نه open product semantics.

### نتیجه

```txt
Open Questions → NONE
Open Configuration → Discussion 022 artifacts
```

---

# ۳۲. سناریوهای تست تحلیلی

## سناریو ۱: acceptance بالا، application پایین

```txt
80% drafts accepted
45% CommandResult succeeded
```

نتیجه:

- acceptance خوب
    
- application reliability ضعیف
    
- H1 Strong نیست
    

---

## سناریو ۲: usefulness بالا، plan trivial

کاربرها plan را دوست دارند، ولی بیشتر خروجی‌ها یک Task ساده‌اند.

نتیجه:

```txt
Useful First Plan
not satisfied
```

چون non-triviality لازم است.

---

## سناریو ۳: recommendation accepted اما conflict

```txt
ACCEPTED
CommandResult = CONFLICTED
```

نتیجه:

- acceptance ثبت می‌شود
    
- application success ثبت نمی‌شود
    
- accepted-but-conflicted ثبت می‌شود
    

---

## سناریو ۴: reversal به‌دلیل deadline جدید

نتیجه:

```txt
CONTEXT_CHANGED
```

نه regret.

---

## سناریو ۵: quiz خوب، رفتار بد

کاربر می‌گوید confirmation به معنی success نیست، ولی در UI پس از Submit تصور می‌کند mutation انجام شده.

نتیجه:

```txt
QUIZ_PASS_BEHAVIOR_FAIL
```

یک trust finding جدی.

---

## سناریو ۶: AI Reconcile خراب، manual path موفق

- H2 AI reliability آسیب می‌بیند
    
- Manual Escape Success مثبت است
    
- deterministic/manual value حفظ شده
    

---

## سناریو ۷: metricهای عالی ولی یک crisis draft ساخته شده

نتیجه:

```txt
BLOCKED
```

بدون averaging، تخفیف یا «فقط یک مورد بود».

---

## سناریو ۸: Recovery sample بسیار کم

دو session Recovery داریم و هر دو موفق‌اند.

نتیجه:

```txt
Recovery band = INCONCLUSIVE
```

نه ۱۰۰ درصد موفقیت.

---

## سناریو ۹: هر دو hypothesis Inconclusive

نتیجه:

- thesis تأیید نشده
    
- rollout گسترده ممنوع
    
- exposure design اصلاح می‌شود
    

---

# ۳۳. آیا تعارضی پیدا شد؟

## با Discussion 019C

کاملاً سازگار است:

- acceptance جدا از command success
    
- no decision جدا از rejection
    
- event/metric mapping versioned
    
- restricted crisis data
    

## با Discussion 020

سازگار است:

- attempt identity
    
- partial output rejection
    
- facts-only mode
    
- manual fallback
    
- no hidden retry
    
- hard spend cap
    
- cancellation و late result
    

## با Discussion 018A

Crisis Safety به‌درستی از semantic guardrail به release gate تبدیل شده است.

## با Discussion 016

Severity pre-session deterministic است و بعد از outcome تغییر نمی‌کند.

## با مپ

هیچ contradiction یا blocking omission پیدا نشد.

مپ تصمیم‌های سطح بالا را درست منتقل کرده و جزئیات threshold، formula و corpus را به artifacts مربوط به 022 واگذار می‌کند.

---

# جمع‌بندی وضعیت مپ

```txt
Descriptive pilot, not causal proof          ACCEPTED
H1 AI Creation hypothesis                    ACCEPTED
H2 AI Reconcile hypothesis                   ACCEPTED
Stage and denominator separation             ACCEPTED
Four metric classes                          ACCEPTED
Edited vs unchanged acceptance               ACCEPTED
Applied success via CommandResult             ACCEPTED
Useful non-trivial plan                       ACCEPTED
Severity segmentation                        ACCEPTED
Decision Compression descriptive only        ACCEPTED
Regret attribution requirement               ACCEPTED
Trust quiz/behavior cross-check               ACCEPTED
Manual Escape as H2 criterion                 ACCEPTED

Crisis Safety hard gate                       ACCEPTED
Zero crisis leakage                           ACCEPTED
Classifier fail-closed                        ACCEPTED
Real localized resources                      ACCEPTED
Restricted crisis analytics                   ACCEPTED
Human sign-off                                ACCEPTED
Other reliability/privacy hard gates          ACCEPTED
Hard gates override positive metrics          ACCEPTED

Threshold locking                             ACCEPTED
Versioned amendments                          ACCEPTED
Minimum exposure and diversity                ACCEPTED
Inconclusive distinct from weak success       ACCEPTED
Capability-specific decision matrix           ACCEPTED
Forbidden causal claims                       ACCEPTED
Required pilot report structure               ACCEPTED
```

# تعریف یک‌جمله‌ای Discussion 021

```txt
Pilot باید جداگانه ثابت کند AI Creation و AI Reconcile
قابل‌دسترسی، مفید، قابل‌فهم و قابل‌اعتمادند؛
تمام metricها و thresholdها پیش از مشاهده‌ی نتایج قفل می‌شوند،
قبول پیشنهاد از موفقیت mutation جدا می‌ماند،
و هر failure ایمنی، حریم خصوصی یا trust
صرف‌نظر از metricهای مثبت کل rollout را متوقف می‌کند.
```

## نتیجه نهایی

```txt
Discussion 021        ACCEPTED
Map projection        ACCEPTED
Product conflict      NONE
Blocking omission     NONE
Open semantics        NONE
Open configuration    PILOT ANALYSIS + READINESS ARTIFACTS
Required map change   NONE
```

با این مرحله، زنجیره‌ی تصمیم‌های **012 تا 021 کامل شد**. مرحله‌ی بعدی **Discussion 022** است: بررسی اینکه تمام این تصمیم‌ها چگونه به Mind Map، baseline رسمی، specificationها، implementation workstreamها، milestoneها و readiness gateهای اجرایی منتقل شده‌اند.