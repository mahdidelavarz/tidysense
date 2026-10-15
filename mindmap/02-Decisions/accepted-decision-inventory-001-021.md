# Accepted Decision Inventory — Discussions 001–029

Status: **Canonical consolidated projection** (2026-09-19). The filename is retained so existing links do not break. Later accepted discussions override earlier contradictory decisions.

## Authority index

| Subject | Authority |
|---|---|
| Narrow legacy compatibility (mobile OTP, auth/API basics, palette) | [[../01-Closed-Discussions/001-008-legacy-surviving-decisions]] as amended by the technical DevMap |
| AI-native direction and scope | Discussions 010–011 |
| core/temporal model | Discussions 012–012A, amended by 023–026 |
| Planning flow/output | Discussions 013–014A, amended by 023, 026, 028 and 029 |
| Task/Routine/Today | Discussions 015–015B, amended by 024–026 |
| Reconcile | Discussions 016–017A, amended by 025–026 |
| authority, privacy, hostile input and failure | Discussions 018–018A; dedicated crisis UX removed by 2026-09-19 consolidation; one-tap Reconcile item actions and AI disclosure amended by 027 |
| persistence, transactions, events and retention | Discussions 019A–019C, amended by 023–027 |
| AI/API/frontend runtime | Discussions 020A–020C, amended by current DevMap technical decisions |
| validation and gates | Discussion 021, with crisis-specific gate removed; product-insight measures added by 027 |
| implementation sequence | Discussion 022, amended by 023–026 and current repository evidence |
| persistent PlanningFacts | Discussion 023 |
| multi-time Routine scheduling | Discussion 024 |
| Task sequences and hierarchical Reconcile | Discussion 025, as amended by 026 and 029 |
| Backlog removal, parent-owned undated Tasks and CaptureItem | Discussion 026 |
| AI disclosure, response feedback, product insights and one-tap Reconcile item actions | Discussion 027 |
| clarification quick replies, the four-step planning flow, first-run guides and desktop in the pilot | Discussion 028, as amended by 029 |
| planning quality: rolling horizon, dates, structure, questions, calendar, no structural errors, sequences, weekly continuation | Discussion 029 |

## Consolidated accepted state

### Product and authority

- The product is TidySense; Plan is not a canonical entity.
- Canonical work entities are Goal, Project, Task, Routine and RoutineOccurrence.
- Supporting durable records include PlanningFact and CaptureItem; Task sequence is structural metadata, not a separate entity.
- AI proposes or explains. It cannot authorize, execute commands, mutate repositories, infer lifecycle outcomes or turn invalid output into canonical state.
- The backend authenticates, authorizes, validates ownership where the model defines ownership, checks versions and invariants, and commits atomically.

### PlanningFact and rolling context — D023

- A `PlanningFact` belongs to exactly one Goal or one standalone Project.
- Required fields: `id`, `factType`, `strength`, `structuredValue`, `source`, `status`, `capturedAt`, `lastConfirmedAt`, `updatedAt`; plus exactly one of `goalId`/`projectId`, optional `sourcePlanningAttemptId`, `expiredAt`, `removedAt`.
- `strength`: `HARD | SOFT | INFORMATIONAL`; status: `ACTIVE | EXPIRED | REMOVED`; source: `USER_EXPLICIT | USER_CONFIRMED_AI_EXTRACTION`.
- Initial hard facts cover unavailable weekday/date/date-range. Category is derived from `factType`.
- AI may propose extracted facts, but each is separately approved and must not duplicate a canonical home.
- AI generation uses a bounded weekly context: detailed seven-day horizon plus the immediately previous window where allowed. Manual creation is not blocked by PlanningFacts.

### Routine schedule/occurrence — D024

- Routine recurrence is local-calendar based and stores zero or more unique local wall-clock `timesOfDay` values.
- Empty `timesOfDay` means untimed, with at most one occurrence per local date.
- Timed identity is `(routineId, scheduledLocalDate, scheduledLocalTime)`; untimed identity is `(routineId, scheduledLocalDate)`.
- A pending timed occurrence becomes missed at the next slot or local-day end; an untimed occurrence becomes missed at local-day end. There is no arbitrary grace period.
- Generation is bounded, idempotent and per date/per slot. True `EVERY_N_HOURS` is deferred.

### Task sequences and Reconcile — D025/D026

- A Task has optional `sequenceId` and `sequenceOrder`; both are present or absent together and order is unique per sequence.
- Sequence members share one direct ownership scope: same Project, same Goal, or all standalone.
- A predecessor must be complete before its successor is actionable. An active predecessor blocks; dropping a predecessor requires explicit structural resolution.
- Today may show a blocked task planned for today as non-actionable context.
- Reconcile groups Project → Sequence → Task. Blocked descendants do not increase actionable count or oldest-actionable age.
- Sequence bulk actions (`CARRY_ALL`, `DROP_ALL`, `REVIEW_INDIVIDUALLY`, `REVIEW_WITH_AI`) are atomic when applied.
- Discussion 026 replaces every Backlog-specific rule in Discussion 025 with `UNSCHEDULED_PARENT_OWNED` semantics.

### Backlog removal and CaptureItem — D026

- Backlog is removed, including `Task.placement`, Task-level `reviewDate`/`reviewDateSource`, related actions, filters and events.
- An active standalone Task requires `plannedDate`. An active Task directly owned by a Goal or Project may be undated and resurfaces through its direct parent review.
- Today includes active Tasks planned for the current local date; Carry changes an existing planned date.
- Goal/Project `reviewDate` is a stored system-managed snapshot: target date when present, otherwise Project creation +30 local days or Goal creation +90. Continuing after review sets the next snapshot to `min(default, targetDate)`.
- Quick Capture without a parent/date creates a `CaptureItem` (`UNRESOLVED | RESOLVED | DISCARDED`). Resolution creates a separate Task or Routine and correlated events; it never changes the capture row into a work entity.
- Capture is a separate Reconcile lane/count, not execution severity.

### AI disclosure, feedback and insights — D027

- There is no AI consent step. AI planning is available without a gate; the manual path stays available and sends nothing to a model.
- Disclosure lives in the privacy notice only: text goes to an AI model only to build the draft, is not stored, and leaves the country. The provider name is never shown to users or carried in user-facing responses.
- After a planning draft or a Reconcile explanation is shown, a sampled, non-blocking prompt asks for a 1–5 rating; ratings 1–2 offer an optional reason. Answers are R2, removed after 180 days and on erasure, and reasons are shown to the operator without identity.
- The operator page adds "Product insights": activation, weekly activity, cohorts, planning funnel, items removed before acceptance, clarification use, execution of AI-created versus manual work, Reconcile mix and satisfaction. Every figure has its denominator; internal accounts are apart; there is no per-user view and no user text except satisfaction reasons.
- In Reconcile, marking a single Task complete and Carrying it to today apply on tap with undo. Carry to another date, Drop and bulk/sequence actions still need preview and confirmation.
- Reading or storing user text sent to the AI for product learning is rejected.
- Pilot (about 30–50 accounts, one to two months): pilot questions `H1_USEFULNESS`/`H2_UNDERSTANDING` stay and are never doubled with the satisfaction prompt for one subject; the prompt follows every eligible AI response at most once per account, surface and day, and always on an account's first; eligible means a planning draft that ended unapplied (cancelled or replaced), since an applied draft gets H1, and a Reconcile explanation only where H2 is not asked, which in practice means none during the pilot (owner, 2026-10-14); rates are reported per account as well as per response, with shown/answered/closed apart, a small-sample label under 10, and definitions frozen before the first pilot account.

### Quick replies, first-run guides and desktop — D028

- A clarification question carries text, an optional one-line reason, a `kind` (`TIMING`, `RECURRENCE`, `CONSTRAINT`, `CONTENT`, `OWNERSHIP`, `ENTITY_TYPE`, `CONTRADICTION`) and zero or two to seven model-proposed options, single or multiple choice. The product always adds «چیز دیگر…» with free text; the model never returns its own "other" option. An output breaking these rules is rejected whole.
- One turn shows one to three related questions on one screen, each answerable on its own and each optional; no answer means `Draft now`. 013's turn limit and question rules are unchanged.
- Measurement records only the question `kind` and the answer type (`OPTION` with position, `OTHER`, `UNANSWERED`), never option labels or answer text.
- Every planning entry shows the same four steps: نوشتن، پرسش‌ها، مرور، تأیید. A turn without questions shows «پرسش‌ها» as passed.
- On phones, at first open and before login, a welcome screen and three guide pages are shown once per device; never to an existing session or on desktop; nothing about them is recorded on the server. A guide's promise must hold in the measured product, otherwise its copy changes.
- The pilot runs on phone and desktop. Desktop has its own layouts and may show more, derived from data the phone already has, but adds no behaviour.
- *Amended by D029:* zero or exactly two model options; the product-added answer is «خودت بنویس»; free text opens by default when there are no options; up to four questions per turn, still up to three turns; `ENTITY_TYPE` removed.

### Planning quality — D029

- **Rolling horizon.** Goal/Project `targetDate` and Task `deadline` may lie up to 24 months ahead; Task `plannedDate` and a Routine's start stay inside the seven-day window; Routines keep recurring after it. The review says why the week is detailed and that the next is built from this week's evidence.
- **Weekly continuation.** Near a window's end the product offers the next window for that Goal or Project; it is generated on the user's tap from execution evidence and reviewed and confirmed like any draft.
- **Dates.** `plannedDate`, Routine days and times always set; a `targetDate` from a public or stated fact set as an estimate marked «تخمینی»; a `deadline` only when stated or implied by a fixed real-world date. No invented measurable Goal outcome.
- **Structure.** Goals and Projects only when real (029 §5); none empty; no re-parenting or wrapper Projects to pass validation; the system, not the user, decides structure; a long Goal gets phase Projects, its core Routine and real first-week Tasks.
- **Calendar.** The product gives the model Persian dates, weekday names and ISO numbers for each window day, and renders every Persian date it shows.
- **Questions.** Up to three turns of up to four questions, a later turn only when an answer opened a new question; each with zero or two model options plus «خودت بنویس»; only about the user; never the entity type, a public fact or what was said; draft without asking when visible assumptions suffice.
- **No structural errors from the model.** One regeneration with the issues; items still invalid are removed with a visible note; `GENERATION_FAILED` only when nothing valid is left; meaning is never changed silently.
- **Sequences.** The model proposes a chain when a step needs another's result; review shows it with a remove control. Manually: «بعد از…» on any active Task, move within the unresolved part, remove from order.
- **Quality bar.** A kept evaluation set of at least 30 Persian intentions: ≥ 95% approvable without a blocking issue, no entity-type questions, at most 1 in 10 asking a public fact, no empty parents, correct Persian dates, median time to draft under 2 minutes.

### Safety consolidation

Dedicated crisis pages, gates, routing, emergency-resource screens and crisis-specific product records are removed. Remaining guardrails are: bounded provider/moderation controls, hostile-input isolation, context minimization, no diagnosis/high-risk inference, no AI mutation, explicit invalid/failure states, manual/deterministic fallback, authorization, privacy, observability, rate/cost limits and normal incident handling.

## Superseded guidance

The following no longer define the product: explicit Backlog; Task review checkpoints; one occurrence per Routine/day regardless of slot; multiple daily slots as post-pilot; Task dependency graph as post-pilot; dedicated crisis UX/gate; “implementation not started”; an AI consent step before planning; naming the AI provider to users; Java/Spring as the backend stack; `/app` repository layout; integer IDs, opaque DB sessions, IPPanel, unversioned APIs or snake_case as canonical architecture.
