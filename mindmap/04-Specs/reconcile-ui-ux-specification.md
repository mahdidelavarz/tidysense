# Reconcile UI/UX Specification

## Status

```txt
PROPOSED_FOR_CLAUDE_REVIEW
NOT YET IMPLEMENTATION_READY
```

This specification projects the accepted Reconcile decisions into a concrete UI/UX contract for Figma and frontend implementation.

It does not create new product semantics. Where this document conflicts with an authoritative closed discussion, the closed discussion wins.

## Source authority

Primary sources:

- `01-Closed-Discussions/016-reconcile-trigger-and-severity.md`
- `01-Closed-Discussions/016a-review-checkpoint-trigger-and-presentation-amendment.md`
- `01-Closed-Discussions/017-ai-reconcile-intelligence-and-actions.md`
- `01-Closed-Discussions/018-action-permissions-trust-and-reversibility.md`
- `01-Closed-Discussions/018a-ai-failure-privacy-domain-and-hostile-input-resolution.md`
- `01-Closed-Discussions/019c-events-ai-observability-and-retention.md`
- `01-Closed-Discussions/020b-api-and-frontend-state-contracts.md`
- `01-Closed-Discussions/020c-structured-output-reliability-and-cost-controls.md`
- `01-Closed-Discussions/021-validation-plan-and-decision-gates.md`

Navigation reference:

- `02-Decisions/accepted-decision-inventory-001-021.md`

---

# 1. Product Contract

## 1.1 Purpose

Reconcile helps the user align canonical planning state with current reality.

It resolves explicit pending decisions created by:

- overdue execution,
- repeated Carry,
- stale Backlog,
- deadline risk,
- actionable Routine mismatch patterns,
- reached review checkpoints,
- Goal continuation checkpoints,
- structural lifecycle conflicts,
- accepted historical corrections that materially change current context.

Reconcile is not:

- punishment,
- productivity scoring,
- behavioral diagnosis,
- a general AI conversation,
- automatic replanning,
- an analytics report,
- a replacement for Today,
- a source of hidden canonical mutation.

## 1.2 Core interaction sequence

```txt
deterministic cleanup
→ deterministic eligibility and severity
→ deterministic facts and grouping
→ versioned rule matching
→ optional bounded AI explanation
→ predefined user actions
→ explicit decision
→ final review and consequence preview
→ commit-time revalidation
→ deterministic atomic mutation
→ authoritative CommandResult
```

## 1.3 Non-blocking principle

Reconcile never blocks Today.

At every severity the user may:

- enter Today,
- skip the presentation,
- return later,
- open Reconcile manually.

Only a specific conflicting lifecycle action may be blocked until its local conflict is resolved.

## 1.4 Skip is not resolution

```txt
skip or dismiss
≠ resolved facts
≠ completed Reconcile session
≠ canonical mutation
```

Skip changes presentation state only.

## 1.5 Neutral tone

Severity describes unresolved product context, not the user.

Forbidden language includes:

- failure,
- poor discipline,
- low motivation,
- bad productivity,
- falling behind as a personal judgment,
- incapability,
- loss of interest inferred from absence.

Preferred language includes:

- needs review,
- needs a decision,
- needs an update,
- unresolved item,
- review checkpoint reached,
- current plan no longer matches recorded reality.

---

# 2. Screen Architecture

Reconcile has exactly three primary Screen Families.

## 2.1 Reconcile Overview

Route concept:

```txt
/reconcile
```

Purpose:

- explain why Reconcile is currently available,
- show severity and lane summaries,
- show counts and major groups,
- let the user start, skip, or enter Today,
- preserve the distinction between execution backlog and commitment review.

## 2.2 Reconcile Session

Route concept:

```txt
/reconcile/sessions/:sessionId
```

Purpose:

- review deterministic facts and rule matches,
- inspect optional AI explanation,
- choose, edit, reject, or manually decide allowed actions,
- process items in stable groups and chunks,
- preserve the evaluated session boundary.

## 2.3 Reconcile Review & Apply

Route concept:

```txt
/reconcile/sessions/:sessionId/review
```

Purpose:

- show all selected decisions together,
- show before/after consequences,
- show protected exclusions and parent-empty effects,
- bind warning acknowledgement to exact warning versions,
- confirm one atomic command or approved atomic bulk command,
- display Applying, Success, Conflict, or Failed.

## 2.4 States, not extra pages

The following are states, not separate product screens:

- Facts Only,
- AI Loading,
- AI Failed,
- Recommendation Ready,
- Edited,
- Stale,
- Cancelled,
- Applying,
- Succeeded,
- Conflicted,
- Failed,
- Empty,
- Skipped.

---

# 3. Shared Concepts

## 3.1 Eligibility, severity, and blocking conflict

The UI must keep three independent concepts separate:

```txt
Eligibility
Severity
Blocking conflict
```

Examples:

```txt
eligible = true
severity = LIGHT
blockingConflict = false
```

or:

```txt
eligible = true
severity = LIGHT
blockingConflict = true
blockingConflictScope = PROJECT_COMPLETION
```

A blocking conflict must never be displayed as proof that global Reconcile severity is Recovery.

## 3.2 Severity bands

User-facing labels may be localized, but internal semantics remain:

- `LIGHT`
- `MEDIUM`
- `RECOVERY`

Recommended Persian display:

- LIGHT: `مرور کوتاه`
- MEDIUM: `مرور پیشنهادی`
- RECOVERY: `مرور مرحله‌ای`

Do not expose English enum values in the interface.

Do not use labels such as:

- بحرانی,
- وضعیت بد,
- شکست,
- عقب‌ماندگی شدید.

## 3.3 Reconcile lanes

Reconcile has two distinct lanes.

### Execution-decision lane

Includes:

- overdue Tasks,
- repeated Carry,
- deadline risk,
- actionable corrections,
- actionable Routine mismatch,
- Project execution overload candidates,
- structural execution conflicts.

This lane contributes to execution severity.

### Commitment-review lane

Includes:

- Goal review checkpoints,
- Project review checkpoints,
- Task Backlog review checkpoints,
- other `REVIEW_DUE` commitments.

This lane does not inflate execution severity.

The UI must not combine them into one undifferentiated count.

## 3.4 Session boundary

A ReconcileSession represents one evaluated snapshot.

The UI must distinguish:

- facts evaluated at session start,
- decisions made during the session,
- facts created after the session boundary.

After completion, if new facts exist, show:

`موارد جدیدی بعد از شروع این مرور ایجاد شده‌اند.`

Do not claim the entire current backlog is resolved when only the evaluated snapshot was completed.

## 3.5 Facts, rules, and AI explanation

Every recommendation presentation must visually distinguish:

### Fact

Label:

`واقعیت ثبت‌شده`

Source:

- canonical state,
- derived deterministic metric,
- accepted historical event.

### Rule match

Label:

`قانون محصول`

Source:

- versioned deterministic rule,
- predefined allowed actions.

### AI explanation

Label:

`توضیح پیشنهادی`

Properties:

- optional,
- never authoritative,
- never invents cause,
- never creates an action type,
- may fail without blocking manual resolution.

## 3.6 Free-text boundary

MVP Reconcile does not use free text for:

- rule matching,
- metric calculation,
- causal inference,
- recommendation authority.

A user note may exist as user-authored content, but it must not influence deterministic rule matching.

## 3.7 Protected items

Protected items:

- are excluded from destructive bulk actions,
- retain visible deadline and risk context,
- are never silently moved or dropped,
- expose only allowed actions.

Recommended tooltip:

`این Task در تغییرهای گروهی محافظت شده است.`

## 3.8 Recommendation outcome and command outcome

The UI must never treat:

- Accepted,
- Accepted Edited,
- Confirmed

as proof that mutation succeeded.

Successful application exists only when the linked command result is authoritative and `SUCCEEDED`.

---

# 4. Reconcile Overview Specification

## 4.1 Purpose

The Overview explains:

- why Reconcile is eligible,
- how large the evaluated decision set is,
- which lane the items belong to,
- whether a scoped blocking conflict exists,
- what the user can do next.

It does not show detailed recommendations.

## 4.2 Desktop structure

```txt
Authenticated App Shell
→ Page Header
→ Severity Summary
→ Execution Lane Summary
→ Commitment Review Lane Summary
→ Blocking Conflict Notice, when present
→ Start / Skip / Today actions
```

## 4.3 Mobile structure

```txt
Compact Header
→ Severity Summary
→ Lane Cards
→ Optional Blocking Conflict Notice
→ Primary action
→ Secondary actions
→ Bottom Navigation
```

## 4.4 Header

Title:

`مرور برنامه`

Supporting copy:

`مواردی که نیاز به تصمیم یا بازبینی دارند اینجا مرتب شده‌اند.`

Do not use:

`بیایید اشتباه‌ها را اصلاح کنیم.`

## 4.5 Severity summary

### LIGHT

Suggested copy:

`یک مرور کوتاه کافی است.`

### MEDIUM

Suggested copy:

`چند مورد بهتر است با هم بررسی شوند.`

### RECOVERY

Suggested copy:

`موارد در چند مرحله کوچک مرور می‌شوند.`

Always show actionable count separately.

Example:

`۵ مورد نیاز به تصمیم دارد.`

Do not use percentages or scores.

## 4.6 Lane cards

### Execution lane card

Title:

`تصمیم‌های اجرایی`

May show grouped counts:

- Taskهای عقب‌افتاده,
- Carry تکرارشده,
- ریسک مهلت,
- الگوی Routine نیازمند بررسی.

### Commitment lane card

Title:

`بازبینی تعهدها`

May show:

- Goalهای نیازمند بازبینی,
- Project checkpointها,
- Backlog review checkpoints.

Do not visually imply commitment review is execution failure.

## 4.7 Category previews

Overview may show compact category rows:

- `Taskهای عقب‌افتاده`
- `Taskهای چندبار منتقل‌شده`
- `موارد دارای ریسک مهلت`
- `Routineهای نیازمند بازبینی`
- `Goalهای نیازمند تصمیم ادامه`
- `Projectهای نیازمند checkpoint`

Each row shows:

- count,
- concise neutral explanation,
- no recommendation yet.

## 4.8 Blocking conflict notice

Show only when present.

Example:

`تکمیل یک Project تا تعیین تکلیف childها متوقف شده است.`

Actions:

- `بررسی تعارض`
- `رفتن به Today`

Do not imply Today is blocked.

## 4.9 Actions

Primary:

`شروع مرور`

Secondary:

- `رفتن به Today`
- `بعداً مرور می‌کنم`

For MEDIUM and RECOVERY, optional scheduling actions may include:

- `بعداً امروز`
- `فردا یادآوری کن`

Skip remains available at all severities.

## 4.10 Automatic presentation suppression

At most one automatic primary presentation per local day.

The Overview itself remains manually accessible.

After skip or dismissal:

- update badge count if facts change,
- do not automatically reopen the full prompt,
- except for accepted deadline or blocking-conflict exceptions.

## 4.11 Empty state

Title:

`فعلاً موردی نیاز به مرور ندارد.`

Primary:

`رفتن به Today`

Do not display celebration or score.

## 4.12 Overview states

Required states:

- Loading
- Empty
- LIGHT available
- MEDIUM available
- RECOVERY available
- Blocking Conflict
- Fetch Failed
- Offline
- Skipped Today
- New Items Since Last Session

---

# 5. Reconcile Session Specification

## 5.1 Purpose

The Session allows the user to resolve one evaluated group or chunk at a time.

It presents:

- deterministic facts,
- matched rule,
- allowed actions,
- consequence preview,
- optional AI explanation,
- manual decision path.

## 5.2 Stable grouping order

Groups follow:

```txt
1. canonical ownership
2. entity type and lane
3. matched rule relationship
4. risk and protection constraints
```

Examples:

- Project-owned work under one Project,
- direct Goal-owned work under one Goal,
- standalone Tasks,
- occurrences under one Routine,
- Goal continuation checks,
- review checkpoints.

Do not semantically group unrelated items based only on text similarity.

## 5.3 Chunking

Large sessions must be chunked.

The UI should show:

- current group,
- current chunk,
- remaining group count,
- session progress without fake precision.

Recommended progress:

`گروه ۲ از ۵`

Avoid percentage progress unless exact and useful.

## 5.4 Desktop structure

```txt
Workspace Header
→ Group navigation
→ Fact summary
→ Rule match
→ Recommendation and allowed actions
→ Optional AI explanation
→ Affected items
→ Consequences and warnings
→ Decision controls
```

A side panel may show:

- session progress,
- selected decisions,
- lane summary.

## 5.5 Mobile structure

```txt
Compact Header
→ Group context
→ Fact
→ Rule
→ Affected items
→ Action options
→ Consequences
→ Continue
```

Use collapsible sections for detailed evidence.

Do not compress desktop side panels into narrow columns.

## 5.6 Session header

Show:

- lane label,
- group title,
- progress,
- exit action,
- manual mode action.

Example:

`تصمیم‌های اجرایی`

`Project: بازطراحی محصول`

`گروه ۲ از ۵`

## 5.7 Fact block

Required fields:

- exact observed fact,
- affected entity count,
- relevant metrics,
- evidence period,
- evidence quality when relevant.

Example:

`این Task دو بار به تاریخ بعد منتقل شده است.`

Do not say:

`تو مدام این کار را عقب می‌اندازی.`

## 5.8 Rule block

Show:

- human-readable rule title,
- matched condition,
- allowed action set,
- version only in advanced technical notes, not normal UI.

Example:

`قانون Carry تکرارشده`

`پس از دومین انتقال، Task برای تصمیم دوباره نمایش داده می‌شود.`

## 5.9 AI explanation block

Optional.

Possible states:

- Loading
- Ready
- Failed
- Hidden

Failure copy:

`توضیح پیشنهادی در دسترس نیست. تصمیم‌ها همچنان قابل بررسی‌اند.`

AI failure must not hide deterministic facts or actions.

## 5.10 Recommendation card

Show:

- recommended action,
- affected entities,
- exact consequence,
- warnings,
- protected exclusions,
- parent impact.

Allowed user responses:

- `پذیرفتن`
- `ویرایش تصمیم`
- `رد پیشنهاد`
- `تصمیم دستی`
- `فعلاً رد شو`

`فعلاً رد شو` does not resolve the item.

## 5.11 Rule catalog presentation

### Repeated Carry

Show exact Carry evidence.

Allowed actions:

- replan to explicit date,
- move to Backlog,
- split Task,
- Drop when safe,
- keep unchanged.

### Old execution-unresolved Task

Show execution age.

Allowed actions:

- replan,
- Backlog,
- safe Drop,
- keep unchanged.

### Deadline risk

Show deadline and remaining window.

Allowed actions:

- schedule next action,
- split Task,
- review conflicting Tasks,
- keep with acknowledged risk.

Never recommend Drop or concealment in Backlog.

### Routine mismatch

Show:

- observed occurrence count,
- missed ratio,
- evidence quality,
- calibration exclusion.

Allowed actions:

- change days,
- reduce frequency,
- review time,
- stop Routine,
- keep unchanged.

### Project overload candidate

Show exact affected Task count and ratio.

Allowed actions:

- move selected Tasks to Backlog,
- split selected Tasks,
- keep Project unchanged.

### Structural lifecycle conflict

Show exact blocked transition and children.

AI may explain; it cannot choose.

### Review checkpoint

Task checkpoint actions:

- schedule explicit date,
- keep Backlog with new review date,
- keep placement with new review date,
- safe Drop.

Project checkpoint actions:

- keep with new review date,
- adjust child execution,
- user-initiated Complete,
- user-initiated Stop.

### Goal continuation

Use fixed neutral question:

`آیا هنوز می‌خواهی این Goal را ادامه بدهی؟`

Allowed actions only:

- `ادامه می‌دهم`
- `بعداً بازبینی می‌کنم`
- `Goal را رها می‌کنم`

Do not recommend abandonment.

## 5.12 Manual mode

Manual mode preserves:

- facts,
- allowed actions,
- consequences,
- confirmation requirements.

It removes optional AI explanation and recommendation emphasis.

Manual mode is not a degraded inferior screen.

## 5.13 Editing a recommendation

Editing must remain within allowed action types.

Examples:

- choose a different explicit date,
- remove selected items from a bulk group,
- select Backlog instead of replan,
- keep item unchanged.

Do not permit free-form action creation.

## 5.14 Bulk actions

Bulk action is available only when:

- every selected item matched the same rule,
- every selected item supports the same action,
- protected items are excluded where required,
- every affected item is visible,
- consequences are previewed.

Bulk-safe candidates:

- move selected Tasks to Backlog,
- replan selected Tasks to one explicit date,
- keep selected items,
- Drop selected Tasks only when all are safe.

## 5.15 Parent-empty consequence

Before Backlog or Drop confirmation, show when a parent would have no active executable work.

Example:

`بعد از این تغییر، Project «بازطراحی محصول» Task اجرایی فعالی نخواهد داشت.`

Also show:

`Project همچنان فعال می‌ماند تا جداگانه درباره وضعیت آن تصمیم بگیری.`

## 5.16 Protected exclusions

Show excluded protected items in a separate section.

Example:

`۲ Task از این تغییر گروهی کنار گذاشته شدند.`

Each item must show the reason.

## 5.17 Session item outcome

User decisions may be stored as:

- Accepted
- Accepted Edited
- Rejected
- Manual Decision
- Skipped

Only accepted/manual decisions selected for final review move to Review & Apply.

Accepted is not applied.

## 5.18 Session staleness

If canonical state changes:

- mark affected recommendation stale,
- preserve user choice where safe,
- require refresh,
- rerun deterministic evaluation,
- do not silently merge.

Copy:

`اطلاعات این پیشنهاد تغییر کرده است.`

Action:

`به‌روزرسانی پیشنهاد`

## 5.19 Session exit

On exit with unresolved decisions:

- preserve the session if still valid,
- clearly say unresolved items remain,
- do not mark session complete.

## 5.20 Session states

Required states:

- Facts Only
- AI Loading
- Recommendation Ready
- AI Failed
- Edited
- Rejected
- Manual Mode
- Stale
- Cancelled
- Offline
- Group Completed
- Session Ready for Review

---

# 6. Reconcile Review & Apply Specification

## 6.1 Purpose

This screen is the final authoritative review before mutation.

It shows:

- every selected decision,
- affected canonical entities,
- current and proposed values,
- consequences,
- warnings,
- protected exclusions,
- expected versions,
- atomicity scope.

## 6.2 Desktop structure

```txt
Header
→ Decision summary
→ Grouped decisions
→ Protected exclusions
→ Parent consequences
→ Warnings and acknowledgements
→ Atomicity notice
→ Apply action
```

## 6.3 Mobile structure

```txt
Header
→ Summary
→ Decision groups
→ Consequences
→ Warnings
→ Sticky Apply action
```

Do not hide warnings below a permanently covering sticky action.

## 6.4 Decision row

Each row shows:

- entity,
- current state,
- proposed action,
- proposed value,
- consequence,
- source group or matched rule.

Example:

```txt
Task: تکمیل مستند API
اکنون: برنامه‌ریزی‌شده برای ۲۸ آبان
تصمیم: انتقال به Backlog
بازبینی بعدی: ۱۵ آذر
```

## 6.5 Warning acknowledgement

Warnings require exact identity/version matching.

The UI must not acknowledge only a raw code.

If warning content changes:

- invalidate prior acknowledgement,
- show changed warning,
- require review again.

## 6.6 Atomicity notice

Required copy:

`این تغییرها به‌صورت یکجا اعمال می‌شوند. اگر وضعیت یکی از موارد تغییر کرده باشد، هیچ‌کدام اعمال نمی‌شوند و پیش‌نمایش تازه‌ای نمایش داده می‌شود.`

Do not imply partial success.

## 6.7 Apply action

Primary:

`اعمال تصمیم‌ها`

Secondary:

`بازگشت و ویرایش`

Apply starts command submission only.

It is not success.

## 6.8 Revalidate before commit

At commit time revalidate:

- current entity versions,
- ownership,
- protection,
- warning versions,
- allowed actions,
- parent consequences,
- session validity,
- idempotency identity.

## 6.9 Applying state

Show:

`در حال اعمال تصمیم‌ها…`

Keep visible:

- decision count,
- affected group count,
- current preview identity.

Disable duplicate submission.

Do not navigate away before authoritative result.

## 6.10 Success state

Success exists only when CommandResult is `SUCCEEDED`.

Show:

- exact applied decision count,
- concise outcome summary,
- any new items created after session boundary,
- links to Today and affected entities.

Copy:

`تصمیم‌های این مرور اعمال شدند.`

Do not say the entire current backlog is empty if newer facts exist.

## 6.11 Conflict state

Show:

`بعضی اطلاعات از زمان مرور تغییر کرده‌اند.`

Display:

- stale entities,
- changed values,
- preserved user decisions,
- invalidated warnings,
- refresh action.

Primary:

`به‌روزرسانی پیش‌نمایش`

After refresh:

- re-show differences,
- require re-confirmation,
- never auto-submit.

## 6.12 Failed state

Show:

`اعمال تصمیم‌ها کامل نشد.`

If transaction did not commit:

`هیچ تغییری اعمال نشد.`

Actions:

- retry when safe,
- return to review,
- continue manually.

Do not show mixed per-item success for atomic failure.

## 6.13 Idempotent retry

Retry with the same valid operation identity must not duplicate effects.

A terminal matching domain state may return no-op success.

The UI should show authoritative current state, not a misleading duplicate-action error.

## 6.14 Review & Apply states

Required states:

- Review
- Warning Acknowledgement Required
- Applying
- Success
- Conflict
- Failed
- Session Expired
- Offline
- New Items After Boundary

---

# 7. Shared Failure and Degraded Behavior

## 7.1 Deterministic Reconcile failure

If deterministic fact generation fails:

- show Reconcile unavailable,
- do not replace facts with free-form AI summary,
- preserve Today and manual entity access.

Copy:

`مرور برنامه موقتاً در دسترس نیست.`

## 7.2 AI explanation failure

Keep deterministic facts and actions available.

Copy:

`توضیح پیشنهادی در دسترس نیست.`

Do not disable the session.

## 7.3 Offline

Existing session data may remain visible.

Disable canonical mutation.

Do not claim offline queueing.

## 7.4 Expired session

Show:

`این مرور دیگر بر اساس وضعیت فعلی معتبر نیست.`

Action:

`ساخت مرور جدید`

Do not apply stale decisions.

## 7.5 Safety and restricted domains

Reconcile must not infer or provide:

- diagnosis,
- treatment,
- legal advice,
- investment decisions,
- debt-priority judgment,
- psychological profiling.

Safe organization of user-provided facts may remain available within approved boundaries.

Crisis content must not leak into:

- recommendation,
- explanation,
- confirmation,
- mutation.

---

# 8. Responsive Rules

## 8.1 Desktop

- Persistent Sidebar.
- Readable central content width.
- Optional side panel for session progress.
- Avoid dashboard mosaics.
- Keep evidence and action hierarchy explicit.
- Use large focused Review & Apply surface rather than a small modal.

## 8.2 Mobile

- One-column layout.
- Bottom Navigation remains available outside focused review/apply flows.
- Session secondary actions use Bottom Sheets.
- One metadata line per compact item where possible.
- Facts and consequences may expand progressively.
- Touch targets at least 44×44px.
- Sticky Apply actions respect safe area.
- Do not compress desktop side panels into narrow cards.

---

# 9. Accessibility Contract

Required:

- correct RTL reading order,
- visible focus,
- lane, fact, rule, and AI labels announced,
- severity communicated with text,
- protected exclusions not communicated only by color,
- group/chunk progress announced without excessive repetition,
- recommendation actions have explicit accessible names,
- warning changes announced,
- modal, Drawer, and Bottom Sheet focus trapping,
- conflict difference rows understandable without color,
- sticky controls do not hide focused content,
- screen-reader distinction between Accepted and Applied.

---

# 10. Component Inventory

Expected reusable component families:

- Reconcile Severity Summary
- Reconcile Lane Card
- Reconcile Category Row
- Blocking Conflict Notice
- Session Progress Header
- Fact Block
- Rule Match Block
- AI Explanation Block
- Recommendation Card
- Affected Entity Row
- Allowed Action Selector
- Protected Exclusion Row
- Consequence Summary
- Parent Empty Warning
- Goal Continuation Card
- Review Checkpoint Card
- Bulk Group Selector
- Decision Review Row
- Warning Acknowledgement Row
- Atomicity Notice
- Conflict Difference Row
- Command Result Summary
- Reconcile Empty State
- AI Availability Banner

Missing reusable components must be created in `02 — Components` under the existing automatic component-resolution rule.

Components must not create new product semantics.

---

# 11. Figma File Organization

Inside `12 — Reconcile`:

```txt
Desktop Screens
Mobile Screens
States
Overlays
Session Components
Review & Apply Components
Prototype Notes
Trust Notes
Safety Notes
Design Notes
```

Required active frames:

```txt
Reconcile Overview / Desktop / Default
Reconcile Overview / Mobile / Default

Reconcile Session / Desktop / Recommendation Ready
Reconcile Session / Mobile / Recommendation Ready

Reconcile Review & Apply / Desktop / Review
Reconcile Review & Apply / Mobile / Review
```

Do not create separate Figma Pages for individual states.

---

# 12. Prototype Flow

```txt
Today or Navigation
→ Reconcile Overview
→ Start Review
→ Reconcile Session
→ Resolve or edit groups
→ Reconcile Review & Apply
→ Applying
→ Success / Conflict / Failed
```

Alternative paths:

```txt
Overview
→ Skip
→ Today
```

```txt
Session
→ AI Failed
→ Facts Only / Manual Mode
```

```txt
Review & Apply
→ Conflict
→ Refresh Preview
→ Re-confirm
```

```txt
Goal Continuation
→ Continue / Review Later / Abandon Goal flow
```

---

# 13. Product Copy Rules

Use:

- `مرور برنامه`
- `نیاز به تصمیم`
- `نیاز به بازبینی`
- `واقعیت ثبت‌شده`
- `قانون محصول`
- `توضیح پیشنهادی`
- `اعمال تصمیم‌ها`
- `این موارد هنوز اعمال نشده‌اند`

Avoid:

- `شکست خوردی`
- `عقب افتادی`
- `بهره‌وری پایین`
- `انگیزه نداری`
- `برنامه خراب شده`
- `AI تشخیص داده`
- `بهترین تصمیم`
- `تأیید شد` when only confirmation was submitted

---

# 14. Validation Scenarios

The Figma and frontend implementation must support at least these scenarios.

## Scenario A — One recent overdue Task

- Reconcile eligible.
- LIGHT presentation.
- Deterministic quick action.
- No AI explanation required.
- Today remains available.

## Scenario B — Repeated Carry

- Exact Carry evidence shown.
- R1 allowed actions only.
- No motivation inference.

## Scenario C — Review checkpoints only

- Commitment-review lane shown.
- Execution severity does not rise.
- Checkpoints grouped and chunked.

## Scenario D — Goal continuation

- Fixed neutral wording.
- Only three allowed actions.
- No abandonment recommendation.

## Scenario E — Bulk Drop leaves Project empty

- Parent-empty consequence shown.
- Project remains ACTIVE.
- Explicit confirmation required.

## Scenario F — Protected item inside group

- Item excluded from destructive bulk action.
- Reason visible.
- No silent skip.

## Scenario G — AI explanation unavailable

- Facts and rules remain usable.
- Manual mode remains complete.

## Scenario H — Conflict before commit

- No mutation applied.
- User decisions preserved.
- Preview refreshed.
- Re-confirmation required.

## Scenario I — New facts after session boundary

- Completed evaluated snapshot remains valid.
- New item count shown separately.
- Product does not claim global zero backlog.

## Scenario J — Recovery severity

- Chunked review.
- Neutral language.
- Today remains available.
- Skip remains available.

---

# 15. Open Review Questions for Claude

Claude should review only for:

- contradiction with Discussions 016–021,
- missing user-visible state,
- incorrect lane ownership,
- action not present in the accepted rule catalog,
- hidden AI authority,
- confirmation/success ambiguity,
- unsafe bulk semantics,
- stale-session or conflict gap,
- missing protection consequence,
- mobile density or accessibility failure,
- smallest coherent correction.

Claude should not redesign Reconcile from zero or reduce accepted MVP scope merely to simplify implementation.

---

# 16. Acceptance Gate

This specification can move to `APPROVED_FOR_FIGMA_PROMPTS` only when:

- Claude reports no Blocking finding,
- every Important finding is resolved,
- Overview, Session, and Review & Apply remain distinct,
- execution and commitment lanes remain distinct,
- facts/rules/AI labels remain distinct,
- skip remains non-resolution,
- Today remains non-blocked,
- command success remains authoritative,
- bulk remains all-or-nothing,
- conflict forces refresh and re-confirmation,
- safety and privacy boundaries remain intact.
