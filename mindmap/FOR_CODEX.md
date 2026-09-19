# For Codex

This file is a handoff queue for accepted product decisions that must later be reflected in the Adaptive Planner mind map and formal documentation.

## How Codex should use this file

When asked to update the repository from this file:

1. Treat the decisions below as **accepted product decisions**, not suggestions.
2. Inspect the current mind map and formal product documents only at execution time.
3. Update all affected sections consistently and remove obsolete concepts where these decisions replace earlier ones.
4. Do not redesign unrelated parts of the product.
5. Preserve previously accepted decisions unless they directly conflict with a newer decision written here.
6. If a conflict is found, prefer the newer decision in this file and report the conflict explicitly.
7. After applying the changes, report:
   - files/sections changed,
   - obsolete concepts removed,
   - unresolved contradictions,
   - any decisions that could not be represented cleanly.

---

# Pending accepted decisions

## 1. Remove dedicated Crisis Safety UX from product scope

Update the product model and UX documentation so that the MVP does **not** include a dedicated Crisis Safety page, crisis fallback flow, crisis-specific emergency-resource screen, or crisis-specific release gate.

Rationale:
- Adaptive Planner is not a mental-health product.
- The AI layer will use an external model provider such as GPT API.
- We do not want to build an independent crisis-detection and crisis-response UX system for the MVP.

Important nuance:
- Do **not** document this as "AI safety is fully solved by the model provider".
- AI safety, moderation, and provider safeguards remain an architectural/guardrail concern and should be handled later under **AI Architecture / AI Guardrails**, not as a primary product UX flow.

Remove or revise any earlier documentation that treats Crisis Safety Readiness as a hard product release gate for the MVP.

---

## 2. Redefine Work Hub as an independent big-picture view

Work Hub must remain a distinct destination and must **not** be treated as a wrapper around Goal / Project / Task / Routine list pages.

Its purpose is:

> Give the user a structural and temporal big-picture view of their work system.

Expected concept:
- Show Goals, Projects, Tasks, and Routines together.
- Show their relationships, e.g. Goal → Project → Task / Routine.
- Place them inside a temporal context such as a timeline or date-range canvas.
- Entity cards should remain recognizable as Goal / Project / Task / Routine cards.
- Cards may expose a "View details" action that navigates to the corresponding detail page.
- Expand/collapse may be used where useful.

Important UX rule:
- Work Hub must **not** become a flowchart or graph editor.
- Visual hierarchy should favor:

  `Timeline / temporal context → entity cards → relationships`

  rather than:

  `connection lines / graph → everything else`

The purpose of Work Hub is to answer:

> "How is all of my work connected, and how is it distributed across time?"

---

## 3. Keep entity list pages independent

Goal List, Project List, Task List, and Routine List remain independent pages/destinations.

They are not views inside Work Hub.

Their purpose is different from Work Hub:
- Work Hub = cross-entity structural + temporal big picture.
- Goal List = inspect/search/filter/manage goals.
- Project List = inspect/search/filter/manage projects.
- Task List = inspect/search/filter/manage tasks.
- Routine List = inspect/search/filter/manage routines.

Each entity also keeps its own independent detail page:
- Goal Detail
- Project Detail
- Task Detail
- Routine Detail

---

## 4. Separate First Entry from Quick Create

These are two different product concepts and must not be modeled as one page.

### First Entry / Initial Setup

First Entry is a **first-use onboarding flow**.

Expected high-level flow:

`Login → OTP Verification → First Entry / Initial Setup → Today`

It is shown only when appropriate for the user's first entry/setup state and is not a permanent application destination.

### Quick Create

Quick Create is a **persistent global action** available from the application shell during normal use.

Expected interaction:
- A floating/global quick-action button is available in the app shell.
- Activating it opens a bottom sheet or equivalent lightweight action surface.
- The user chooses one of:
  - Create Task
  - Create Goal
  - Create Project
  - Create Routine

Do not model Quick Create as the First Entry page.

---

## 5. Do not create one conditional General Form for all entities

Do not design one large shared form whose fields dynamically change for Task / Goal / Project / Routine.

Instead use:

`Quick Create → choose entity type → open entity-specific create form`

The four creation flows are:
- Create Task
- Create Goal
- Create Project
- Create Routine

Shared UI components and form controls may be reused internally, but each entity may have its own UX structure and fields.

---

## 6. Correct Routine lifecycle terminology

Do not introduce a `PAUSED` Routine state.

Accepted Routine lifecycle remains:

`ACTIVE → STOPPED`

This transition is one-way for the existing Routine entity.

If the user wants to continue/resume a stopped Routine, the system creates a **new Routine** linked to the previous one using `continuationOfRoutineId`.

Therefore:
- Remove any "Pause Routine" concept.
- Do not model "Resume" as reactivating the same Routine.
- Preferred conceptual wording is `Continue Routine`, where continuation creates a new Routine entity.

---

## 7. Keep Goal Continuation Check as a distinct flow

Goal Continuation Check must remain explicitly represented as a separate accepted flow, even if it can be triggered from Reconcile.

It must not disappear as an implicit sub-state of a generic Reconcile session.

Accepted choices remain:
- `CONTINUE`
- `REVIEW_LATER`
- `ABANDON_GOAL`

Represent its trigger and relationship to Reconcile clearly while keeping it conceptually distinct.

---

## 8. Update the IA direction

The current IA direction should reflect the following structure:

```text
AUTH
├ Login
└ OTP Verification

FIRST USE
└ Initial Entry / Setup

CORE

Today

Work Hub
└ Big-picture temporal relationship view

Goals
├ Goal List
└ Goal Detail

Projects
├ Project List
└ Project Detail

Tasks
├ Task List
└ Task Detail

Routines
├ Routine List
└ Routine Detail

AI Planning
├ Chat
├ Drafts
├ Plan Review
└ Apply

Reconcile
├ Overview
├ Session
├ Bulk Review
└ Review & Apply

Profile

Settings
```

Global/contextual flows should include:

```text
Quick Create
├ Create Task
├ Create Goal
├ Create Project
└ Create Routine

Goal lifecycle
Project lifecycle
Task lifecycle

Routine lifecycle
├ Stop
└ Continue → creates new Routine with continuationOfRoutineId

Goal Continuation Check

AI unavailable / degraded
```

Do not add the removed dedicated Crisis Safety flow back into this IA.

---

## 9. Design-process documentation direction

If the repository documents the design process, update it to use this sequence:

1. **IA + Navigation Map** as one combined artifact.
2. **Screen + State + Flow Inventory** as the second artifact.
3. After those are stable, continue Figma design screen-by-screen.

The inventory should be capable of tracking at least:
- screen/flow name,
- important states,
- MVP status,
- criticality,
- designed/not-designed status.

For each major screen, design review should eventually consider:
1. Purpose
2. User questions answered
3. Information hierarchy
4. Primary actions
5. Secondary actions
6. Entry points
7. Exit points
8. States
9. Edge cases
10. Product rules
11. AI involvement
12. Navigation
13. UX risks
14. Required frames

Do not turn this into a heavyweight full-product specification before design. The goal is lightweight structural completeness, followed by rigorous screen-by-screen refinement.

---

# Status

These decisions are **pending repository consolidation**. Do not assume the existing mind map or formal documents already reflect them until Codex has explicitly applied this file.