# Discussion 029 — Planning Quality: Rolling Horizon, Dates, Structure, Questions and Sequences

## Status

**CLOSED — direction accepted by the owner on 2026-10-15 (§2–§4); §11 decided by the owner the same day.**

```txt
STATUS = CLOSED
DECIDED_BY = OWNER (2026-10-15)
MIND_MAP = APPLIED_2026-10-15
OPEN_QUESTIONS = 0 (§11 resolved 2026-10-15)
DEVMAP_GATES = RESOLVED (STEP-22 planning quality, STEP-23 manual sequences, STEP-24 weekly continuation)
IMPLEMENTATION = NOT_AUTHORIZED_FROM_THIS_FILE_ALONE
```

This discussion is authoritative product direction. It amends:

- [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]] — the number of clarification turns (§7);
- [[01-Closed-Discussions/014-ai-planning-output-contract]]:
  - §4.3 minimal complete structure (§5);
  - §4.4 seven-day horizon: which dates it binds (§2);
  - §4.5 weekly continuation: made concrete (§3);
  - §9 validation and repair (§8);
  - §11 partial output (§8);
- [[01-Closed-Discussions/025-task-dependency-sequences-and-hierarchical-reconcile-grouping]] — §18 the AI planning boundary for sequences (§9);
- [[01-Closed-Discussions/028-clarification-quick-replies-first-run-guides-and-desktop]] — §2 the number of questions and options, and the product-added free-text answer (§7).

The evidence is a measured run on 2026-10-15 (§1.1).

---

## 1. Problem

The owner tested AI planning on real intentions and found it not yet useful:

- questions the user should not have to answer;
- too many questions and options;
- drafts that need heavy review;
- drafts that cannot be approved at all («این کارها به جایی وصل نیستند»).

### 1.1 Measured evidence (2026-10-15)

Ten Persian intentions went through the real planning endpoints with the pilot provider:

- Konkur in one year
- IELTS 7 in six months
- Losing 8 kg by Nowruz
- Delivering a client's shop site this month
- A party on Friday
- «زندگیم بهم ریخته»
- A precise meditation and weekly review
- Python in three months
- A thesis defence in four months
- Moving house next month

Each intention was run in three configurations:

- **A:** thinking off, the pilot configuration;
- **B:** thinking on, 4000 output tokens;
- **C:** thinking on, 12000 output tokens.

| Measure | A | B | C |
|---|---|---|---|
| Draft produced | 9/10 | 4/10 | 10/10 |
| Draft approvable without a blocking issue | 6/10 | 4/10 | 10/10 |
| Intentions asked an entity-type question | 3 | — | 1 |
| Mean time to draft | 8.6 s | — | 31 s |
| Cost per draft | ≈ $0.004 | — | ≈ $0.009 |
| Drafts a user would find useful (reviewer judgement) | ≈ 2/10 | — | ≈ 4/10 |

Causes found:

1. **Our rules block sound drafts.**
   - A planning detail proposed without a Goal or Project context had no scope it could attach to: 3/10 drafts were blocked by `FACT_SCOPE_UNSUPPORTED`.
   - Standalone Tasks the model could not date blocked approval with `STANDALONE_TASK_NEEDS_DATE`. This is the error the owner saw.
   - Neither error depends on the model's quality.
2. **The drafts are empty skeletons, in every configuration.**
   - IELTS was one Goal and nothing else.
   - The shop site was one empty Project.
   - Weight loss was one Goal and one walk.
   - Konkur ended with a Task «تعیین تاریخ دقیق کنکور»: a public fact handed back to the user.
   - Cause: the prompt's "never invent a deadline, a recurrence, availability or a measurable outcome" and "a narrow request gets only what was asked". The model writes unresolved questions instead of reasonable, editable assumptions.
   - 014 §4.4 already allows a long-term Goal and phase Projects with dates. The model does not use it.
3. **Questions.** About a third were poor:
   - entity type («این هدف را به چه صورت ثبت کنم؟»);
   - things already said («مهمانی دقیقاً چه روزی است؟» after «جمعه»);
   - public facts (the Konkur date, which «عید»).
   - «زندگیم بهم ریخته» asked six questions over two turns and then failed.
4. **Calendar errors.**
   - «جمعه ۲۳ مهر (2026-10-16)» — the Friday is 24 Mehr.
   - «پنجشنبه ۱۵ مهر» — a Gregorian day number with a Persian month name.
   - «شنبه تا چهارشنبه» became Monday–Thursday plus Saturday.
   - A Routine was placed on a Saturday the same draft recorded as unavailable.
   - The model receives Gregorian dates only and guesses the Persian calendar and the Iranian week.
5. **Ordering.**
   - The planning output has no sequence field, so the model can express order only through dates.
   - 025 §18 also allows a sequence only when the user's words say "after X".
   - Manually, a sequence can be chosen only when a Task is created. Two existing Tasks cannot be linked, and an order cannot be changed. The owner could not build one.
6. **Model budget.** With thinking on, 6/10 attempts failed because reasoning used the whole 4000-token output budget. With 12000 tokens all ten succeeded. This is technical configuration (§10), not product behaviour.

---

## 2. Decision A — Rolling horizon: long dates are allowed, detailed work is one week

**Accepted direction (owner, 2026-10-15).**

- A draft may give **Goals and Projects a `targetDate`, and Tasks a `deadline`, beyond the seven-day window**, up to 24 months ahead. Example: Konkur gets a Goal dated about a year away.
- **Task `plannedDate` and the start of a Routine stay inside the seven-day window.** The detailed execution horizon of 014 §4.4 is unchanged.
- **Undated Tasks stay what they are now:** allowed only under a Goal or Project (026). They hold real later steps of that parent, not leftovers.
- A Routine starts inside the first week and keeps recurring after it (§11.1). Continuation (§3) may adjust or pause it.
- **The draft says why.** The review step shows, above the items, one line such as:
  > «این هفته را دقیق چیدیم. هفتهٔ بعد را با توجه به اینکه این هفته چطور پیش رفت می‌سازیم.»

  The exact copy is presentation.

### Rejected

- **A fully scheduled long-term plan.**
  - It breaks in the second week: dozens of overdue Tasks.
  - Reconcile would then present the failure instead of preventing it.
  - The model cannot know week 10's content before seeing week 1.
- **Removing the horizon and letting Reconcile adapt afterwards.** For the same reason: it adapts after the damage.

---

## 3. Decision B — Weekly continuation is built (separate step)

**Accepted direction (owner, 2026-10-15).**

014 §4.5 accepted an adaptive weekly continuation. The current product has none: after the first week the user gets nothing unless they start planning again. The rolling horizon of §2 only works with continuation.

- Near the end of a planned window, the product offers the next one for that Goal or Project.
- The next window is built from evidence:
  - what was completed, carried, dropped or left;
  - the Routine occurrences kept or missed;
  - accepted planning details and sequences.
- The proposal is a normal PlanningDraft: it has the same review and the same confirmation, and approving it is the "continue" decision of 014 §4.5.
- It is offered, never forced. It integrates with Reconcile and is not a weekly interruption (014 §4.5).
- Generation starts when the user taps «برنامهٔ هفتهٔ بعد», never by itself (§11.4).
- It is a **separate DevMap step, built after the planning-quality step**, so the first draft is right before it is repeated weekly.

> **Implementation note (STEP-24, 2026-10-16; chosen in implementation, for the owner to confirm or change).** Each choice below follows the bullets above.
>
> - **Offer window.** "Near the end" means from the week's second-to-last day until seven days after it ends. After that the offer stops, so it never becomes the weekly nag 014 §4.5 rules out. The Goal stays, and planning it again is one tap away on its page.
> - **Where the offer shows.** On Today, at the end of Reconcile, and on its own Goal's or Project's page. It shows only what happened, in counts, and judges nothing.
> - **Which week it plans.** The next week starts the day after the last one ends, or today once that day has passed.
> - **Decisions (014 §4.5 vocabulary, on the previous week):**
>   - approving the draft as proposed is `CONTINUE_AS_IS`; approving after an edit is `ADJUST`;
>   - «فعلاً نه» is `PAUSE_OR_STOP`. It can still be overturned by approving a next week from the Goal's page;
>   - a new plan for the same Goal or Project is `REPLANNED`.
> - **Questions in a continuation.** It does not ask about availability again. It keeps last week's rhythm, from its Routines' days and times and its Tasks' days, and states that as an assumption. It asks at most one question, and only for a choice the evidence leaves open.
> - **Existing work.** It is never proposed again, in any wording. A left Task stays with the user and is moved in Reconcile.

> **Amendment (2026-10-16, decided by the owner, after the week-two evaluation).** Three changes make the next week more accurate without keeping the conversation:
>
> 1. **Existing work is dated.** The next week may put an existing open step into its days (014 note). In the evaluation, week two kept proposing existing steps again in other words, because a draft could only create. Those repeats were then dropped, which left thin weeks.
> 2. **The Goal's point reaches every week.** The Goal's own desired outcome and target date, or a Project's completion meaning and target date, are part of the planning context. They are what the user approved, so every week is planned as a step towards it.
> 3. **What the user said is remembered as planning details.** Their starting point, focus, tools and ruled-out ways are offered as planning details in the review («برای دفعه‌های بعد یادم بماند؟»). Kept ones reach later weeks (023).
>
> The raw intention and answers are **not** kept or sent later (023 §bounded history). They can go stale, the user cannot see or correct them, and they are not what the evaluation showed missing.

---

## 4. Decision C — Which dates the model must set and which it may not invent

**Accepted (owner, 2026-10-15).**

| Date | Rule | Why |
|---|---|---|
| Task `plannedDate`, Routine days and time of day | **Always set.** When unsure, choose a reasonable value and note it as an assumption. | A wrong one costs one move. |
| Goal / Project `targetDate` from a public or stated fact (Konkur, Nowruz, "end of this month", "in four months") | **Set it, as an estimate.** The item shows «تخمینی» with the assumption. | The model knows these; asking the user is the complaint. |
| Task `deadline` | **Only when the user said it or a fixed real-world date implies it** (a delivery date, a handover date, an exam). Never invented. | A false deadline creates false urgency and Reconcile pressure after approval, where the user no longer knows it was a guess. |

The prompt rule "never invent a deadline, a recurrence schedule, … or the user's availability" is replaced by this table. The ban on inventing a **measurable Goal outcome** stays. A Goal's `desiredOutcome` is written from the user's words, such as «نمرهٔ ۷ آیلتس».

---

## 5. Decision D — Structure only when it is real

**Accepted direction (owner, 2026-10-15).** This makes 014 §4.3 testable.

- **Goal** — an outcome the user wants that takes longer than about a month and can be recognised when reached. At most one per draft (014 §4.2).
- **Project** — a concrete result or event with an end and several steps of its own. «اسباب‌کشی» and «تحویل سایت» are Projects. "Three things left over" is not.
- **Standalone Task or Routine** — everything else.
- **No empty parent.** Every proposed Goal or Project has at least one child Task or Routine in the draft. A Project may also carry undated later steps.
- **No re-parenting to make a draft valid.** A Task is never moved under a Goal or Project, and no Project is created, only because the Task had no date. The fix is a date (§4) or a regeneration (§8).
- **The system decides structure.** The user is not asked whether they want a Goal, a Project or a Routine (§7).
- **Long intentions get a usable first week.** For a Goal with a horizon of months:
  - two to four phase Projects with target dates;
  - the core Routine with days and a time;
  - three to seven concrete Tasks for this week.

  014 §11's "no filler" still holds: each Task is a real step.

---

## 6. Decision E — The calendar comes from the product

- The model receives, for every day of the window:
  - the Gregorian date;
  - the Persian date;
  - the Persian weekday name;
  - the ISO weekday number.
- It also receives the mapping شنبه = 6 … جمعه = 5.
- Persian dates and weekday names shown to the user are always rendered by the product from Gregorian values, never copied from model text.
- A Routine on a weekday that a HARD detail of the same draft rules out is a blocking conflict even when the detail itself is new in this draft.

---

## 7. Decision F — Fewer, better questions

Limits decided by the owner on 2026-10-15 (§11.2).

- **Ask only about the user:**
  - their availability;
  - their starting point;
  - what is left of the work;
  - a choice only they can make.
- **Never ask:**
  - the entity type (the `ENTITY_TYPE` kind is removed);
  - a public fact (state it as an assumption);
  - anything already said.
- **`OWNERSHIP`** is asked only to choose between the user's existing Goals or Projects.
- **Limits:**
  - **up to three clarification turns**, as in 013;
  - **up to four questions** in each turn, instead of three (028 §2.3);
  - **a later turn only when an earlier answer opened a new question** that changes the draft; never to ask what could have been asked in the first turn;
  - **three answers per question at most:** zero or exactly two model-proposed options, single or multiple choice, and a third the product always adds, «خودت بنویس», which opens free text. It replaces «چیز دیگر…» (028 §2.2), and the model still never returns its own "other" option;
  - **a question without options opens its free-text field by default**, so the user can type at once;
  - «بدون پاسخ بساز» stays. Every question remains optional.
- A question whose likely answers are many (such as which weekdays) has no options and is answered in the open free-text field.
- **Prefer drafting.** When the intention is plannable with visible assumptions, draft without asking. The user corrects the draft, which is faster than answering.

---

## 8. Decision G — The user never sees a structural error

**Accepted (owner, 2026-10-15): "the plan must at least be structurally flawless".**

- Validation runs as today.
- If any item has a blocking structural issue:
  1. **one regeneration** runs, with the list of issues;
  2. if items are still invalid, **they are removed from the draft** and named in one visible note, e.g. «این مورد را نتوانستیم درست بچینیم و کنار گذاشتیم».
- The rest stays approvable.
- `GENERATION_FAILED` remains only when nothing valid is left.
- A planning detail with no scope when there is no Goal or Project context must be scoped to the draft's Goal or Project, or not proposed. The prompt says so, and the regeneration covers it.
- Repair still never changes meaning silently (014 §9):
  - removal is visible;
  - nothing is re-dated, re-typed or re-parented by the system.
- Blocking issues that come from **the user's own edits** in review still show, as today. This rule is about what the model hands over.

---

## 9. Decision H — Sequences the model can propose and the user can build

### 9.1 AI

- The planning output gains sequence membership and order (025 §18 already requires the draft to expose them).
- The model proposes a sequence when **a step needs the result of another**, for example: collect data → analyse → write the chapter.
  - This widens 025 §18, which allowed one only on explicit words (§11.3).
  - Mere list order or dates are still not dependency (025 §2).
- Same-scope, linear and hard, as in 025.
- In review, a sequence shows as a numbered chain «۱ ← ۲ ← ۳». It has one control to remove the order, which leaves independent Tasks.

### 9.2 Manual

- On any active Task without a sequence: **«بعد از…»** picks a same-scope Task that it must follow.
  - If that Task has no sequence, one is started for both.
  - This replaces the abstract «شروع دنبالهٔ جدید» on creation.
- In a sequence's unresolved part: **move up or down**, with the consequence preview 025 §16 already accepted.
- **Remove from order** on a Task in a sequence. Rules for a removed middle step follow 025 §4.

The exact screens belong to the DevMap step.

---

## 10. Quality bar

The planning-quality step is accepted only when a fixed evaluation set passes with the pilot configuration.

- **The set:** at least 30 Persian intentions, including the ten of §1.1.
- **Answers:** written for each intention as a user would give them, not a fixed first option.
- **The bar:**
  - ≥ 95% of drafts approvable without a blocking issue;
  - 0 entity-type questions;
  - at most 1 in 10 drafts asks a public fact;
  - no draft has an empty Goal or Project;
  - every Persian date and weekday shown is correct;
  - the median time to draft, including one question turn, stays under the 2 minutes promised by guide 1 (028 §4.3).
- The run also reports the number of turns and questions per draft, so a drift towards more asking is visible.
- The set is kept and re-run on every prompt or model change.
- Model choice and budget (thinking, output tokens) are technical, decided in DevMap against this bar.

---

## 11. Resolved points (owner, 2026-10-15)

1. **Routines continue after the first week.** **Accepted.** A Routine starts in the first week and keeps going; continuation (§3) may adjust or pause it. Ending it after a week would force the user to recreate every Routine weekly.
2. **Question limits (§7).** The owner decided: **up to three turns, each with up to four questions, and three answers per question** — two model options plus «خودت بنویس». A question without options opens its free-text field by default. This replaces the recommendation of one turn with two questions and two to four options. Owner amendment the same day: three turns stay possible, not one.
3. **Threshold for AI sequences (§9.1).** **Accepted:** "a step needs another's result", not only explicit words. The user removes a chain with one control.
4. **Continuation start (§3).** **Accepted:** generated when the user taps «برنامهٔ هفتهٔ بعد». No cost for abandoned plans.
5. **Waiting time.** **Accepted:** 20–80 seconds is acceptable with an honest waiting screen, if the bar of §10 needs it. The model configuration is chosen only after re-measuring with §2–§9 in place, because the fast mode may then be enough.

---

## 12. Rejected

- **A date range on Tasks.**
  - `plannedDate` + `deadline` already express "do it around here, at the latest then".
  - A range would add new rules to Today (which days does it show?), to overdue and to Carry.
- **Attaching undated Tasks to a Goal or Project, or creating a Project per Task, to pass validation** (§5).
- **A fully scheduled year, or no horizon** (§2).

---

## 13. Affected artifacts

- **013:** amendment note on the number of turns.
- **014:**
  - notes on §4.3, §4.4 (dates beyond the window), §4.5 (continuation), §9 and §11 (removal of invalid items);
  - §5 gains sequence membership on Task proposals.
- **025:** note on §18 (threshold) and the manual sequence actions.
- **028:** note on §2.1–§2.3: two model options, «خودت بنویس», up to four questions, free text open when there are no options.
- **`04-Specs/ai-native-mvp-baseline.md`, the decision inventory and `00-START-HERE.md`.**
- **DevMap:**
  - STEP-22, planning quality: prompt, output schema with sequences, calendar context, regeneration and removal, question limits, the review line and chain, and the evaluation set as acceptance;
  - STEP-23, manual sequences: «بعد از…», move and remove;
  - STEP-24, weekly continuation.

---

## خلاصهٔ فارسی

**آزمون ۲۰۲۶-۱۰-۱۵ (۱۰ هدف واقعی):**
- در تنظیم فعلی ۶ از ۱۰ پیش‌نویس قابل تأیید بود و حدود ۲ تا مفید.
- ۳ شکست کار قوانین خود ما بود، نه مدل.
- برنامه‌ها اسکلت خالی بودند.
- یک‌سوم سؤال‌ها بد بودند.
- مدل تاریخ شمسی و روزهای هفته را اشتباه حساب می‌کرد.

**تصمیم‌ها:**
- **افق غلتان:**
  - تاریخ هدف و پروژه و مهلت کار می‌تواند تا ۲۴ ماه جلو برود.
  - تاریخ اجرای کارها و شروع روتین‌ها فقط در همین هفته است.
  - پیش‌نویس به کاربر می‌گوید چرا یک هفته است و اینکه هفتهٔ بعد با توجه به عملکرد این هفته ساخته می‌شود.
- **ادامهٔ هفتگی** ساخته می‌شود، در مرحله‌ای جدا و بعد از مرحلهٔ کیفیت.
- **تاریخ‌ها:**
  - تاریخ اجرا همیشه گذاشته می‌شود.
  - تاریخ هدفی که از واقعیت عمومی می‌آید به‌صورت «تخمینی» گذاشته می‌شود.
  - مهلت فقط وقتی گذاشته می‌شود که کاربر گفته یا واقعیت ثابتی آن را تعیین کند.
- **ساختار:**
  - هدف و پروژه فقط وقتی واقعاً لازم است ساخته می‌شود.
  - هدف یا پروژهٔ خالی ممنوع است.
  - کار بی‌تاریخ برای رد شدن از قانون زیر پروژه نمی‌رود.
  - ساختار را سیستم تعیین می‌کند، نه کاربر.
- **تقویم:** تاریخ شمسی و روزهای هفته را محصول به مدل می‌دهد و خودش نمایش می‌دهد.
- **سؤال‌ها:**
  - فقط دربارهٔ خود کاربر پرسیده می‌شود.
  - نوع ساختار، واقعیت عمومی و چیزی که کاربر قبلاً گفته پرسیده نمی‌شود.
  - حداکثر سه مرحله، هر مرحله حداکثر چهار سؤال. مرحلهٔ بعدی فقط وقتی پرسیده می‌شود که جواب قبلی سؤال تازه‌ای باز کرده باشد.
  - هر سؤال حداکثر سه پاسخ دارد: دو گزینهٔ مدل و «خودت بنویس» که محصول اضافه می‌کند.
  - اگر مدل گزینه نداد، کادر نوشتن از اول باز است.
- **بدون خطای ساختاری:**
  - اگر موردی خطا داشت، یک بار دوباره تولید می‌شود.
  - اگر باز هم خطا داشت، آن مورد با یک یادداشت آشکار حذف می‌شود.
  - کاربر هیچ‌وقت خطای ساختاری مدل را نمی‌بیند.
- **توالی:**
  - مدل وقتی یک قدم به نتیجهٔ قدم دیگر نیاز دارد توالی پیشنهاد می‌دهد.
  - کاربر می‌تواند روی هر کار «بعد از…» را انتخاب کند و ترتیب را جابه‌جا یا حذف کند.
- **معیار پذیرش:** حداقل ۳۰ هدف آزمایشی، با حدنصاب‌های بخش ۱۰.

**تصمیم‌های مالک دربارهٔ پنج پرسش باز (۲۰۲۶-۱۰-۱۵):**
1. روتین بعد از هفتهٔ اول ادامه پیدا می‌کند.
2. سؤال‌ها: حداکثر سه مرحله، هر کدام حداکثر چهار سؤال، هر کدام دو گزینه به‌علاوهٔ «خودت بنویس». بدون گزینه، کادر نوشتن باز است.
3. مدل هر وقت قدمی به نتیجهٔ قدم قبل نیاز دارد توالی پیشنهاد می‌دهد.
4. برنامهٔ هفتهٔ بعد با لمس کاربر ساخته می‌شود.
5. انتظار ۲۰ تا ۸۰ ثانیه پذیرفتنی است، ولی تنظیم مدل بعد از سنجش دوباره انتخاب می‌شود.
