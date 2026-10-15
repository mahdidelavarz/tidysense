# Discussion 028 — Clarification Quick Replies, First-Run Guides and Desktop in the Pilot

> **Amendment (2026-10-15, decided by the owner, [[01-Closed-Discussions/029-planning-quality-rolling-horizon-and-sequences]] §7, §11.2):** §2 — a question has zero or exactly two model-proposed options; the product-added free-text answer is labelled «خودت بنویس» (it replaces «چیز دیگر…») and is the third answer; a question without options opens its free-text field by default; one turn shows up to four questions (still up to three turns); `ENTITY_TYPE` is removed from the kinds. Measurement codes are unchanged (`OTHER` is the «خودت بنویس» answer).

## Status

**CLOSED — written from the owner's approved canvas designs and decided by the owner on 2026-10-13 (§6).**

```txt
STATUS = CLOSED
DECIDED_BY = OWNER
MIND_MAP = APPLIED_2026-10-13
OPEN_QUESTIONS = 0 (§6 resolved 2026-10-13)
DEVMAP_GATES = RESOLVED (STEP-17 first-run guides, STEP-18 quick replies)
IMPLEMENTATION = NOT_AUTHORIZED_FROM_THIS_FILE_ALONE
```

This discussion is authoritative product direction. It amends:

- [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]] — §4 interaction style: it fixes the shape of the "structured quick replies" 013 already accepted, and the number of questions shown together;
- [[04-Specs/day-0-onboarding]] — adds a welcome screen and three guide pages before login on phones;
- [[01-Closed-Discussions/027-ai-disclosure-response-feedback-and-product-insights]] — §5 "question code" and "option chosen" are defined here (§2.5).

The design evidence is the "Adaptive Planner — Dawn" canvas, page "در کد — پیاده‌سازی". The relevant boards are:

- planning questions, mobile and desktop;
- the four-step planning boards;
- «شروع — خوش‌آمد» and «راهنما ۱–۳»;
- the desktop boards.

---

## 1. Problem

Three parts of the approved design rest on behaviour no accepted discussion fixes yet.

- **Questions with options.**
  - 013 §4 accepted "conversation + structured quick replies when useful + free text at every clarification step".
  - The shape of those quick replies was left as open configuration ("recap of 13", §H).
  - The design gives every question model-proposed options, some multiple-choice, a «چیز دیگر…» free-text answer and a one-line reason. It shows up to three questions on one screen.
  - 027 §5 already counts "the code of each clarification option chosen", which needs a stable code no document defines.
- **Welcome and guides.**
  - The design adds a welcome image and three guide pages before login on phones, shown once.
  - The Day-0 path is `Login → OTP verification → First Entry / Initial Setup → Today` and has no such step.
  - The guides make three measurable promises ("زیر ۲ دقیقه", "زیر ۵ ثانیه", "با یک لمس").
- **Desktop.**
  - The owner decided the pilot runs on the redesigned product, desktop included.
  - The desktop boards add information the phone screens do not show, such as the «مسیر تا هدف» road on the planning draft.
  - Nothing says whether desktop may also behave differently.

---

## 2. Decision A — The shape of clarification quick replies

### 2.1 A question

A clarification question the model returns has:

- **text** — the question, as today (at most 300 characters);
- **reason** — optional, one line (at most 120 characters) saying what the answer changes in the draft, e.g. «تا مهلت‌ها درست بنشینند»;
- **kind** — one value from §2.5;
- **options** — zero, or two to seven short labels (at most 40 characters each), unique within the question;
- **multiple** — whether more than one option may be chosen.

A question with no options is answered by free text only.

### 2.2 What the product adds

- Every question shows «چیز دیگر…». Choosing it opens a free-text field (at most 500 characters, as today).
- The model must not return its own "other" option. It may return a real option such as «نمی‌دانم» when that is a useful answer.
- Option labels are model output. They are shown as plain text and never as instructions, links or formatting.

### 2.3 How many and how they are answered

- One turn shows one to three questions together on one screen, as the current implementation already allows.
- The 013 §4 preference for "one question at a time" is narrowed: questions shown together must belong to the same draft and each must be answerable on its own. Three unrelated questions on one screen is a form, which 013 forbids.
- Every question may be left unanswered. Building the draft with no answer is `Draft now` («بدون پاسخ بساز»), with its 013 §7 rules unchanged.
- The model receives the answer as text: the chosen labels, the free text, or both.
- The three-turn limit, forbidden questions and mandatory-clarification rules of 013 §6–§7 are unchanged.

### 2.4 Gate

An output whose questions break §2.1–§2.2 is rejected as a whole, like any other invalid output. That covers:

- limits;
- duplicate or empty labels;
- an "other" option;
- an unknown kind;
- `multiple` without options.

### 2.5 Codes for measurement

`kind` is one of:

| Kind | Meaning |
|---|---|
| `TIMING` | dates and deadlines |
| `RECURRENCE` | how often and on which days or times |
| `CONSTRAINT` | the user's availability or another hard limit |
| `CONTENT` | what the work actually is, including the starting point |
| `OWNERSHIP` | which Goal or Project it belongs to |
| `ENTITY_TYPE` | Task, Routine, Project or Goal |
| `CONTRADICTION` | two statements that cannot both hold |

This list follows the 013 §6 reasons for asking.

For 027 §5:

- "question code" means `kind`;
- "option chosen" means one of `OPTION`, `OTHER` or `UNANSWERED`, with the option's position.

**Option labels and free-text answers are never part of measurement.** They are model output derived from the user's text, so 019C §21 applies.

---

## 3. Decision B — One four-step planning flow

Every planning entry uses the same four named steps: نوشتن، پرسش‌ها، مرور، تأیید. This covers:

- First Entry;
- the planning page;
- the create menu;
- desktop.

- When the model asks nothing, the «پرسش‌ها» step is shown as passed, not hidden. The user always sees the same path.
- The steps are presentation only. The 013 state model and the 014/018 review, confirmation and apply rules are unchanged.

---

## 4. Decision C — Welcome and first-run guides

### 4.1 Path

On a phone, at first open, before login:

`Welcome → Guide 1 → Guide 2 → Guide 3 → Login → OTP verification → First Entry / Initial Setup → Today`

- **Welcome:** a full-screen image, the product mark and «شروع» only.
- **Guides:**
  - each guide states one promise and shows it on a static example of the real screen;
  - pages 1–2 offer «رد شدن»; every page after the first offers back;
  - the last page leads to login with «شروع کنیم».
- **Where they appear:**
  - an existing session skips the welcome and guides;
  - desktop goes straight to login.

### 4.2 "Seen once"

- The mark that the guides were seen is kept **on the device**, because no account exists yet.
- The guides return after the browser's data is cleared or on a new phone. This is accepted.
- **Nothing is recorded on the server** about the welcome or the guides: not views, skips or time. There is no account to attach it to, and the pilot does not need it.

### 4.3 The promises must be true

| Guide | Promise | Holds when |
|---|---|---|
| 1 | زیر ۲ دقیقه | From the first submitted sentence to a reviewable draft, including one question turn, the median of internal pre-pilot runs is under 2 minutes. During the pilot it is the median time to draft shown in «سنجش محصول». |
| 2 | زیر ۵ ثانیه | A one-line Task is saved within 5 seconds of tapping the create button, on a phone, without opening another field. |
| 3 | با یک لمس | 027 §6: single-item Complete and Carry-to-today apply on tap. |

- If a promise does not hold, **the copy changes** to what is true. The product is not made to look faster than it is.
- The copy is presentation. Changing it does not reopen this decision.

---

## 5. Decision D — Desktop is part of the pilot product

- The pilot runs on phone and desktop.
- Desktop has its own layouts and may show more at once. Side panels, the icon rail and the «مسیر تا هدف» road are examples.
- **Desktop adds no behaviour.** Every action on desktop exists on the phone, and every extra figure is derived from data the phone screen already has.
- The road shows the draft's own items over time. It shows no new fact, estimate or prediction.

---

## 6. Resolved points (owner, 2026-10-13)

The owner accepted all four recommendations.

1. **Several questions on one screen (§2.3).** Up to three related questions together, instead of 013's "one at a time". **Accepted.** The design and the current code already do it.
2. **Nothing recorded about the guides (§4.2).** The alternative is anonymous device counts. They would need a new data class, and 30–50 users is too few for them to mean anything. **Accepted:** nothing is recorded.
3. **The rule for the promises (§4.3).** **Accepted:** the copy changes; the measurement is never stretched.
4. **Desktop adds no behaviour (§5).** **Accepted.** Otherwise every feature would be built and tested twice.

---

## 7. Rejected

- **A free-form model "other" option.** It would duplicate «چیز دیگر…» and break measurement.
- **Storing option labels or free-text answers for analytics.** That would be user-derived text, which 019C §21 forbids.
- **Guides on desktop.** Desktop users arrive deliberately, and the boards are designed for phones only.
- **Guides after login**, tied to the account. That would add a step in front of First Entry, which is already the product's first real action.

---

## 8. Affected artifacts

- **013:** amendment note on §4.
- **`04-Specs/day-0-onboarding.md`:** the path in §4.1.
- **027:** a note on §5 codes.
- **Decision inventory and `00-START-HERE.md`.**
- **DevMap:**
  - STEP-17 and STEP-18 product gates resolved;
  - the 014/020c clarification output schema, the gate, prompt fixtures and the stored answer shape (STEP-18);
  - measurement of kind and answer type (STEP-14/STEP-20).

---

## خلاصهٔ فارسی

- **پرسش‌ها:**
  - هر پرسش متن، یک خط دلیل، نوع، و ۲ تا ۷ گزینه‌ی پیشنهادیِ مدل دارد (تکی یا چندتایی).
  - «چیز دیگر…» را خود محصول همیشه اضافه می‌کند.
  - هر پرسش اختیاری است، و بدون هیچ پاسخی همان «بدون پاسخ بساز» است.
  - تا سه پرسش مرتبط در یک صفحه نمایش داده می‌شود.
  - برای سنجش فقط نوع پرسش و نوع پاسخ ثبت می‌شود، نه متن گزینه‌ها یا متن کاربر.
- **مسیر برنامه‌ریزی:** همه‌جا یک مسیر چهارمرحله‌ای است: نوشتن، پرسش‌ها، مرور، تأیید.
- **راهنماها:**
  - فقط روی گوشی، قبل از ورود، و یک بار برای هر دستگاه نمایش داده می‌شوند.
  - هیچ چیزی از آن‌ها روی سرور ثبت نمی‌شود.
  - اگر یکی از وعده‌ها (۲ دقیقه، ۵ ثانیه، یک لمس) در عمل درست نبود، متن عوض می‌شود.
- **دسکتاپ:** بخشی از پایلوت است. چیدمان خودش را دارد ولی هیچ رفتاری اضافه نمی‌کند.
