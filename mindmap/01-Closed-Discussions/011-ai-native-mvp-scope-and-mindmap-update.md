# Discussion 011 — Final AI-Native MVP Scope and Authoritative Review Index

## Status

Accepted and closed.

Discussion 011 is closed as the scope umbrella and authoritative navigation index for the AI-native MVP decision chain. Discussions 012–021 produced accepted decisions or final resolution files. Discussion 022 was the implementation, formal-document, and Mind Map migration handoff and has since completed that work and closed.

This file does not restate every detailed decision. It identifies the accepted product direction, the authoritative source for each decision family, precedence rules, and the work that was handed to Discussion 022.

---

## 1. Accepted Product Direction

Adaptive Planner's MVP is an AI-native vertical slice covering the complete loop:

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

The strategic origin of this direction is closed in:

- [[01-Closed-Discussions/010-ai-first-planning-and-reconcile-roadmap]]

The MVP must test the coherent loop. It must not become either:

- a manual Todo product with AI added only after failure, or
- an unrestricted AI coach that generates advice without canonical execution, safety boundaries, or user-controlled consequences.

---

## 2. Governing Product Principles

The accepted discussion chain establishes these cross-cutting principles:

1. **Planning creates first value.** The product helps turn unclear intention into a credible, reviewable plan.
2. **Execution creates evidence.** Today records what actually happens through canonical Tasks and RoutineOccurrences.
3. **Reconcile adapts the plan.** Deterministic rules establish facts and eligibility before AI organizes or explains them.
4. **AI proposes; the user authorizes.** Generated text is never permission for canonical mutation.
5. **Current state controls commits.** Confirmed commands are revalidated against canonical state immediately before deterministic mutation.
6. **History is preserved.** Corrections, restore paths, and adaptation must not rewrite historical facts.
7. **Safety can stop generation.** Crisis, prohibited-domain, privacy, and hostile-input rules can force a safety or manual fallback.
8. **Claims remain evidence-bounded.** Execution activity does not prove Goal achievement, psychological cause, or product causality.
9. **Validation gates the pilot.** Safety, technical reliability, and minimum product evidence are release requirements rather than optional analytics.

---

## 3. Authoritative Decision Index

The table below replaces the original “start with Discussion 012 and review in order” workflow. The review has occurred. These are now the authoritative records to use.

| Decision family | Authoritative records | What they own |
|---|---|---|
| Strategic direction | [[01-Closed-Discussions/010-ai-first-planning-and-reconcile-roadmap]] | first-value problem, AI-native sequencing, Planning/Reconcile relationship |
| Core product model | [[01-Closed-Discussions/012-core-product-model]]; [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]] | Goal, Project, Task, Routine, RoutineOccurrence, lifecycle, ownership, temporal checkpoints |
| Planning entry and conversation | [[01-Closed-Discussions/013-ai-planning-entry-and-conversation-flow]] | entry states, clarification, domain boundary, fallback, abandonment and safety exits |
| Planning output | [[01-Closed-Discussions/014-ai-planning-output-contract]]; [[01-Closed-Discussions/014a-temporal-checkpoint-planning-draft-amendment]] | structured draft, hierarchy, limits, temporal fields, review and confirmation |
| Execution | [[01-Closed-Discussions/015-task-and-routine-execution-model]]; [[01-Closed-Discussions/015a-temporal-checkpoint-execution-amendment]]; [[01-Closed-Discussions/015b-routine-local-date-and-daily-occurrence-amendment]] | Today, Task placement, recurrence, RoutineOccurrence identity, local-date behavior |
| Reconcile trigger and presentation | [[01-Closed-Discussions/016-reconcile-trigger-and-severity]]; [[01-Closed-Discussions/016a-review-checkpoint-trigger-and-presentation-amendment]] | eligibility, severity, suppression, checkpoints, trigger and presentation rules |
| Reconcile intelligence | [[01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions]] | deterministic facts and metrics, allowed AI explanation, rule-gated recommendations and actions |
| Temporal Mind Map impact | [[01-Closed-Discussions/017a-temporal-checkpoint-mind-map-impact-consolidation]] | consolidated map impact from the temporal-checkpoint amendment chain |
| Action authority and reversibility | [[01-Closed-Discussions/018-action-permissions-trust-and-reversibility]] | allowed, confirmation-required and forbidden actions; preview, restore and audit rules |
| Failure, privacy and hostile input | [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]] | failure states, data minimization, retention boundary, domains, crisis and hostile-input handling |
| Canonical data model | [[01-Closed-Discussions/019a-canonical-data-model-and-invariants]] | entities, relations, invariants, temporal and provenance fields |
| Transactions and idempotency | [[01-Closed-Discussions/019b-transactions-concurrency-and-idempotency]] | transaction boundaries, optimistic concurrency, idempotency and command safety |
| Events and observability | [[01-Closed-Discussions/019c-events-ai-observability-and-retention]] | semantic events, AI traces, suggestion history, retention and derived analytics |
| AI runtime | [[01-Closed-Discussions/020a-ai-runtime-boundaries-and-orchestration]] | orchestration, provider boundary, tools, context, failure and runtime separation |
| API and frontend state | [[01-Closed-Discussions/020b-api-and-frontend-state-contracts]] | attempts, drafts, confirmation, commands, polling, errors and frontend state machines |
| Structured-output reliability and cost | [[01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls]] | schemas, validation, repair, retry, budgets, model routing and cost controls |
| Validation and decision gates | [[01-Closed-Discussions/021-validation-plan-and-decision-gates]] | hypotheses, denominators, thresholds, safety gates, pilot decisions and forbidden claims |
| Baseline migration and implementation | [[01-Closed-Discussions/022-updated-mvp-implementation-plan]] | legacy reconciliation, Mind Map migration, formal specs, milestones, ownership and pilot readiness |

---

## 4. Authority and Precedence Rules

### 4.1 Final resolution wins

When a family contains an initial discussion, amendments, Claude briefs, and a final resolution, the final resolution is authoritative. Accepted amendments remain authoritative where the final resolution includes or depends on them.

Examples:

- Discussion 017 is the authoritative final resolution; its superseded drafts were removed after consolidation.
- Discussions 018 and 018A own the final guardrail family; the superseded drafts and review brief were removed after consolidation.
- Discussions 019A, 019B, and 019C own the final data family; superseded split proposals were removed after consolidation.
- Discussions 020A, 020B, and 020C own the final runtime/API family; the split index and superseded proposals were removed after consolidation.
- Discussion 021 owns the final validation and decision-gate contract.

An `Open`, `Split`, or historical status on an earlier source file does not reopen a family that has an explicit accepted final resolution. It means that the earlier file must not be mistaken for the authority record.

### 4.2 Later decisions may refine, not silently contradict

A later discussion may add implementation detail inside an earlier accepted boundary. If it changes the boundary itself, it must explicitly identify the superseded decision and its replacement.

### 4.3 Canonical state outranks generated text

AI output, explanation text, draft snapshots, and client state never outrank current canonical state or accepted invariants.

### 4.4 Legacy documents do not win by age

Legacy ADRs and Phase 1 specs remain authoritative only for decisions explicitly retained during reconciliation. Absence from a newer discussion does not automatically preserve an old decision.

Surviving legacy decisions are consolidated in:

- [[01-Closed-Discussions/001-008-legacy-surviving-decisions]]

---

## 5. Status of the Review Chain

The product-decision review from 012 through 021 is substantively complete:

```txt
012–016 → accepted base discussions and required amendments
017 → closed by the final Discussion 017, with 017A as consolidated temporal Mind Map impact
018 → closed by final Discussions 018 and 018A
019 → closed by final 019A, 019B and 019C
020 → closed by final 020A, final 020B and accepted 020C
021 → closed by final 021 resolution
022 → closed after legacy reconciliation, Mind Map migration, formal-document reconciliation, verification, and implementation planning
```

All historical proposals, split hubs, and redundant closure files from Discussions 001–022 have been removed from `01-Open-Discussions`. The folder is currently empty.

Discussion 022 completed the handoff defined here: legacy reconciliation, the accepted decision inventory, final MVP baseline, Mind Map migration, formal-document reconciliation, verification, and implementation-planning authority are now complete. M1 execution remains subject to its named owner and configuration gates.

---

## 6. Formalization Rule

The accepted discussions did not silently rewrite the Mind Map, ADRs, or formal specs merely by existing.

Discussion 022 was required to:

1. use the completed [[01-Closed-Discussions/001-008-legacy-surviving-decisions|legacy reconciliation]],
2. use the completed [[02-Decisions/accepted-decision-inventory-001-021|decision inventory]] and [[04-Specs/ai-native-mvp-baseline|MVP baseline]],
3. migrate that baseline into the shared Mind Map,
4. update or supersede affected ADRs and specifications,
5. verify consistency between the map, final discussions, and formal documents,
6. derive the implementation sequence from that reconciled baseline,
7. preserve the validation and safety gates required for pilot readiness.

Discussion 022 has completed these formalization responsibilities. Current projections and implementation packages must still remain subordinate to the owning product decisions and their recorded gates.

---

## 7. Mind Map Impact

The final Mind Map must include, at minimum:

- AI-native Product Vision and complete MVP Core Loop,
- canonical Goal / Project / Task / Routine / RoutineOccurrence model,
- conversational Planning and structured draft review,
- Today execution and temporal checkpoint semantics,
- deterministic and AI-assisted Reconcile boundaries,
- action authority, confirmation, reversibility and history preservation,
- privacy, crisis, domain and hostile-input boundaries,
- canonical data, semantic events and AI observability,
- runtime/API reliability and frontend states,
- validation hypotheses, denominators, thresholds and release gates,
- explicit deferred and rejected scope.

This file records the required coverage. Discussion 022 owned the actual map edits and consistency verification, which are now complete.

---

## 8. What This Final Version Supersedes

This resolution supersedes the following parts of the original Discussion 011:

- `Open umbrella discussion` status,
- the instruction to begin with Discussion 012,
- the presentation of 012–022 as entirely unresolved work,
- the older loop that omitted Project, RoutineOccurrence, deterministic evidence gates, and commit-time authority,
- direct reliance on initial umbrella drafts when final resolution files now exist,
- the implication that 011 must stay open until the implementation work in 022 is finished.

Discussion 011 closes the scope and navigation layer. Discussion 022 subsequently completed the application and execution-planning handoff.

---

## 9. Final Resolution

```txt
The AI-native MVP direction is accepted.
The 012–021 product-decision chain is substantively closed.
Final resolutions and accepted amendments are authoritative over historical drafts.
Discussion 011 is the closed navigation index for those decisions.
Discussion 022 completed baseline reconciliation, Mind Map migration,
formal-document updates, verification, and implementation sequencing.
```

---

# خلاصهٔ فارسی

بحث ۰۱۱ به‌عنوان فهرست و چتر نهایی تصمیم‌های MVP مبتنی بر AI بسته شد. زنجیرهٔ تصمیم‌گیری ۰۱۲ تا ۰۲۱ از نظر محتوایی کامل شده و در مواردی که یک خانواده چند فایل دارد، فایل‌های `Final Resolution` و amendmentهای پذیرفته‌شده مرجع اصلی هستند؛ فایل‌های اولیه با وضعیت Open یا Split فقط سابقهٔ بررسی محسوب می‌شوند.

حلقهٔ نهایی محصول شامل تبدیل هدف یا نیت به پیشنهاد ساختاریافتهٔ Goal، Project، Task و Routine، تأیید کاربر، اجرای Today، تولید شواهد واقعی، Reconcile قطعی و محدودشده، کمک AI برای توضیح یا پیشنهاد، و اعمال تغییر پس از تأیید و بررسی مجدد وضعیت فعلی است.

بحث ۰۱۱ مسئول تعریف جهت و معرفی منابع معتبر است. بحث ۰۲۲ نیز handoff مربوط به پاک‌سازی تصمیم‌های قدیمی، انتقال تصمیم‌های نهایی به Mind Map و اسناد رسمی، بررسی سازگاری و ساخت برنامهٔ اجرایی را کامل کرده و بسته شده است.

بنابراین مسیر تصمیم‌گیری دیگر «از ۰۱۲ شروع کن» نیست؛ تصمیم‌ها گرفته و منتقل شده‌اند و مرحلهٔ فعلی، تأیید gateهای M1 و آغاز اجرای کنترل‌شده است.