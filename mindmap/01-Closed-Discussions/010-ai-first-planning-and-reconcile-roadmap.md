# Discussion 010 — Final AI-Native Direction and Product Sequencing Resolution

## Status

Accepted and closed.

This final resolution reconciles the original Discussion 010 proposal with the decisions accepted in Discussions 011–021. It owns the strategic change of direction, while the later discussions own the detailed product, safety, data, API, runtime, and validation contracts.

---

## 1. Decision

Adaptive Planner will be an AI-native adaptive planning product, not a manual Todo application whose primary differentiation appears only after a plan fails.

The accepted MVP loop is:

```txt
Goal or intention
→ AI-assisted clarification and planning
→ user-reviewed plan proposal
→ explicit confirmation
→ Today execution
→ deterministic recovery and AI-assisted Reconcile
→ user-approved adaptation
```

The first value moment is:

> The user explains what they want, and the product helps turn it into a credible, usable plan without taking control away from them.

Planning is the first value engine because useful execution and recovery data cannot exist until the product helps create a plan worth attempting.

Reconcile remains inside the MVP. It is the adaptation engine that becomes relevant after execution evidence exists. “Planning before Reconcile” describes product sequencing and dependency; it does not defer AI-assisted Reconcile to a separate product phase.

---

## 2. Why the Previous MVP Direction Was Reopened

The previous Phase 1 flow assumed:

```txt
manual Task creation
→ execution or missed work
→ item-by-item Done / Carry / Drop recovery
```

This direction had two structural weaknesses:

1. It asked users who struggle with planning to construct the plan manually through forms.
2. It exposed the product's adaptive value mainly after enough work had already failed or accumulated.

At small scale, item-level recovery can help. At larger scale, reviewing every overdue item can become another backlog and recreate the decision fatigue the product is intended to reduce.

The accepted response is not to remove Reconcile. It is to place it inside a larger loop:

```txt
create a credible plan
→ observe real execution
→ detect meaningful drift
→ compress the recovery decision space
→ let the user authorize adaptation
```

---

## 3. Accepted Research Conclusion

The following conclusions from the original discussion remain valid:

- Unfinished work and overloaded overdue lists are legitimate user problems.
- Making a concrete plan for unfinished work can reduce cognitive interference.
- Rollover, rescheduling, archive/reset, and recurring-work handling already have direct product precedents.
- Item-level Replan and AI-assisted backlog manipulation are not, by themselves, unique product mechanisms.
- A missed Routine occurrence is not equivalent to an overdue standalone Task and must not accumulate through Carry as routine debt.
- Public evidence does not prove that the original `Done / Carry / Drop` flow improves retention or performs better than rollover, archive, reset, or automatic rescheduling.
- Untraceable social-media quotes and unsupported physiological or psychological claims are not accepted evidence.

Key research retained from the original discussion:

- Masicampo, E. J., & Baumeister, R. F. (2011), *Consider it done! Plan making can eliminate the cognitive effects of unfulfilled goals* — https://doi.org/10.1037/a0024192
- Dai, H., Milkman, K. L., & Riis, J. (2014), *The Fresh Start Effect: Temporal Landmarks Motivate Aspirational Behavior* — https://pmc.ncbi.nlm.nih.gov/articles/PMC4839284/
- Structured Replan product precedent — https://help.structured.app/en/articles/1990594
- Sunsama rollover and recurring-task precedents — https://help.sunsama.com/docs/getting-started/basics/task-rollover-and-recurring-tasks-the-basics/

These sources support the problem and nearby mechanisms. They do not prove the MVP's retention or causal impact. Validation claims remain governed by Discussion 021.

---

## 4. Accepted AI Role

The governing principle is:

```txt
AI reduces the decision space.
The user owns consequential decisions.
```

### Planning

AI may:

- clarify intent and relevant constraints,
- expose assumptions and uncertainty,
- propose a bounded structured plan,
- propose Goals, Projects, Tasks, and Routines when justified,
- prepare a short-horizon execution window,
- explain the proposal in user-understandable language.

Planning details are owned by:

- [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]]
- [[01-Closed-Discussions/014-ai-planning-output-contract]]
- [[01-Closed-Discussions/014a-temporal-checkpoint-planning-draft-amendment]]

### Reconcile

Deterministic rules establish eligibility, safety, protected state, current facts, and allowed actions. AI may then organize evidence, group related work, summarize, explain, and recommend a smaller set of review decisions.

AI-assisted Reconcile details are owned by:

- [[01-Closed-Discussions/016-reconcile-trigger-and-severity]]
- [[01-Closed-Discussions/016a-review-checkpoint-trigger-and-presentation-amendment]]
- [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]]
- [[01-Closed-Discussions/017a-temporal-checkpoint-mind-map-impact-consolidation]]

### Authority boundary

AI must not treat generated text as permission. Canonical changes require a specific current preview, explicit user confirmation, commit-time revalidation, deterministic mutation, and auditable history.

AI must not silently:

- delete or Drop important work,
- abandon or mark a Goal achieved,
- rewrite history,
- perform broad autonomous rescheduling,
- infer sensitive personal causes or psychological states,
- continue normal planning in a detected crisis or prohibited high-risk situation.

The final authority, reversibility, privacy, hostile-input, and safety rules are owned by Discussion 018 and its accepted resolutions.

---

## 5. Product Model Consequences

Discussion 010 established the need for Tasks and Routines but did not define the final canonical model. The accepted model is now owned by Discussion 012 and its amendments.

The current conceptual entities are:

```txt
Goal
Project
Task
Routine
RoutineOccurrence
```

`Plan` is a proposal/draft concept rather than an additional canonical planning entity unless a later accepted contract explicitly states otherwise.

Important consequences:

- Tasks and Routines are not the only possible Planning output; Goal and Project structure may be proposed when justified.
- AI must not create artificial hierarchy merely for visual neatness.
- Detailed execution placement is bounded to a short horizon, while Goals, Projects, Routines, and review checkpoints may extend beyond that horizon.
- Routine occurrences represent scheduled execution opportunities; missed past occurrences do not accumulate through Carry.
- Execution facts do not prove Goal achievement. The user confirms real-world outcomes.

Canonical definitions and invariants are owned by:

- [[01-Closed-Discussions/012-core-product-model]]
- [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]
- [[01-Closed-Discussions/015-task-and-routine-execution-model]]
- [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]
- [[01-Closed-Discussions/015b-routine-local-date-and-daily-occurrence-amendment]]
- [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]]

---

## 6. MVP Scope Consequences

The accepted AI-native MVP must test a coherent vertical slice rather than isolated AI generation.

It includes:

- bounded AI Planning from intention to reviewable draft,
- manual fallback and explicit non-AI paths where required,
- user confirmation before canonical persistence,
- Today execution for Tasks and RoutineOccurrences,
- deterministic Reconcile eligibility and recovery,
- AI-assisted Reconcile where accepted evidence and rule gates allow it,
- user-approved adaptation,
- safety fallback, privacy controls, observability, and validation gates.

It excludes unrestricted life coaching, autonomous background mutation, detailed long-term task-list generation, unsupported diagnosis or achievement inference, and unguarded high-risk-domain planning.

The exact domain boundary, fallback behavior, output limits, action permissions, runtime behavior, and pilot gates are not redefined here. They are owned by Discussions 013–021.

---

## 7. Decisions From the Original 010 That Are Superseded

The following original proposals are not current decisions:

- Deferring AI-assisted Reconcile to Phase 2.
- Treating Reconcile as only a future extension rather than part of the AI-native MVP loop.
- Restricting AI output to Tasks and Routines only.
- The provisional `zero to three Tasks` and `zero to two Routines` limits.
- Treating the seven-day horizon as the lifetime of the plan rather than the detailed execution horizon.
- The original limited recurrence list as the final scheduling contract.
- The simple standalone `complete / move / drop` recovery model as the complete Reconcile contract.
- The suggested event list in 010 as an accepted taxonomy.
- The suggested activation metrics in 010 as the final validation model.
- The proposed mind-map edits in 010 as sufficient migration work.
- The original eight-step implementation sequence.

Their replacements are defined in Discussions 012–022.

---

## 8. Relationship to Legacy Phase 1 Documents

Discussion 010 intentionally reopened the legacy non-AI MVP direction. Its acceptance means legacy product-model, onboarding, Reconcile, API, event, validation, and implementation documents cannot remain authoritative where they conflict with the AI-native decisions.

Legacy technical decisions that remain compatible are consolidated in:

- [[01-Closed-Discussions/001-008-legacy-surviving-decisions]]

Discussion 022 owns the final source-of-truth reconciliation, formal-document migration, mind-map update, and implementation sequence. Until that migration is complete, a legacy document must not override an accepted decision from Discussions 012–021.

---

## 9. Mind Map Impact

The mind map must represent the complete AI-native loop rather than a recovery-first Todo flow.

Required high-level changes:

- Product Vision: intention to executable plan to evidence-based adaptation.
- MVP Core Loop: Planning, execution, Reconcile, and confirmed adaptation.
- Primary Flow: conversational Planning and structured draft review.
- Execution Flow: Today with Tasks and RoutineOccurrences.
- Recovery Flow: deterministic eligibility plus bounded AI assistance.
- AI Responsibilities: proposal, organization, explanation, and recommendation.
- Authority Boundary: explicit confirmation and deterministic commit.
- Guardrails: prohibited inference, high-risk handling, privacy, reversibility, and fallback.
- Evidence and Metrics: proposal quality, user decisions, execution outcomes, safety, and return behavior without unsupported causal claims.

The actual map migration remains part of Discussion 022 and should use the accepted detailed decisions rather than copy the preliminary map text from the original 010.

---

## 10. Final Resolution

Discussion 010 is closed with the following outcome:

```txt
The empty-planner problem is accepted as the first value problem.
AI-assisted Planning is accepted as the first value engine.
Today execution supplies real behavioral evidence.
Deterministic and AI-assisted Reconcile remain inside the MVP as the adaptation engine.
AI proposes and compresses decisions; the user authorizes consequences.
Detailed contracts are delegated to Discussions 012–021.
Mind-map and implementation migration are delegated to Discussion 022.
```

---

# خلاصهٔ فارسی

بحث ۰۱۰ به‌صورت نهایی بسته شد. تصمیم اصلی آن این است که Adaptive Planner نباید یک Todo دستی باشد که ارزش متفاوتش فقط بعد از شکست برنامه دیده شود. اولین ارزش محصول باید تبدیل هدف یا نیت مبهم کاربر به یک برنامهٔ قابل‌اجرا با کمک AI باشد.

بااین‌حال، AI Reconcile به فاز بعدی منتقل نشده است. حلقهٔ MVP شامل Planning، اجرای Today، Reconcile قطعی و هوشمند، و تطبیق برنامه با تأیید کاربر است. Planning از نظر ترتیب و وابستگی زودتر می‌آید، اما Reconcile همچنان بخشی از همان MVP محسوب می‌شود.

موارد قدیمی مانند خروجی صرفاً Task/Routine، محدودیت پیشنهادی ۳ Task و ۲ Routine، eventهای پیشنهادی اولیه، recovery سادهٔ Done/Carry/Drop و توالی اجرایی قدیمی دیگر معتبر نیستند. تعریف نهایی مدل محصول، Planning، اجرا، Reconcile، guardrailها، داده، API و validation در بحث‌های ۰۱۲ تا ۰۲۱ قرار دارد و بحث ۰۲۲ مسئول انتقال آن‌ها به mind map و برنامهٔ اجراست.

قاعدهٔ نهایی این بحث چنین است:

```txt
AI پیشنهاد می‌دهد و فضای تصمیم را کوچک می‌کند؛
کاربر پیامدها را تأیید می‌کند؛
سیستم وضعیت فعلی را دوباره بررسی و تغییر قطعی و قابل‌ردگیری را اعمال می‌کند.
```
