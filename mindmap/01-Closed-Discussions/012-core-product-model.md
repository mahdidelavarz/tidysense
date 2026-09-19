# Discussion 012 — Core Product Model

## Status

Accepted and closed after GPT × Claude review.

Required companion amendment:

- [[01-Closed-Discussions/012a-temporal-checkpoint-amendment]]

This document owns the base entity, ownership, relationship, lifecycle, and outcome model. Discussion 012A adds the accepted temporal-visibility invariant and checkpoint rules. They form one decision family and must be read together. Where temporal wording differs, Discussion 012A is authoritative.

Claude reviewed the proposed core model and confirmed that no blocking contradiction remains. Mahdi is the final decision-maker and has accepted the model below.

Related discussions:

- [[01-Closed-Discussions/010-ai-first-planning-and-reconcile-roadmap]]
- [[01-Closed-Discussions/011-ai-native-mvp-scope-and-mindmap-update]]

---

## 1. Scope

This discussion defines only the canonical product concepts, their boundaries, allowed relationships, and high-level lifecycle meanings.

It answers:

```txt
What nouns exist in the product?
What does each noun mean?
How may those nouns relate to each other?
What does completion mean at each level?
```

It does not define persistence, database fields, APIs, scheduling mechanics, AI prompts, Reconcile behavior, analytics, transactions, or implementation sequencing.

### Included now

- canonical concepts
- conceptual ownership rules
- high-level lifecycle meanings
- distinction between execution and real-world outcome

### Explicitly excluded

- Task dependency graph
- generic persisted Task order
- persisted Plan entity
- automatic Goal-achievement inference

### Deferred

- AI conversation and draft contract — Discussions 013–014
- execution, Today, scheduling, and occurrence mechanics — Discussion 015
- Reconcile — Discussions 016–017
- safety and failure policy — Discussion 018
- persistence and events — Discussion 019
- runtime architecture — Discussion 020
- validation — Discussion 021
- implementation sequence — Discussion 022

---

## 2. Accepted Core Concepts

The initial product model contains five first-class concepts:

```txt
Goal
Project
Task
Routine
RoutineOccurrence
```

The model supports structured and standalone work:

```txt
Goal
├── zero or more Projects
│   ├── zero or more Tasks
│   └── zero or more Routines
├── zero or more direct Tasks
└── zero or more direct Routines

Standalone:
- Project
- Task
- Routine
```

No persisted `Plan` entity exists. The word “plan” may appear in the UX and AI may produce an ephemeral proposal, but approved content is persisted as Goal, Project, Task, and Routine entities.

---

## 3. Goal

### Definition

A Goal represents a desired outcome, direction, or state that matters to the user.

Examples:

- Reach English level B2
- Find a frontend job
- Improve physical fitness
- Launch a sustainable personal product

A Goal is not a finite batch of work, a Task list, a recurring behavior, an automatically calculated percentage, or proof that an outcome occurred.

### Ownership

A Goal may own:

- zero or more Projects
- zero or more direct Tasks
- zero or more direct Routines

Direct ownership is valid when the work supports the Goal but does not justify a separate Project.

### Outcome boundary

The system observes execution but cannot prove the real-world outcome:

```txt
Tasks completed
+ Routines followed
+ Projects completed
≠ Goal automatically achieved
```

Core principle:

> The system tracks execution. The user confirms real-world outcome.

The system may report truthful activity facts, but it must not convert them into unsupported universal Goal-progress or achievement claims.

### High-level lifecycle

```txt
ACTIVE → ACHIEVED | ABANDONED
```

- `ACHIEVED`: the user confirms the desired outcome was reached.
- `ABANDONED`: the user no longer intends to pursue it.

---

## 4. Project

### Definition

A Project represents a finite or independently manageable effort.

Examples:

- Build a portfolio
- Prepare for interviews
- Complete English File Upper-Intermediate
- Move to a new apartment

A Project should not exist merely as an artificial wrapper around one direct Task or Routine.

### Ownership

A Project may:

- belong to one Goal
- exist standalone

A Project may contain multiple Tasks and Routines.

### Completion meaning

Project completion means the finite effort is considered complete. It does not prove that a parent Goal is achieved.

### Project-owned Routine rule

A Routine owned by a Project is specific to that Project and is not shared across Projects.

When the Project completes, its active Routines automatically stop:

```txt
Project ACTIVE → COMPLETED
→ active Project-owned Routines become STOPPED
```

No extra confirmation is required because the ownership relationship already defines this lifecycle behavior.

Goal-owned and standalone Routines are unaffected. Historical RoutineOccurrences remain unchanged.

### High-level lifecycle

```txt
ACTIVE → COMPLETED | STOPPED
```

- `COMPLETED`: the intended effort was finished.
- `STOPPED`: the effort ended without being considered complete.

---

## 5. Task

### Definition

A Task represents one actionable, non-recurring piece of work.

### Ownership

A Task may:

- belong directly to one Goal
- belong to one Project
- exist standalone

A Task may not belong to both a Goal and a Project simultaneously. If it belongs to a Project, Goal context is inherited conceptually through that Project.

### Carry principle

Carry is an action or transition, not a Task status:

```txt
Task remains active
→ planned placement changes
```

Scheduling and history mechanics are deferred.

### High-level lifecycle

```txt
ACTIVE → COMPLETED | DROPPED
```

### Explicit exclusions

The canonical Task model does not include:

- Task-to-Task dependencies
- a generic persisted `order` field

Suggested ordering may exist temporarily in an AI draft, but it is not a canonical Task property.

---

## 6. Routine

### Definition

A Routine represents a recurring behavior definition. It is not a duplicated Task.

### Ownership

A Routine may:

- belong directly to one Goal
- belong to one Project
- exist standalone

A Routine may not belong to a Goal and Project simultaneously, multiple Goals, or multiple Projects.

### Ownership meaning

- Goal-owned Routine: supports the broader Goal and may remain relevant across Projects.
- Project-owned Routine: specific to the Project and follows its lifecycle.
- Standalone Routine: has no Goal or Project owner.

### High-level lifecycle

```txt
ACTIVE → STOPPED
```

Pause and resume are not decided here.

---

## 7. RoutineOccurrence

### Definition

A RoutineOccurrence represents one scheduled instance of a Routine on a specific date.

Every RoutineOccurrence belongs to exactly one Routine.

The technical name does not need to appear in the user interface.

### Core behavior

```txt
PENDING → DONE | MISSED
```

A past missed occurrence does not become accumulated debt through Carry.

Occurrence creation, storage, derivation, and scheduling are deferred to Discussions 015 and 019.

---

## 8. Accepted Relationships

```txt
Goal 1 ── 0..* Project
Goal 1 ── 0..* direct Task
Goal 1 ── 0..* direct Routine
Project 1 ── 0..* Task
Project 1 ── 0..* Routine
Routine 1 ── 0..* RoutineOccurrence
```

Optional ownership:

```txt
Project may exist without Goal.
Task may exist without Goal or Project.
Routine may exist without Goal or Project.
```

Exclusive-parent invariant:

```txt
Task belongs to at most one of: Goal, Project.
Routine belongs to at most one of: Goal, Project.
```

Forbidden relationships:

```txt
Task → Goal and Project simultaneously
Routine → Goal and Project simultaneously
Task → multiple Goals or Projects
Routine → multiple Goals or Projects
Task → Task dependency
```

---

## 9. Scenario Checks

### Reach English B2

- Goal: Reach English B2
- direct Task: Take a placement test
- direct Routine: Practice English daily
- Project: Complete an upper-intermediate course

No artificial Project is required for the direct Task or Routine.

### Find a frontend job

- Goal: Find a frontend job
- Project: Build portfolio
- Project: Prepare for interviews
- direct Routine: Review job listings on weekdays

Completing the Projects does not automatically prove the user found a job.

### Move to a new apartment

A standalone Project is sufficient. No fake Goal is required.

### Project-specific feedback review

A Routine such as “Review onboarding feedback every weekday” may belong to the onboarding Project and stops when that Project completes.

### Buy groceries

A standalone Task is valid. The model does not manufacture a hierarchy merely to look sophisticated.

---

## 10. Final Accepted Decisions

- The canonical concepts are Goal, Project, Task, Routine, and RoutineOccurrence.
- No persisted Plan entity exists.
- Project may belong to one Goal or be standalone.
- Task may belong to one Goal, one Project, or neither.
- Routine may belong to one Goal, one Project, or neither.
- Task and Routine use an exclusive-parent rule and cannot belong to Goal and Project simultaneously.
- Project-owned Routines automatically stop when the Project completes.
- Historical RoutineOccurrences remain historical facts.
- Activity completion does not prove Goal achievement.
- The system tracks execution; the user confirms outcome.
- The MVP has no Task dependency graph.
- The MVP has no generic persisted Task order field.

---

## 11. Review Resolution

Claude reviewed the model and confirmed that the five concepts are distinct, the ownership rules are coherent, standalone work is representable, and the absence of a persisted Plan does not create a conceptual gap.

Claude noted the edge case where a Project-owned Routine might remain useful after the Project ends. This is already represented coherently by making such a Routine Goal-owned or standalone when its meaning extends beyond the Project. No change to the accepted lifecycle rule is required.

No blocking or important unresolved issue remains.

---

## 12. Mind Map Impact

Record for consolidation after Discussion 021. Do not apply yet.

### Product model

Add or revise:

```txt
Goal
├── Project
├── direct Task
└── direct Routine

Project
├── Task
└── Project-specific Routine

Routine
└── RoutineOccurrence

Standalone
├── Project
├── Task
└── Routine
```

### Core invariants

Add:

- Task/Routine exclusive parent: Goal, Project, or neither
- Project completion stops active Project-owned Routines
- execution facts do not equal Goal outcome
- user confirms Goal achievement
- Plan is an ephemeral proposal, not a persisted entity
- no Task dependency graph in the MVP
- no generic canonical Task order

### Open questions to remove or narrow

Remove or resolve questions about:

- whether every Task requires a Project
- whether every Project requires a Goal
- whether Routine is merely a recurring Task
- whether Plan is a persisted entity
- whether activity completion proves Goal achievement

---

## 13. Affected Formal Documents

Record for consolidation after Discussion 021. Do not update yet.

Accepted decisions from this discussion must later update or create:

- canonical product model specification
- entity definition and lifecycle document
- ownership and relationship invariant specification
- AI draft specification dependency in Discussion 014
- execution and occurrence specification dependency in Discussion 015
- database constraint specification in Discussion 019
- API and runtime model references in Discussion 020
- implementation plan in Discussion 022

Potential ADRs:

- core entity model and absence of persisted Plan
- exclusive Task/Routine ownership model
- Project-owned Routine lifecycle rule

No Mind Map or formal document is modified by closing this discussion alone.

---

# خلاصهٔ فارسی

بحث ۰۱۲ مدل مفهومی اصلی محصول را تثبیت می‌کند. موجودیت‌های canonical شامل `Goal`، `Project`، `Task`، `Routine` و `RoutineOccurrence` هستند؛ `Plan` یک پیشنهاد موقت است و موجودیت canonical جداگانه‌ای محسوب نمی‌شود.

Task و Routine می‌توانند به یک Goal، یک Project یا هیچ‌کدام تعلق داشته باشند، اما هم‌زمان دو parent ندارند. Project یک تلاش محدود و قابل‌مدیریت است؛ Goal نتیجهٔ مطلوب را نمایش می‌دهد و انجام فعالیت‌ها به‌تنهایی اثبات‌کنندهٔ دستیابی به Goal نیست. تأیید نتیجهٔ واقعی با کاربر است.

Task برای کار یک‌باره و Routine برای رفتار تکرارشونده است. اجرای Routine از طریق `RoutineOccurrence` ثبت می‌شود و occurrenceهای تاریخی واقعیت‌های مستقل باقی می‌مانند. پایان Project روی Routineهای متعلق به آن اثر دارد، اما تغییر وضعیت childها نباید خودکار نتیجهٔ Goal را تعیین کند. قواعد زمانی این مدل در ۰۱۲A تکمیل شده‌اند.
