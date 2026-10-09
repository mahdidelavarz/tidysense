# Pilot Research Protocol

How the five required metrics the product cannot compute are collected (Discussion 021 §§5–9; [`metric-dictionary.md`](metric-dictionary.md), "Required metrics the product does not compute"). Two parts: two short in-app questions, which are built, and three to five moderated sessions, which are not yet held.

**State:** proposed on 2026-10-09. The wording of the two questions and this session guide need the Pilot Research owner's approval before collection starts; approving them is part of locking the metric dictionary. Cohort, consent to take part in research, observation window and thresholds belong to the analysis plan (STEP-12) and are not set here.

## Part 1 — In-app questions (instrument version 1)

Both are optional, asked once, and never stand between the user and the next step. The scale is five buttons, 1 to 5, with the two ends labelled. Answers are stored as a number with the account, the question and its subject (`PilotFeedbackResponses`, R2: removed after 180 days and on erasure). No text is collected.

| Instrument | Shown | Question (Persian, as shown) | 1 | 5 |
|---|---|---|---|---|
| `H1_USEFULNESS` | under "برنامه ساخته شد.", right after a planning draft was applied | این برنامه چقدر برای شروع کار به دردتان می‌خورد؟ | اصلاً | خیلی زیاد |
| `H2_UNDERSTANDING` | under "این بازبینی بسته شد.", right after the user ended a Reconcile session | چقدر برایتان روشن بود که هر مورد چرا در این بازبینی آمده بود؟ | اصلاً روشن نبود | کاملاً روشن بود |

Above each: «یک پرسش اختیاری برای بهتر شدن تایدی‌سنس». After answering: «ممنون؛ پاسخ شما ثبت شد.»

What they measure and what they do not:

- `H1_USEFULNESS` is a self-report at the moment of applying. It says nothing about whether the plan was followed; that is `H1.REVERSAL_7D` and the moderated session.
- `H2_UNDERSTANDING` asks about the reasons items appeared, which is what the deterministic rules and, when present, the AI explanation are meant to make clear. The metric keeps sessions with and without a ready explanation apart.
- People who do not answer are reported as `NO_RESPONSE`; they are not assumed to resemble those who do.

Changing a question, its scale or where it is shown: change the wording in `frontend/src/features/pilot/types/pilot.format.ts`, raise `pilotInstrumentVersion` there and `PilotInstruments.Version` on the server together, and record it in the metric dictionary. Answers under the old version stay in their own version column.

## Part 2 — Moderated sessions

Three to five participants from the pilot cohort, one session each, about 40 minutes, after the participant has used the product for at least a week and has applied at least one plan and completed at least one Reconcile session. One moderator; notes on a fixed sheet; no recording unless the participant agrees in writing. The participant uses their own account on their own device and shares the screen or sits beside the moderator.

Before starting, the moderator reads the consent paragraph of the analysis plan aloud and notes the agreement. A participant may stop at any time.

### A. Trust boundary (`H1.TRUST_BOUNDARY_COMPREHENSION`)

Observation first, questions after. Comprehension is not established by answers alone (021 §9).

1. Ask the participant to plan something small they actually intend to do, thinking aloud. Do not explain the screen.
2. Observe and mark on the sheet, yes or no: read the draft before approving; changed or removed at least one item, or said why not; noticed the final review dialog before anything was created; could say where the created items are.
3. Then ask, in these words:
   - «وقتی پیش‌نویس را دیدید، فکر می‌کردید چیزی ساخته شده بود؟» (expected: no)
   - «اگر با پیشنهادی موافق نباشید چه می‌شود؟» (expected: it can be changed or left out; nothing happens by itself)
   - «چه کسی تصمیم نهایی را می‌گیرد؟» (expected: the user)
   - «نوشته شما کجا فرستاده شد؟» (expected: to the named AI service outside the country, with their permission)
4. Mark comprehension as shown only when the answers and the observed behavior agree. A correct answer after approving without reading is marked as not shown.

### B. Reversals and regret (`H1.REGRET_ATTRIBUTION`, `H2.REOPEN_OR_REGRET`)

Prepared before the session by the operator with the read-only role and recorded as a database access ([runbook 8](runbooks.md#8-direct-database-access)): for this participant, the items created by an applied plan and dropped, abandoned or stopped within seven days, and the Tasks changed by an applied Reconcile action that were changed again within seven days. Titles are read to the participant only; they are not written on the sheet.

For each item, ask «این را بعداً کنار گذاشتید (یا دوباره تغییر دادید). چه شد؟» and classify from the participant's own account, never from a guess:

- `REGRET_ASSOCIATED` — the participant says the plan or the action was wrong for them when it was made.
- `CONTEXT_CHANGED` — a deadline, priority, health, work or life circumstance changed afterwards (021 §8: this is not regret).
- `UNCLASSIFIED` — the participant does not remember or the account is unclear.

### C. Reconcile understanding (`H2.UNDERSTANDING_SCORE`)

1. Ask the participant to open Reconcile when something is waiting, thinking aloud.
2. For two items they act on, ask «چرا این مورد اینجا آمده؟». Mark whether the reason they give matches the reason shown.
3. If an AI explanation is offered and they open it, ask «این توضیح چه چیزی به شما گفت که خودتان نمی‌دانستید؟» and «اگر به پیشنهادش عمل کنید چه می‌شود؟» (expected: a preview first; nothing changes without confirmation).
4. Note the answer they gave to the in-app question for that session, if they answered, next to what was observed.

### Record

One sheet per participant, kept outside the database with the incident and access records, identified by a participant number, not a phone number: date, the yes/no observations of A, the four answers of A, the classification of each item of B, the matches of C, and anything the participant said about trust or surprise in their own words. The link between participant number and account is kept separately by the operator and destroyed when the analysis is signed.

Results enter the analysis package as counts over the sessions held (for example "comprehension shown: 3 of 4"). With three to five sessions they are qualitative evidence and are reported as such.
