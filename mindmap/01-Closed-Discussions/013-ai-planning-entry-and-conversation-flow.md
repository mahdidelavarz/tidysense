# Discussion 013 — AI Planning Entry and Conversation Flow

## Status

Accepted and closed after GPT × Claude review.

The original review found four coherence gaps. A later standards-based review identified one blocking safety gap. All five findings are now resolved, and Claude has confirmed the corrected direction.

Final companion authorities:

- [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]]
- [[01-Closed-Discussions/021-validation-plan-and-decision-gates]]

Discussion 013 owns Planning entry, conversation, clarification, fallback, and the minimum `SAFETY_FALLBACK` invariant. Discussion 018A owns the detailed failure, privacy, domain, hostile-input, and crisis policy. Discussion 021 owns the mandatory pre-pilot Crisis Safety Readiness gate. These later records complete this discussion without changing its accepted flow semantics.

Related discussions:

- [[01-Closed-Discussions/010-ai-first-planning-and-reconcile-roadmap]]
- [[01-Closed-Discussions/011-ai-native-mvp-scope-and-mindmap-update]]
- [[01-Closed-Discussions/012-core-product-model]]
- [[01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution]]
- [[01-Closed-Discussions/021-validation-plan-and-decision-gates]]

---

## 1. Scope

This discussion defines how a user enters AI-assisted planning and moves from an initial intention to a reviewable draft.

It answers:

```txt
Where may the flow begin?
What may the user provide first?
When should the AI clarify?
When should it produce a draft?
How may the user leave, restart, recover, or hit a safety boundary?
```

### Included now

- global, contextual, and manual entry
- conversation shape
- clarification policy and limit
- draft boundary
- exit and recovery states
- active-draft collision behavior
- minimum fixed crisis fallback invariant

### Explicitly excluded

- final AI JSON contract — Discussion 014
- Today and execution mechanics — Discussion 015
- Reconcile — Discussions 016–017
- detailed safety detection, localization, resource-selection, and hostile-input policy — Discussion 018A
- crisis release evidence and sign-off — Discussion 021
- persistence and analytics — Discussion 019
- provider/runtime architecture — Discussion 020
- implementation sequencing — Discussion 022

---

## 2. Accepted Entry Model

The user may begin with:

```txt
1. a desired outcome or direction
2. a finite Project idea
3. one or more Tasks
4. one or more Routines
5. an unstructured free-form intention
```

A Goal is not required.

The AI maps the request only into concepts accepted by Discussion 012:

```txt
Goal
Project
Task
Routine
```

`RoutineOccurrence` is not directly created through this flow.

The AI must not force a Goal hierarchy when a standalone Project, Task, or Routine is sufficient.

---

## 3. Entry Points

### 3.1 Global AI entry

A primary action such as:

```txt
Plan with AI
```

opens the flow without requiring existing context.

If an active unapproved conversation or draft exists, it must not be silently replaced. The user chooses:

```txt
Continue previous draft
Start new and discard previous draft
Cancel
```

Multiple simultaneously saved drafts are not required in the MVP.

### 3.2 Contextual entry

From an existing Goal or Project, the user may choose:

```txt
Plan next steps with AI
```

The selected Goal or Project becomes explicit context.

The AI may propose a different ownership model only if the difference is visible and explicitly reviewable. It must not silently move proposed items outside the selected context.

### 3.3 Manual creation

Manual creation remains permanently available for:

- Goal
- Project
- Task
- Routine

Manual creation is a parallel path, not merely a failure fallback.

---

## 4. First Screen and Interaction Style

The first screen uses one open input instead of a mandatory Goal form.

Suggested prompt:

> What do you want to make progress on?

The UI must make clear that:

```txt
The AI may ask a small number of questions.
Nothing is created until the user reviews and approves the draft.
```

The interaction is hybrid:

```txt
conversation
+ structured quick replies when useful
+ free text at every clarification step
```

The system should prefer one question at a time unless two values are tightly coupled.

The flow must not become a long form disguised as a chat, because apparently adding speech bubbles is how software occasionally attempts to disguise bureaucracy.

---

## 5. Conversation State Model

### 5.1 Main flow

```txt
EMPTY
→ INTERPRETING
→ CLARIFYING | DRAFT_READY | SAFETY_FALLBACK

CLARIFYING
→ CLARIFYING | DRAFT_READY | INPUT_BLOCKED | SAFETY_FALLBACK | CANCELLED

DRAFT_READY
→ REVIEWING | GENERATION_FAILED | SAFETY_FALLBACK | CANCELLED

REVIEWING
→ DRAFT_READY | APPROVED | SAFETY_FALLBACK | CANCELLED
```

The direct `INTERPRETING → DRAFT_READY` transition is required when the initial request is already specific enough.

### 5.2 Recovery flow

```txt
INTERPRETING | CLARIFYING
→ INPUT_BLOCKED
→ CLARIFYING | DRAFT_READY | MANUAL_FALLBACK | CANCELLED

INTERPRETING | CLARIFYING | DRAFT_READY
→ GENERATION_FAILED
→ RETRYING | MANUAL_FALLBACK | CANCELLED

RETRYING
→ INTERPRETING | DRAFT_READY | GENERATION_FAILED | SAFETY_FALLBACK

MANUAL_FALLBACK
→ manual creation path
```

### 5.3 State meanings

#### EMPTY

No meaningful user intention has been submitted.

#### INTERPRETING

The system identifies likely product entities, ownership, and missing information.

#### CLARIFYING

The system asks only questions needed to produce a useful, reviewable draft.

Ordinary unsupported expert requests may remain here after the system states the boundary and offers a supported planning alternative.

#### INPUT_BLOCKED

The system cannot proceed coherently because the request is too vague, contradictory, unsupported as a planning request, or missing a required constraint.

This state is not used for crisis routing.

#### DRAFT_READY

A draft exists, but no canonical entity has been created.

#### REVIEWING

The user edits, removes, accepts, or rejects proposed items.

#### APPROVED

The user explicitly approves creation of the accepted draft content.

#### CANCELLED

The flow ends without creating proposed entities.

#### GENERATION_FAILED

Interpretation or draft generation failed because of a model, provider, network, parsing, or internal error.

#### RETRYING

The system performs a user-requested retry using preserved input.

#### MANUAL_FALLBACK

The AI flow ends and transfers understood context into the relevant manual creation path without automatic entity creation.

#### SAFETY_FALLBACK

A mental-health-crisis, self-harm, or immediate-danger signal requires the normal planning conversation to stop.

In this state:

- open-ended planning reasoning stops
- no planning draft is generated from the crisis content
- no Goal, Project, Task, Routine, or change to existing data is proposed from that content
- the system displays a fixed, pre-written safety response
- the response directs the user toward immediate human help and appropriate crisis resources
- the user may later begin a new, unrelated planning flow from `EMPTY`

Discussion 018A defines detection, localization, resource selection, false-positive handling, and technical enforcement without weakening these invariants. Discussion 021 makes their tested readiness a mandatory pre-pilot release gate.

---

## 6. Clarification Policy

Clarification is selective, not mandatory.

The AI should generate a draft immediately when the request is already specific enough.

It asks a question only when the answer materially changes:

- entity type
- ownership under Goal or Project
- actionable content
- required timing or recurrence
- a constraint that prevents an unrealistic or contradictory proposal

### Mandatory clarification

A question is mandatory only when a coherent draft would otherwise require a high-impact assumption.

Typical cases:

- recurring behavior without usable recurrence
- conflicting or impossible dates
- ambiguous selected Goal or Project
- two materially different intentions that cannot safely be combined
- an explicit but undefined hard constraint

### Optional clarification

Optional questions may improve the draft but are asked only when their value justifies another interaction.

### Forbidden clarification

The AI must not ask for:

- unnecessary sensitive data
- a complete life history
- psychological diagnosis
- motivation-scoring questionnaires
- information already provided
- technical details the user should not need to know
- confirmation of obvious low-risk assumptions that can be shown in the draft

It must not repeatedly rephrase the same unresolved question.

---

## 7. Clarification Limit and Draft Now

The default clarification budget is:

```txt
maximum 3 AI clarification turns
```

Most flows should need zero to two turns.

After the third turn, the AI must:

```txt
1. generate a draft with visible assumptions
2. generate a smaller partial draft
3. identify the single blocking ambiguity and offer manual creation or restart
```

It must not continue an open-ended interview.

At any clarification step, the user may choose:

```txt
Draft now
```

The AI then uses explicit input, selected context, and low-risk assumptions.

It must not silently invent:

- deadlines
- recurrence schedules
- ownership relationships
- measurable Goal outcomes
- user availability

If one of these is essential, a partial draft is preferable to fabrication.

`Draft now` does not override `SAFETY_FALLBACK`.

---

## 8. Narrow Requests

The user may request only:

- one or more Tasks
- one or more Routines
- one Project

The AI must not create a Goal or Project merely to make the output appear more structured.

Examples:

```txt
Email the landlord tomorrow.
→ standalone Task draft

Practice English every weekday.
→ standalone Routine draft

Plan the steps needed to move apartments.
→ standalone Project with Tasks
```

Discussion 012 ownership invariants remain unchanged.

---

## 9. Vague, Contradictory, and Unsupported Input

### Vague but usable

The AI may ask one high-value question or produce a conservative draft with visible assumptions.

### Too vague to plan

The AI narrows the first area of concern without pretending to understand the user’s whole life.

### Contradictory

The AI identifies the contradiction and asks the smallest resolving question. It must not silently select one side.

### Incomplete but non-blocking

Missing information becomes an editable assumption rather than another unnecessary interview turn.

### Unsupported expert request

Example:

```txt
Diagnose my symptoms and create a treatment plan.
```

The system:

```txt
states the boundary
→ offers supported planning alternatives
→ remains in CLARIFYING for revised planning-relevant input
```

It may help organize user-provided actions, appointments, or questions, but must not diagnose, prescribe, invent legal or financial strategy, or imply professional authority.

### Crisis or immediate danger

Crisis content is not treated as an ordinary out-of-scope request.

```txt
crisis or immediate-danger signal
→ SAFETY_FALLBACK
→ fixed safety response
→ no planning draft
```

---

## 10. Exit, Restart, Recovery, and Failure

Before approval, the user may:

```txt
Cancel
Restart
Edit original intention
Draft now
Continue manually
```

- Cancel ends without creation.
- Restart clears the current flow and returns to `EMPTY`.
- Edit returns to initial input; existing content is discarded unless explicitly preserved.
- Continue manually transitions to `MANUAL_FALLBACK`.

If the intention materially changes, the AI acknowledges the change and either continues as one revised flow or proposes separate drafts. It must not quietly blend unrelated intentions.

An unapproved draft may be retained for short-term recovery, but:

- it must remain clearly labeled unapproved
- it must never reappear as an accepted plan
- global-entry collision uses the choice defined in section 3.1
- no canonical entity is created before approval

Generation failure preserves user input and offers retry, edit, manual fallback, or cancel.

---

## 11. Accepted End-to-End Flow

```txt
Open AI planning
→ resolve active-draft collision if needed
→ submit broad or narrow intention
→ INTERPRETING

Specific enough
→ DRAFT_READY

Material ambiguity
→ CLARIFYING
→ up to 3 clarification turns
→ answer / Draft now / restart / cancel / manual fallback

Ordinary unsupported expert request
→ boundary response
→ remain in CLARIFYING

Crisis or immediate danger
→ SAFETY_FALLBACK
→ fixed response
→ no draft or entity creation

Normal path
→ DRAFT_READY
→ REVIEWING
→ edit / remove / approve / cancel

Explicit approval
→ APPROVED
→ canonical entities may be created
```

Core rule:

> Conversation produces a proposal. Approval creates product entities.

Safety override:

> Crisis content stops proposal generation and routes to a fixed safety response.

---

## 12. Final Accepted Decisions

### Entry model

- broad and narrow intentions are supported
- Goal is optional
- standalone Project, Task, and Routine drafts are supported
- entry may be global or contextual
- manual creation remains permanently available
- active unapproved drafts cannot be silently discarded

### Clarification

- clarification is selective
- default maximum is three AI clarification turns
- `Draft now` is available during ordinary clarification
- non-blocking assumptions remain visible
- high-impact values are not silently invented

### Interaction and state model

- hybrid conversation and quick replies
- free text remains available
- direct `INTERPRETING → DRAFT_READY` bypass
- explicit `RETRYING` and `MANUAL_FALLBACK`
- ordinary unsupported requests return to `CLARIFYING`
- crisis content routes to distinct `SAFETY_FALLBACK`

### Approval boundary

- AI content remains ephemeral before approval
- no canonical entities are created before explicit approval
- consequential changes are never auto-applied

### Safety boundary

- crisis and self-harm inputs never enter open-ended planning reasoning
- crisis input never produces planning entities
- fixed safety fallback takes precedence over normal conversation controls, including `Draft now`

---

## 13. Review Resolution

Claude’s first review identified:

```txt
F1 — Important
Out-of-scope behavior lacked formal state mapping.
Resolved: ordinary unsupported requests remain in CLARIFYING.

F2 — Important
The diagram omitted direct draft generation.
Resolved: INTERPRETING may transition directly to DRAFT_READY.

F3 — Important
Global entry could silently collide with an active draft.
Resolved: continue / discard and restart / cancel.

F4 — Minor
RETRYING and MANUAL_FALLBACK lacked definitions.
Resolved: both are explicit states.
```

After reading the written review standards, Claude corrected its earlier review and identified:

```txt
SAFETY-01 — Blocking
Mental-health-crisis input was included in the domain boundary while its
protective mechanism was initially deferred and is now completed by Discussion 018A plus the Discussion 021 release gate.

Resolved:
A distinct SAFETY_FALLBACK state stops conversational planning, prevents
draft and entity generation, and displays a fixed pre-written safety response.
Discussion 018A defines detailed enforcement without weakening this rule, and Discussion 021 requires release evidence before pilot rollout.
```

GPT accepts this correction. The earlier claim that no blocking issue existed was premature and has been replaced by the resolution above.

Claude has confirmed Discussions 012 and 013 after the corrected direction. No unresolved blocking or important issue remains in Discussion 013.

---

## 14. Mind Map Impact

Record for consolidation by Discussion 022. Do not apply from this file alone.

### User flow

Add or revise:

```txt
Global AI entry
Active-draft collision choice
Contextual Goal/Project entry
Manual creation path
Interpretation
Direct draft bypass
Clarification loop
Draft now
Draft review
Approval boundary
Cancel/restart/manual fallback
Generation failure and retry
Unsupported expert boundary
Crisis detection → SAFETY_FALLBACK
```

### AI responsibilities

Add:

- interpret broad and narrow intentions
- ask only high-value questions
- respect three-turn clarification budget
- show material assumptions
- preserve manual path
- never create entities before approval

### AI guardrails

Add:

- no forced Goal hierarchy
- no silent high-impact assumptions
- no repeated questioning for known information
- no unsupported professional authority
- no silent replacement of active drafts
- crisis input stops open-ended planning
- crisis input produces no draft or canonical entity
- fixed safety response overrides normal flow

### Open questions to remove or narrow

Resolve:

- whether Goal is required at entry
- whether direct Task/Routine requests are supported
- whether interaction is chat or form
- whether manual creation exists
- whether clarification may be skipped
- active-draft collision behavior
- ordinary out-of-scope state behavior
- minimum crisis-routing invariant

No Mind Map change is applied yet.

---

## 15. Affected Formal Documents

Record for consolidation by Discussion 022. Do not update from this file alone.

Accepted decisions must later update or create:

- AI planning conversation flow specification
- product UX flow documentation
- AI responsibility and guardrail specification
- draft review specification with Discussion 014
- execution entry dependencies in Discussion 015
- safety, crisis fallback, privacy, and failure specification in Discussion 018A
- mandatory crisis-readiness release gate in Discussion 021
- analytics event specification in Discussion 019
- runtime/API and provider-failure specification in Discussion 020
- implementation plan in Discussion 022

Potential ADRs:

- AI planning entry and approval boundary
- active unapproved draft collision policy
- crisis safety override and fixed fallback invariant

No Mind Map or formal document is modified by closing this discussion alone.

---

# خلاصهٔ فارسی

بحث ۰۱۳ جریان ورود و مکالمهٔ AI Planning را تعریف می‌کند. کاربر می‌تواند با Goal، Project، Task، Routine یا یک نیت آزاد شروع کند و Goal اجباری نیست. ورود می‌تواند global، از داخل Goal/Project یا از مسیر manual creation باشد. draft فعال قبلی نیز نباید بدون انتخاب صریح کاربر جایگزین شود.

Clarification فقط زمانی انجام می‌شود که پاسخ واقعاً ساختار یا امکان اجرای draft را تغییر دهد و در حالت عادی حداکثر سه نوبت دارد. کاربر می‌تواند `Draft now` را انتخاب کند، اما AI اجازه ندارد deadline، recurrence، ownership یا ظرفیت کاربر را بدون مبنا اختراع کند. مکالمه فقط proposal می‌سازد و هیچ موجودیت canonical پیش از review و approval صریح ایجاد نمی‌شود.

خطا، retry، manual fallback، cancel و restart حالت‌های رسمی flow هستند. محتوای بحران یا خودآسیبی مستقیماً به `SAFETY_FALLBACK` می‌رود، مکالمهٔ برنامه‌ریزی را متوقف می‌کند و هیچ draft یا entity تولید نمی‌شود. جزئیات safety در ۰۱۸C و آمادگی اجباری پیش از پایلوت در release gate بحث ۰۲۱ تعریف شده‌اند.
