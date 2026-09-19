# مرور Discussion 013

## ورود به AI Planning و جریان مکالمه

Discussion 012 مشخص کرد محصول چه موجودیت‌هایی دارد. Discussion 013 مشخص می‌کند کاربر **چطور بدون دانستن این مدل داخلی** وارد Planning شود و AI چگونه نیت او را به مرز یک draft قابل‌بررسی برساند.

مسئله‌ی اصلی این بود که محصول نباید در یکی از این دو افراط بیفتد:

```txt
فرم خشک و طولانی
یا
چت آزاد و بی‌انتها
```

راه‌حل پذیرفته‌شده، یک جریان مکالمه‌ای محدود و ساختاریافته است که فقط ابهام‌های مهم را می‌پرسد و هیچ چیز را پیش از تأیید کاربر canonical نمی‌کند.

---

## ۱. Discussion دقیقاً چه چیزی را حل می‌کند؟

این بحث به پنج سؤال جواب می‌دهد:

```txt
کاربر از کجا وارد Planning می‌شود؟
اول چه نوع اطلاعاتی می‌تواند بدهد؟
AI چه زمانی باید سؤال بپرسد؟
چه زمانی باید مستقیم draft بسازد؟
کاربر چگونه خارج، restart یا recover می‌کند؟
```

همچنین حداقل رفتار مربوط به crisis و `SAFETY_FALLBACK` را تثبیت می‌کند، ولی جزئیات enforcement، privacy و hostile input را به Discussion 018A واگذار می‌کند.

---

# ۲. مدل ورود پذیرفته‌شده

کاربر می‌تواند با هرکدام از این‌ها شروع کند:

```txt
یک نتیجه یا جهت مطلوب
یک ایده‌ی Project
یک یا چند Task
یک یا چند Routine
یک نیت آزاد و بدون ساختار
```

Goal اجباری نیست.

AI فقط اجازه دارد درخواست را به مفاهیم پذیرفته‌شده‌ی مدل محصول تبدیل کند:

```txt
Goal
Project
Task
Routine
```

`RoutineOccurrence` مستقیماً توسط این flow ساخته نمی‌شود، چون occurrence نتیجه‌ی recurrence و زمان است، نه چیزی که کاربر باید در Planning دستی تعریف کند.

## تصمیم مهم

AI نباید صرفاً برای منظم‌تر نشان‌دادن خروجی hierarchy مصنوعی بسازد.

مثلاً:

```txt
«فردا به صاحبخانه ایمیل بزن»
→ standalone Task
```

نه اینکه محصول با شور و هیجان برایش Goal «بهبود کیفیت زندگی»، Project «مدیریت امور خانه» و Task «ارسال ایمیل» بسازد. گاهی یک Task فقط یک Task است؛ کشفی که نرم‌افزارهای مدیریت کار با اکراه می‌پذیرند.

---

# ۳. سه مسیر ورود

## ۳.۱ ورود Global

یک action اصلی مثل:

```txt
Plan with AI
```

flow را بدون نیاز به context قبلی باز می‌کند.

اگر draft یا conversation تأییدنشده‌ی قبلی وجود داشته باشد، سیستم حق ندارد آن را مخفیانه جایگزین کند. کاربر باید انتخاب کند:

```txt
Continue previous draft
Start new and discard previous draft
Cancel
```

چند draft هم‌زمان در MVP لازم نیست.

### دلیل تصمیم

این رفتار جلوی data loss و سردرگمی را می‌گیرد. draft هنوز canonical نیست، اما همچنان حاصل کار و ورودی کاربر است و نمی‌شود مثل زباله‌ی موقت با آن برخورد کرد.

---

## ۳.۲ ورود Contextual

از داخل Goal یا Project، کاربر می‌تواند انتخاب کند:

```txt
Plan next steps with AI
```

Goal یا Project انتخاب‌شده context صریح جریان می‌شود.

AI می‌تواند ownership دیگری پیشنهاد دهد، اما فقط اگر تفاوت:

- قابل‌دیدن باشد
    
- توضیح داده شود
    
- در review قابل‌تغییر باشد
    

نباید آیتم‌ها را بی‌سروصدا از context انتخاب‌شده خارج کند.

---

## ۳.۳ Manual Creation

ساخت دستی همیشه برای این موارد باقی می‌ماند:

```txt
Goal
Project
Task
Routine
```

Manual creation صرفاً fallback هنگام خرابی AI نیست؛ یک مسیر موازی دائمی است.

این تصمیم برای trust مهم است. محصول AI-native است، اما AI-exclusive نیست. اگر کاربر برای ساخت یک Task ساده مجبور شود با مدل زبانی مذاکره کند، محصول احتمالاً به دستاورد عجیبی در تولید اصطکاک رسیده است.

---

# ۴. صفحه‌ی اول و سبک تعامل

صفحه‌ی نخست یک input باز دارد، نه فرم اجباری Goal.

پرسش پیشنهادی:

> روی چه چیزی می‌خواهی پیشرفت کنی؟

UI باید از ابتدا دو چیز را روشن کند:

```txt
ممکن است AI تعداد کمی سؤال بپرسد.
هیچ چیزی تا قبل از review و approval ساخته نمی‌شود.
```

interaction مدل hybrid دارد:

```txt
conversation
+ quick replies در مواقع مفید
+ امکان free text در تمام مراحل clarification
```

سیستم ترجیحاً هر بار فقط یک سؤال می‌پرسد، مگر دو مقدار واقعاً به‌هم وابسته باشند.

## معنی این تصمیم

Chat صرفاً ظاهر flow نیست. قرار نیست همان فرم ۱۲ فیلدی را داخل bubbleهای مکالمه پنهان کنیم و وانمود کنیم تجربه‌ی انسانی شده است.

---

# ۵. State machine مکالمه

## مسیر اصلی

```txt
EMPTY
→ INTERPRETING
→ CLARIFYING | DRAFT_READY | SAFETY_FALLBACK

CLARIFYING
→ CLARIFYING
→ DRAFT_READY
→ INPUT_BLOCKED
→ SAFETY_FALLBACK
→ CANCELLED

DRAFT_READY
→ REVIEWING
→ GENERATION_FAILED
→ SAFETY_FALLBACK
→ CANCELLED

REVIEWING
→ DRAFT_READY
→ APPROVED
→ SAFETY_FALLBACK
→ CANCELLED
```

## تصمیم مهم: clarification اجباری نیست

transition مستقیم زیر الزامی است:

```txt
INTERPRETING → DRAFT_READY
```

اگر ورودی از همان ابتدا کافی باشد، AI نباید برای حفظ ظاهر مکالمه سؤال مصنوعی بپرسد.

مثلاً:

```txt
«هر دوشنبه، چهارشنبه و جمعه ساعت ۷ عصر ۳۰ دقیقه بدوم»
```

برای ساخت Routine draft احتمالاً context کافی دارد. پرسیدن «چند بار در هفته؟» فقط نمایش زنده‌ی عدم توجه سیستم است.

---

# ۶. Stateهای recovery

```txt
INTERPRETING | CLARIFYING
→ INPUT_BLOCKED
→ CLARIFYING | DRAFT_READY | MANUAL_FALLBACK | CANCELLED
```

```txt
INTERPRETING | CLARIFYING | DRAFT_READY
→ GENERATION_FAILED
→ RETRYING | MANUAL_FALLBACK | CANCELLED
```

```txt
RETRYING
→ INTERPRETING | DRAFT_READY | GENERATION_FAILED | SAFETY_FALLBACK
```

```txt
MANUAL_FALLBACK
→ manual creation path
```

## تفاوت `INPUT_BLOCKED` و `GENERATION_FAILED`

### INPUT_BLOCKED

مشکل از coherence ورودی یا domain درخواست است:

- بیش از حد مبهم
    
- متناقض
    
- constraint ضروری نامشخص
    
- درخواست unsupported برای Planning
    

### GENERATION_FAILED

مشکل فنی یا runtime است:

- provider
    
- network
    
- parsing
    
- internal error
    
- model failure
    

این دو نباید یک پیام خطای عمومی بگیرند، چون راه recovery متفاوت دارند. یکی clarification می‌خواهد، دیگری retry یا manual fallback.

---

# ۷. معنای stateهای اصلی

## `DRAFT_READY`

draft وجود دارد، ولی هیچ موجودیت canonical ساخته نشده است.

## `REVIEWING`

کاربر می‌تواند:

- edit کند
    
- حذف کند
    
- قبول کند
    
- رد کند
    

## `APPROVED`

کاربر صریحاً creation محتوای پذیرفته‌شده را تأیید کرده است.

## `CANCELLED`

flow بدون ساخت موجودیت پایان می‌یابد.

## `MANUAL_FALLBACK`

context فهمیده‌شده به مسیر manual منتقل می‌شود، ولی چیزی خودکار ساخته نمی‌شود.

---

# ۸. مرز اصلی authority

قاعده‌ی مرکزی Discussion:

```txt
Conversation produces a proposal.
Approval creates product entities.
```

یعنی:

```txt
مکالمه
→ interpretation
→ clarification
→ draft
≠ canonical state
```

فقط بعد از review و approval صریح، backend می‌تواند وارد مسیر validation و commit شود.

این Discussion هنوز جزئیات transaction را تعریف نمی‌کند، اما boundary محصول را روشن می‌کند:

```txt
AI output has no mutation authority.
```

---

# ۹. Clarification چه زمانی مجاز است؟

Clarification انتخابی است، نه مرحله‌ای اجباری.

AI فقط زمانی سؤال می‌پرسد که پاسخ، یکی از این موارد را materially تغییر دهد:

- entity type
    
- ownership زیر Goal یا Project
    
- actionable content
    
- timing یا recurrence ضروری
    
- constraintی که جلوی proposal غیرواقعی یا متناقض را می‌گیرد.
    

## Mandatory clarification

فقط زمانی mandatory است که بدون پاسخ، draft مجبور شود یک assumption مهم و پراثر بسازد.

مثال‌ها:

- Routine بدون recurrence قابل‌استفاده
    
- تاریخ‌های متناقض یا ناممکن
    
- Goal یا Project انتخاب‌شده‌ی مبهم
    
- دو intention متفاوت که نمی‌توان امن ترکیب کرد
    
- hard constraint صریح ولی تعریف‌نشده.
    

## Optional clarification

ممکن است draft را بهتر کند، اما ارزشش باید بیشتر از هزینه‌ی یک interaction دیگر باشد.

این معیار مهم است:

```txt
better draft
≠ always worth another question
```

---

# ۱۰. سؤال‌های ممنوع

AI نباید درخواست کند:

- اطلاعات حساس غیرضروری
    
- تاریخچه‌ی کامل زندگی
    
- تشخیص روان‌شناختی
    
- questionnaire امتیاز انگیزه
    
- اطلاعاتی که کاربر قبلاً گفته
    
- جزئیات فنی غیرلازم
    
- تأیید فرض‌های واضح و کم‌ریسکی که در draft قابل نمایش‌اند
    

همچنین نباید سؤال حل‌نشده‌ی قبلی را با کلمات مختلف تکرار کند.

## نتیجه‌ی محصولی

AI باید **حداقل context کافی** را جمع کند، نه حداکثر اطلاعات ممکن را.

---

# ۱۱. محدودیت سه turn

بودجه‌ی پیش‌فرض clarification:

```txt
maximum 3 AI clarification turns
```

بیشتر flowها باید صفر تا دو turn نیاز داشته باشند.

بعد از turn سوم، AI باید یکی از این کارها را انجام دهد:

```txt
1. draft با assumptionهای visible
2. partial draft کوچک‌تر
3. معرفی تنها ambiguity مسدودکننده
   + manual creation یا restart
```

اجازه ندارد interview را بی‌نهایت ادامه دهد.

## این عدد hard product limit است؟

عدد سه، policy پیش‌فرض MVP است، نه حقیقت جهان‌شمول درباره‌ی شناخت انسان.

اما تا وقتی تصمیم دیگری جایگزینش نکرده، behavior محصول باید همین باشد.

---

# ۱۲. قابلیت `Draft now`

کاربر در هر مرحله‌ی clarification عادی می‌تواند انتخاب کند:

```txt
Draft now
```

AI سپس از این‌ها استفاده می‌کند:

- input صریح
    
- context انتخاب‌شده
    
- assumptionهای کم‌ریسک
    

ولی اجازه ندارد مخفیانه اختراع کند:

- deadline
    
- recurrence
    
- ownership
    
- measurable Goal outcome
    
- availability کاربر.
    

اگر مقدار ضروری وجود ندارد، partial draft بهتر از fabrication است.

`Draft now` نیز نمی‌تواند `SAFETY_FALLBACK` را دور بزند.

---

# ۱۳. درخواست‌های محدود و مستقیم

کاربر می‌تواند فقط یک بخش کوچک بخواهد:

```txt
یک یا چند Task
یک یا چند Routine
یک Project
```

AI نباید Goal یا Project اضافه بسازد فقط چون hierarchy کامل‌تر به‌نظر می‌رسد.

نمونه‌ها:

```txt
Email the landlord tomorrow
→ standalone Task
```

```txt
Practice English every weekday
→ standalone Routine
```

```txt
Plan the steps needed to move apartments
→ standalone Project + Tasks
```

---

# ۱۴. ورودی مبهم، متناقض یا unsupported

## مبهم ولی قابل‌استفاده

یک سؤال باارزش یا draft محافظه‌کارانه با assumptionهای visible.

## بیش از حد مبهم

سیستم فقط اولین ناحیه‌ی concern را narrow می‌کند؛ نه اینکه ادعا کند کل زندگی کاربر را فهمیده است.

## متناقض

کوچک‌ترین سؤال لازم برای رفع تناقض را می‌پرسد و یکی از طرف‌ها را مخفیانه انتخاب نمی‌کند.

## ناقص ولی non-blocking

اطلاعات مفقود به assumption قابل‌ویرایش تبدیل می‌شود، نه سؤال اضافه.

## درخواست تخصصی unsupported

مثلاً:

```txt
علائمم را تشخیص بده و یک برنامه درمانی بساز.
```

سیستم:

```txt
boundary را اعلام می‌کند
→ alternative برنامه‌ریزی امن پیشنهاد می‌دهد
→ برای input مرتبط با planning در CLARIFYING باقی می‌ماند
```

می‌تواند appointmentها، سؤال‌ها و اقداماتی را که خود کاربر ارائه کرده سازمان دهد، ولی حق تشخیص، تجویز یا ادعای authority حرفه‌ای ندارد.

---

# ۱۵. `SAFETY_FALLBACK`

Crisis یا immediate danger یک unsupported request عادی نیست.

```txt
crisis signal
→ SAFETY_FALLBACK
→ fixed safety response
→ no planning draft
```

در این state:

- reasoning باز Planning متوقف می‌شود
    
- از crisis content draft ساخته نمی‌شود
    
- هیچ Goal، Project، Task یا Routine پیشنهاد نمی‌شود
    
- تغییری روی داده‌های قبلی پیشنهاد نمی‌شود
    
- پاسخ ثابت safety نمایش داده می‌شود
    
- بعداً کاربر می‌تواند flow جدید و نامرتبطی را از `EMPTY` شروع کند.
    

## علت اهمیت این تصمیم

نسخه‌ی اولیه safety را به Discussion بعدی موکول کرده بود، اما review نشان داد نمی‌توان flow ورودی را بست بدون اینکه حداقل رفتار crisis همین‌جا مشخص باشد.

این finding در نهایت به‌عنوان blocking شناخته و با `SAFETY_FALLBACK` حل شد.

---

# ۱۶. خروج، Restart و بازیابی

پیش از approval، کاربر می‌تواند:

```txt
Cancel
Restart
Edit original intention
Draft now
Continue manually
```

- Cancel بدون creation پایان می‌دهد.
    
- Restart flow را پاک و به `EMPTY` برمی‌گرداند.
    
- Edit به input اولیه برمی‌گردد.
    
- Continue manually وارد `MANUAL_FALLBACK` می‌شود.
    
- تغییر material در intention نباید بی‌سروصدا با flow قبلی ترکیب شود.
    

draft تأییدنشده می‌تواند برای recovery کوتاه‌مدت نگهداری شود، ولی:

- باید unapproved بماند
    
- نباید بعداً مثل plan پذیرفته‌شده ظاهر شود
    
- هیچ entity پیش از approval ساخته نمی‌شود
    

---

# ۱۷. تصمیم‌های نهایی Discussion 013

## Entry

- broad و narrow intention پشتیبانی می‌شوند
    
- Goal اجباری نیست
    
- standalone work معتبر است
    
- ورود global و contextual وجود دارد
    
- manual path دائمی است
    
- draft فعال بدون تصمیم کاربر overwrite نمی‌شود
    

## Clarification

- selective است
    
- حداکثر پیش‌فرض سه turn
    
- `Draft now` وجود دارد
    
- assumptionهای non-blocking visible هستند
    
- مقدارهای پراثر silently invented نمی‌شوند
    

## State model

- conversation و quick replies ترکیب می‌شوند
    
- free text همیشه در دسترس است
    
- bypass مستقیم draft وجود دارد
    
- retry و manual fallback رسمی‌اند
    
- unsupported عادی به clarification برمی‌گردد
    
- crisis state جدا دارد
    

## Authority

- AI content پیش از approval ephemeral است
    
- هیچ entity پیش از approval ساخته نمی‌شود
    
- تغییر consequential خودکار اعمال نمی‌شود
    

## Safety

- crisis وارد Planning reasoning نمی‌شود
    
- entity تولید نمی‌کند
    
- fixed safety response بر flow عادی و `Draft now` مقدم است.
    

---

# ۱۸. اثر Discussion 013 روی مپ

این Discussion عمدتاً روی چهار بخش اثر دارد:

```txt
User Flow
AI Responsibilities
AI Guardrails
MVP Core Loop
```

اما اثرهای فرعی در Current Decisions، Open Configuration و Validation نیز دارد.

---

## A. User Flow — Planning

### اثر مورد انتظار

مپ باید این مسیر را نشان دهد:

```txt
Global or contextual entry
→ active-draft collision handling
→ broad or narrow intention
→ INTERPRETING
→ direct draft or selective clarification
→ up to 3 turns
→ Draft now / manual / restart / cancel
→ DRAFT_READY
→ REVIEWING
→ explicit approval
```

همچنین باید مسیرهای failure و safety را از happy path جدا کند.

### وضعیت فعلی مپ

Planning Flow فعلی این موارد اصلی را پوشش می‌دهد:

- global entry
    
- contextual entry
    
- manual path
    
- free intention
    
- clarification فقط وقتی material است
    
- معمولاً حداکثر سه turn
    
- draft موقت و قابل‌ویرایش
    
- approval پیش از canonical creation
    

### ارزیابی

semantic flow درست منتقل شده است.

Stateهای دقیق مثل `INPUT_BLOCKED` و `RETRYING` احتمالاً در formal UX/API state specification نگهداری می‌شوند، نه در متن خلاصه‌ی node اصلی؛ این abstraction قابل‌قبول است.

### نتیجه

```txt
Planning User Flow → ACCEPTED
```

---

## B. MVP Core Loop

اثر 013 روی Core Loop:

```txt
intention
→ bounded conversation
→ reviewable draft
→ explicit confirmation
```

این بخش از loop فعلی درست است.

Discussion 013 mutation بعد از approval را کامل تعریف نمی‌کند؛ صرفاً اجازه می‌دهد مسیر canonical commit آغاز شود. جزئیات revalidation و transaction متعلق به Discussionهای بعدی‌اند.

### نتیجه

```txt
Core Loop entry and proposal boundary → ACCEPTED
```

---

## C. AI Responsibilities

مپ باید نشان دهد AI می‌تواند:

- intentionهای broad و narrow را تفسیر کند
    
- entity type احتمالی را تشخیص دهد
    
- سؤال‌های باارزش بپرسد
    
- clarification budget را رعایت کند
    
- assumptionهای material را نمایش دهد
    
- manual path را حفظ کند
    
- draft بسازد، نه entity canonical.
    

### وضعیت فعلی مپ

Node AI Responsibilities می‌گوید AI:

- classify می‌کند
    
- proposal محدود می‌سازد
    
- facts یا authority خلق نمی‌کند
    
- mutation انجام نمی‌دهد
    

این boundary با 013 سازگار است.

### نتیجه

```txt
AI Responsibilities → ACCEPTED
```

---

## D. AI Guardrails

Guardrailهای مستقیم Discussion 013:

```txt
no forced Goal hierarchy
no silent high-impact assumptions
no repeated questions for known input
no unsupported professional authority
no silent draft replacement
crisis stops planning
crisis creates no proposal
fixed safety response overrides normal flow
```

### وضعیت فعلی مپ

مپ فعلی guardrailهای کلان زیر را دارد:

- no direct mutation
    
- no diagnosis یا professional overreach
    
- imported/generated text has no authority
    
- crisis zero proposal/mutation leakage
    
- manual fallback remains available
    

این تصمیم‌ها به‌درستی منتقل شده‌اند.

Active-draft collision و سه-turn budget بیشتر UX-flow policy هستند و لازم نیست در guardrail node اصلی با جزئیات تکرار شوند.

### نتیجه

```txt
AI Guardrails → ACCEPTED
```

---

## E. Manual Path

Discussion 013 تأکید می‌کند manual creation:

```txt
parallel product capability
≠ AI failure-only fallback
```

در مپ فعلی manual path هم در Planning و هم در reliability/fallback دیده می‌شود.

### نتیجه

```txt
Manual creation path → ACCEPTED
```

---

## F. Product Model

اثر Discussion 013 روی مدل این است که Planning entry نباید Goal-centric باشد.

یعنی UI و AI باید model 012 را رعایت کنند:

```txt
standalone Project
standalone Task
standalone Routine
```

مپ فعلی Product Model و Planning Flow هر دو standalone ownership را قبول دارند.

### نتیجه

```txt
Non-forced hierarchy → ACCEPTED
```

---

## G. Current Decisions

Discussion 013 این سؤال‌ها را نهایی بسته است:

- Goal در entry اجباری نیست
    
- درخواست مستقیم Task و Routine معتبر است
    
- interaction ترکیبی chat و structured UI است
    
- manual path وجود دارد
    
- clarification قابل‌skip است
    
- active-draft collision رفتار مشخص دارد
    
- ordinary unsupported و crisis state یکسان نیستند.
    

در decision inventory و scope فعلی، direction کلی این‌ها حفظ شده است.

### نتیجه

```txt
Current Decisions impact → ACCEPTED
```

---

## H. Open Configuration / Readiness

Product semantics بسته شده، اما implementation configurationهایی باقی می‌مانند، مثل:

- مدت نگهداری draft تأییدنشده
    
- copy دقیق UI
    
- شکل quick replyها
    
- timeout و retry behavior
    
- provider-specific error mapping
    
- localization پاسخ safety
    
- false-positive recovery
    

این‌ها سؤال محصولی باز نیستند؛ configuration یا implementation detail هستند.

### نتیجه

```txt
Open items classification → ACCEPTED
```

---

## I. Validation و Pilot Gates

Discussion 013 یک safety invariant دارد، ولی release readiness آن را خودش ثابت نمی‌کند.

Discussion 021 باید پیش از pilot اثبات کند که:

- crisis detection مسیر عادی را متوقف می‌کند
    
- no draft/entity leakage رخ نمی‌دهد
    
- controls عادی مثل Draft now override نمی‌کنند
    
- safety response درست نمایش داده می‌شود
    
- failure و false-positive handling تست شده‌اند
    

این dependency در خود سند صریح است.

مپ فعلی Safety را به validation gates متصل کرده است.

### نتیجه

```txt
Validation dependency → ACCEPTED
```

---

# ۱۹. بررسی سناریوها

## سناریو ۱: ورودی کامل

```txt
«هر روز ساعت ۸ شب ۲۰ دقیقه کتاب بخوانم»
```

انتظار:

```txt
EMPTY
→ INTERPRETING
→ DRAFT_READY
```

بدون سؤال اضافه.

---

## سناریو ۲: Routine بدون recurrence

```txt
«می‌خواهم مرتب ورزش کنم»
```

یک clarification باارزش:

```txt
چند روز در هفته؟
```

اما سیستم نباید فوراً وارد questionnaire انرژی، انگیزه، سبک زندگی و رابطه‌ی فرد با دوران کودکی شود.

---

## سناریو ۳: درخواست narrow

```txt
«فردا قبض برق را پرداخت کنم»
```

خروجی:

```txt
standalone Task draft
```

بدون Goal یا Project مصنوعی.

---

## سناریو ۴: context موجود

داخل Project «راه‌اندازی وب‌سایت»:

```txt
Plan next steps with AI
```

AI باید Project را context بگیرد و اگر ownership دیگری پیشنهاد می‌دهد، آن را شفاف نمایش دهد.

---

## سناریو ۵: draft فعال قبلی

```txt
Plan with AI
```

درحالی‌که draft قبلی موجود است:

```txt
Continue
Discard and start new
Cancel
```

نه overwrite خاموش.

---

## سناریو ۶: turn سوم clarification

بعد از سه سؤال هنوز مقداری نامشخص است:

```txt
draft with assumption
یا partial draft
یا single blocker + manual/restart
```

نه سؤال چهارم، پنجم و شانزدهم.

---

## سناریو ۷: خطای provider

```txt
GENERATION_FAILED
→ retry
→ edit
→ manual fallback
→ cancel
```

ورودی کاربر باید حفظ شود.

---

## سناریو ۸: Crisis content

```txt
crisis signal
→ SAFETY_FALLBACK
→ fixed response
→ zero planning proposal
```

`Draft now` نباید این مسیر را دور بزند.

---

# ۲۰. آیا تعارضی پیدا شد؟

## بین Discussion 013 و مدل محصول

تعارضی وجود ندارد:

- Goal اختیاری است
    
- standalone work پشتیبانی می‌شود
    
- فقط entityهای 012 ساخته می‌شوند
    
- occurrence مستقیم ساخته نمی‌شود
    

## بین Discussion 013 و Planning Flow مپ

جهت کلی کاملاً سازگار است:

```txt
bounded clarification
reviewable draft
manual escape
explicit confirmation
```

## بین 013 و Guardrails

`SAFETY_FALLBACK` و professional-domain boundary به‌درستی توسط 018A و 021 تکمیل شده‌اند.

## نکته‌ی تاریخی کوچک

در خلاصه‌ی فارسی انتهای فایل، یک اشاره به «018C» دیده می‌شود، درحالی‌که authority صحیح در بالای سند و متن اصلی `018A` است.

این یک typo مستندی است، نه تعارض محصولی. چون authority در status، related discussions و متن انگلیسی صریحاً 018A است.

با توجه به اینکه فعلاً فقط موارد لازم را تغییر می‌دهیم، این finding را ثبت می‌کنم:

```txt
013-DOC-01
Persian summary references 018C instead of 018A
Severity: Minor
```

---

# ۲۱. جمع‌بندی وضعیت مپ

```txt
Global AI entry                 ACCEPTED
Contextual entry                ACCEPTED
Manual creation                 ACCEPTED
Standalone requests             ACCEPTED
Active-draft collision          ACCEPTED
Selective clarification         ACCEPTED
Three-turn budget               ACCEPTED
Direct draft bypass             ACCEPTED
Draft now                       ACCEPTED
Visible assumptions             ACCEPTED
No high-impact fabrication      ACCEPTED
Review before creation          ACCEPTED
Retry and manual fallback       ACCEPTED
Unsupported-domain boundary     ACCEPTED
SAFETY_FALLBACK                 ACCEPTED
Crisis zero-leakage             ACCEPTED
```

---

# تعریف یک‌جمله‌ای Discussion 013

```txt
کاربر می‌تواند با یک نیت آزاد یا درخواست محدود وارد Planning شود؛
AI فقط ابهام‌های اثرگذار را در حداکثر سه نوبت می‌پرسد،
draftی موقت و قابل‌بررسی می‌سازد،
و تا پیش از تأیید صریح کاربر هیچ موجودیت canonical ایجاد نمی‌شود.
```

## نتیجه نهایی

```txt
Discussion 013         ACCEPTED
Planning flow          ACCEPTED
Map projection         ACCEPTED
Product contradiction NONE
Minor documentation    018C → 018A in Persian summary
```

مرحله‌ی بعدی **Discussion 014 و 014A** است: ساختار دقیق `PlanningDraft`، قواعد validation، partial output، assumptionها، temporal checkpointها و اینکه پیشنهاد AI چگونه از متن آزاد به payload قابل‌اعتماد تبدیل می‌شود.