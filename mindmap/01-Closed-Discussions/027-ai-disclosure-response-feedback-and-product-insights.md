# Discussion 027 — AI Disclosure, Response Feedback, Product Insights and Single-Item Reconcile Actions

## Status

**CLOSED — decided by the owner on 2026-10-13 during the canvas redesign review.**

```txt
STATUS = CLOSED
DECIDED_BY = OWNER
MIND_MAP = APPLIED_2026-10-13
DEVMAP_RECONCILIATION = PENDING (consent gate, pilot questions, operator page and metric dictionary are implemented under STEP-11)
OPEN_QUESTIONS = 0 (§8 resolved 2026-10-13)
IMPLEMENTATION = NOT_AUTHORIZED_FROM_THIS_FILE_ALONE
```

This discussion is authoritative product direction. It amends:

- [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]] — §4 temporal changes, for one-tap Reconcile item actions (§6 here)
- [[01-Closed-Discussions/019c-events-ai-observability-and-retention]] — the 2026-10-09 AI-provider consent record, the pilot feedback record and pilot operator access (§20, §25)
- [[01-Closed-Discussions/021-validation-plan-and-decision-gates]] — adds product-insight measures beside H1/H2; does not change H1/H2 definitions or gates

The design evidence is the "Adaptive Planner — Dawn" canvas, page "در کد — پیاده‌سازی": privacy page, planning draft (mobile and desktop), desktop Reconcile, and the operator pages "سلامت سیستم" and "سنجش محصول".

---

## 1. Problem

The 2026-10-09 pilot work added a consent gate before AI planning, named the AI provider to users, collected two fixed research questions as numbers only, and kept the operator page to system health and H1/H2 rows. The owner reviewed this against the redesigned product and found:

- the consent card is an extra step in front of the product's main path, and asking permission to use the feature the user has just chosen adds friction without adding information the user lacks;
- naming the provider exposes a supplier choice the owner does not want to publish;
- the owner cannot tell whether the product is useful: there is no measure of satisfaction with AI responses, no reason when a response is poor, and no view of activation, retention, what users remove from drafts, or whether AI-created work is executed;
- the redesigned Reconcile applies the two everyday item decisions on tap, which the confirmation rule for date changes does not allow.

The owner also asked whether user text sent to the AI could be read for product learning. That was **rejected** (§7).

---

## 2. Decision A — No separate AI consent step

AI planning is available without a consent gate.

- The planning entry does not show a consent card or ask for agreement before the first attempt.
- Starting a planning attempt is not refused for lack of consent. `AI_CONSENT_REQUIRED` and the consent grant/withdraw action are retired.
- No new `AI_CONSENT_CHANGED` events are recorded. Events already recorded remain R1 history.
- The manual path stays available everywhere and sends nothing to a model.
- Disclosure moves entirely to the privacy notice (§3). No disclosure line, banner or first-use notice is added to the planning flow.

This supersedes the "AI-provider consent decision" record added to 019C §20 on 2026-10-09.

---

## 3. Decision B — Disclosure without naming the provider

The privacy notice states, in plain language:

- planning text, the user's answers to clarification questions and a summary of the account's own goals and work are sent to an AI model **only to build the draft**;
- TidySense does not store a copy of the text sent or the model's raw response;
- the model's servers are outside Iran, so the text leaves the country;
- the phone number is never sent, and the Reconcile explanation is built from counts and codes only;
- what is kept, for how long, and how to request erasure.

The provider or model name is **not shown to users** anywhere, and user-facing API responses do not carry it. It remains visible on operator surfaces and in configuration.

The data-location sentence is retained deliberately: it does not identify the supplier, and it is the fact users most need about where their text goes.

---

## 4. Decision C — Sampled satisfaction with AI responses

After an AI response is shown, the product may ask how satisfied the user is with it.

### When

- Planning: when a reviewable draft is shown.
- Reconcile: when the AI explanation of a session is shown.
- Asked for a random sample of responses. The rate is configuration; the design assumes about one in three.
- Asked at most once per response, inside the response surface, never as a modal, and never blocking review, confirmation or the next step.

### What

- One five-point scale: بد، ضعیف، معمولی، خوب، عالی (1–5).
- A rating of 1 or 2 opens an optional free-text field: «چه چیزی خوب نبود؟». Sending without text is allowed.
- A rating of 3–5 is recorded at once.
- Closing the prompt records nothing and is not a rating.

### Record and retention

- One record per answered prompt: surface (`PLANNING_DRAFT` or `RECONCILE_EXPLANATION`), the subject's identity, rating, optional reason text, instrument version, time.
- Retention R2: removed 180 days after it was made and on account erasure. The record is linked to the account only so erasure can remove it.
- The reason text is the only user-written text the operator can read (§5). It is shown without account identity, phone number, titles or the subject's content.
- The privacy notice lists this record and its duration.

This amends the 019C §20 pilot feedback record ("a number on a fixed scale … no text"): user-volunteered reason text is now allowed for this instrument only.

---

## 5. Decision D — Product insights for the operator

The operator page gains a second view, "سنجش محصول", beside system health. It answers whether the product is useful, using data the product already records plus the derived fields listed below.

### Content

- **People:** registered accounts and weekly sign-ups; activation (accounts that reached a first applied plan); weekly active accounts (did work, reconciled or planned — opening the app does not count); weekly cohort retention.
- **Planning funnel:** attempt started → reviewable draft → disposition → accepted → applied → still applied after 7 days, with the drop at each step. Accepted unchanged and accepted after edits are separate rows. Median time to draft.
- **What users remove before accepting**, by entity type.
- **Clarification questions** by question code: asked, answered, «چیز دیگر» chosen, skipped; acceptance with and without answers. No answer text.
- **Execution of AI-created work** compared with manually created work: Tasks done within 7 days, Routine occurrences done, Tasks carried more than twice.
- **Reconcile:** sessions, decisions per session, decision mix, reverted decisions.
- **Satisfaction (§4):** distribution and mean per surface, prompts shown and answered, and the list of reason texts.

### Rules

- Every figure is shown with its denominator. No thresholds or good/bad colouring are set in the product (021 §13 still governs locking).
- Internal, operator, seeded and test accounts are excluded and reported apart.
- No per-user view, drill-down, search or export of individual activity.
- Apart from §4 reason texts, no user-written text appears: no planning text, answers, titles or notes.
- Derived fields needed: entity type of each item excluded before acceptance; origin of each Task and Routine (AI draft or manual), taken from command provenance; the code of each clarification option chosen, including "other".

This amends 019C §25 "the in-app operator page stays aggregate-only": it stays aggregate-only except for §4 reason texts without identity.

---

## 6. Decision E — One-tap Reconcile item actions

In a Reconcile session, two item decisions apply on tap, with an immediate visible undo:

- mark the Task complete;
- Carry the Task to today.

The control states the exact consequence ("انجام شد", "امروز") on the specific item, so the tap is the confirmation of that single action. Undo remains available until the session is closed and restores the prior state through a deterministic command.

These still require a preview and explicit confirmation before they apply:

- Carry to any other date;
- Drop;
- every bulk or sequence action (`CARRY_ALL`, `DROP_ALL` and the rest of 025);
- Goal continuation actions (018 §4 unchanged).

Every applied action is still revalidated against current state and committed by a deterministic command with its event, exactly as before. AI never applies an action; an AI recommendation only highlights a control the user taps.

This narrows 018 §4 "set or change `plannedDate`" for these two single-item cases only.

---

## 7. Rejected

- **Reading or storing user text sent to the AI** for product learning, including an opt-in "share this example" flow. User text stays out of analytics (019C §21 unchanged). Satisfaction reasons (§4) are the only exception, because the user writes them to the team.
- **A first-use disclosure line in planning.** The owner judged that using AI already implies text is sent; the privacy notice carries the details.

---

## 8. Resolved questions (owner, 2026-10-13)

The pilot is planned for one to two months with about 30–50 accounts. The owner's priority is an accurate usefulness measure.

1. **Pilot questions stay.** `H1_USEFULNESS` (after applying a plan) and `H2_UNDERSTANDING` (after closing a session) are kept unchanged, because 021 builds "useful first plan" on the first. The §4 prompt is not shown for a subject that will also receive a pilot question in the same flow, so no user is asked twice about one plan or session.
2. **Pilot sampling is coverage-first.** During the pilot the §4 prompt is shown for every AI response, limited to once per account, per surface, per local day. The first draft and first explanation of every account are always asked. After the pilot the rate returns to configuration (about one in three).

---

## 10. Measurement rules for a small pilot

With a few dozen accounts, a handful of very active users could otherwise decide every figure. These rules apply to the product-insights view and to H1/H2 reporting:

- **Account level first.** Every rate is also reported with each account counted once (for example: accounts whose first applied plan was rated 4–5, out of accounts with an applied plan). Per-response figures are shown beside it, never alone.
- **Shown, answered and closed are separate.** A prompt or pilot question that was shown and not answered is a non-response, never a low score. Every satisfaction figure states how many were shown and how many answered.
- **Small denominators are marked.** A figure whose denominator is under 10 is labelled as a small sample. It is not hidden and not coloured. This is a sample-size label, not a threshold.
- **Counts, not only percentages.** Every rate shows "x of y". No percentage appears without its denominator.
- **Internal accounts never mix in.** Operator, internal, seeded and test accounts are excluded from every primary figure, and their count is shown.
- **Definitions are frozen before the first pilot account.** This covers metric definitions, the instrument wording, the sampling rule and the scale labels. Any later change starts a new instrument version and is reported apart, never merged into earlier figures.
- **Usefulness is read together with behaviour.** A positive rating counts toward "useful first plan" only when it is joined with the plan being applied, non-trivial and still applied after 7 days (021 §5). The product-insights view shows the two side by side.

## 9. Affected artifacts

- Privacy notice copy: no provider name, a data-location sentence, a "we do not store the text" sentence, and a feedback retention row.
- Planning entry: consent card removed.
- Planning draft and Reconcile explanation: §4 prompt.
- Reconcile item controls: §6.
- Operator page: "سنجش محصول" view.
- DevMap, at implementation:
  - STEP-11 consent gate (`AiConsentPolicy`, `aiConsentRequired`, `aiConsentGranted`, `PUT /users/me/ai-consent`);
  - `active-conventions.md` consent rule;
  - provider name in the pilot notice DTO;
  - the pilot research protocol;
  - the metric dictionary;
  - `RetentionCatalog`.

---

## خلاصهٔ فارسی

- **رضایت هوش مصنوعی حذف شد.** برنامه‌ریزی با هوش مصنوعی بدون مرحله‌ی اجازه در دسترس است و خط اطلاع‌رسانی هم در جریان برنامه‌ریزی نمی‌آید.
- **حریم خصوصی، بدون اسم مدل:** متن فقط برای ساختن پیش‌نویس به یک مدل هوش مصنوعی فرستاده می‌شود، ذخیره نمی‌شود و سرورها بیرون از ایران‌اند. اسم مدل فقط برای اپراتور دیده می‌شود.
- **نظرسنجی تصادفی بعد از پاسخ هوش مصنوعی:**
  - پنج سطح دارد، از بد تا عالی.
  - برای «بد» و «ضعیف» یک توضیح اختیاری می‌گیرد.
  - ۱۸۰ روز نگه داشته می‌شود و با حذف حساب پاک می‌شود.
  - توضیح‌ها بدون هویت به اپراتور نشان داده می‌شوند.
- **نمای «سنجش محصول» برای اپراتور:**
  - فعال‌سازی، فعال هفتگی و ماندگاری
  - قیف برنامه‌ریزی و آنچه قبل از تأیید برداشته می‌شود
  - پرسش‌ها
  - اجرای کارهای هوش مصنوعی در برابر کارهای دستی
  - بازبینی و رضایت

  همه‌ی عددها با مخرج‌اند، حساب‌های داخلی جدا شمرده می‌شوند و هیچ متن کاربری جز توضیح بازخورد نشان داده نمی‌شود.
- **در بازبینی، «انجام شد» و «امروز» با یک لمس اعمال می‌شوند** و دکمه‌ی برگرداندن دارند. «روز دیگر»، «کنار بگذار» و همه‌ی کارهای گروهی همچنان پیش‌نمایش و تأیید می‌خواهند.
- **رد شد:** خواندن یا ذخیره‌ی متن‌هایی که کاربران به هوش مصنوعی می‌دهند.
- **پایلوت (۳۰ تا ۵۰ حساب، یک تا دو ماه):**
  - دو پرسش پژوهشی موجود می‌مانند و برای یک موضوع دو بار سؤال پرسیده نمی‌شود.
  - نظرسنجی بعد از هر پاسخ هوش مصنوعی پرسیده می‌شود، حداکثر روزی یک بار برای هر حساب در هر بخش. اولین پاسخ هر حساب همیشه پرسیده می‌شود.
  - گزارش‌ها هر حساب را یک بار هم می‌شمارند.
  - «نشان داده شد»، «جواب داده شد» و «بسته شد» جدا شمرده می‌شوند.
  - مخرج کمتر از ۱۰ برچسب «نمونه‌ی کم» می‌گیرد.
  - تعریف‌ها قبل از اولین کاربر قفل می‌شوند.
