# Component Catalogue

The shared building blocks and when to use each. Shared components live in [`frontend/src/shared/ui`](../../frontend/src/shared/ui) and own visual and interaction semantics only; entity rules, copy and data stay in features. Style classes named below are defined in [`index.css`](../../frontend/src/index.css).

Reuse order: existing component → extend it → small feature component → new shared component only after real repetition.

## Actions

| Element | Class / component | Use |
|---|---|---|
| primary button | `.primary-button` | the single main action of a page, sheet or dialog: an ink (moonlight at night) 48px button |
| secondary button | `.secondary-button` | alternative or cancel actions; "load more" |
| danger button | `.danger-button` | the confirming button of a destructive dialog: a tinted fill, never solid red |
| ghost button | `.ghost-button` | low-emphasis actions such as back, resend |
| icon button | `.icon-button` | icon-only control; always give it an `aria-label` |
| text link | `.text-link` | navigation inside text or a fact value |

Never put two primary buttons on one screen. A terminal or destructive action never sits beside its opposite as an equal: the positive one leads, the other is a quiet ghost below it.

## Structure

| Component | Use |
|---|---|
| `PageHeader` | top of a primary page: title, description, one action and, below desktop, the account button |
| `BackLink` | top of a detail page: the way back to its list, the page's own small `actions` (such as the edit pencil) and, below desktop, the account button |
| `.card` | a static surface lifted by shadow, without an outline |
| `PhotoHero` | the header of a page drawn on the photograph (Today, Goals, Projects): the photograph under a dark veil, the white Naskh title and a line under it, the account button (below desktop) and the page action (desktop) as frosted glass, an optional row under the title (`below`) and its foot (`children`). Sticky; collapses to a band on scroll down. See layout-and-navigation |
| `StructureSwitch` | the Goals/Projects switch on the photograph: two tabs with their active counts; the current one is solid |
| `.goal-card` (`GoalCard`, `ProjectCard`) | a Goal or Project in its list, washed in its colour: its tile (solid for a Goal, a tint for a Project), title as a stretched link, meaning, `.count-chip`s (Goal) or open counts (Project), `ProgressBar` and target. A Project card ends with its next open Task, completed from its ring. `data-closed` fades finished items |
| `ProgressBar`, `TargetNote`, `ReviewNote` | «X از Y کار انجام شد» over a bar in the item's colour (`large` on a detail page); a target date as a date, or days left in the caution colour within two weeks; the next review, or that it is due |
| `.progress-card`, `.meaning-line` | on a Goal or Project page: how far it has come, washed in its colour; what it means, set off by a rule in its colour |
| `NextSteps`, `UnderRow` | a Goal's or Project's next open Tasks as a short timeline (ring, or a lock while waiting); one row of what is under it: a count, a few names and the list it lives in |
| `.positive-button` | the quiet positive answer at the foot of a Goal or Project («به این هدف رسیدم», «این پروژه تمام شد») |
| `.add-row` | a dashed row that adds one more item in place («کار جدید در این پروژه») |
| `.glass-card`, `.glass-chip`, `.glass-button`, `.glass-close` | a frosted card on the photograph: an icon tile, a title, chips (`data-tone="warm"` for age), a 44px arrow link and a small corner close with a full-size target |
| `.flow-bar`, `.flow-footer` | a focused step's top (the way back at the start, a close or the manual path at the end) and its decision kept at the bottom edge |
| `.question-card`, `.answer-chip` | one clarification question (number, text, reason) and its answers: options as toggle buttons (`aria-pressed`, ink when chosen), «چیز دیگر…» dashed (`data-other`) opening a text field; `.answer-progress` counts answered questions |
| `.plan-goal`, `.plan-project`, `.plan-group`, `.plan-head`, `.plan-row`, `.plan-check`, `.plan-issue` | the draft's proposed tree: a Goal washed in its colour holds its Projects and a «مستقیم زیر این هدف» group, a Project its rows; each item has its include switch in its entity colour and its edit; a blocking reason is a tinted line with «اصلاح» beside it; `data-excluded` fades and strikes through |
| `.count-tile` | a total per entity in its tint (draft and confirmation) |
| `.plan-day`, `.plan-bar` | «هفت روز پیش رو»: a column per day, a bar per dated Task or Routine slot in its colour |
| `.fact-chip` | a planning detail offered for later: a sun chip while kept (`aria-pressed="true"`), dashed when let go |
| `.apply-goal`, `.apply-box` | the confirmation's read-only tree |
| `.ai-feedback` | the optional satisfaction prompt, in the moonstone's light |
| `.state-panel` | the panel behind `EmptyState`, `ErrorState` (`data-tone="attention"`) and the "building draft" state |
| `.timeline`, `.timeline-row`, `.timeline-node`, `.timeline-mark`, `.timeline-card` | a list as a timeline (Today, Tasks, a Task's sequence): each row has a 28px node on the start side joined to the next by a line, and a card. The card's title is a `.stretched-link` that covers the card under its own controls; `data-state="done"` fades it with the title struck through, `"waiting"` fades its content on an opaque card. `.timeline-page` runs one line behind several groups, each opened by a `.timeline-head` dot, label and `.count-pill` |
| `.ring-button` / `.ring-done` / `.ring-lock` / `.ring-planned` / `.ring-routine` | timeline nodes: completing a Task (a 24px ring in the Task colour in a 44px target), done (where it can act, `.ring-done` sits inside `.ring-button` and pressing it undoes the completion, «لغو انجام: …»; in the Tasks list only for a completion of the last seven days, `doneInLastWeek`), waiting for an earlier step, planned for a later day, a Routine's planet. A done Routine slot (`.slot-pill`, `.slot-tile`) is likewise a button that undoes it |
| `.drag-handle` | the grip an open step of a sequence is dragged by on the Task page (pointer only, `touch-action: none`); the drop opens the sequence preview, and «زودتر» / «دیرتر» are the same move without dragging |
| `SwipeActions` | a Today row's hidden actions: below 768px the card is dragged toward the end side over a tray of `.swipe-action` tiles (`data-tone="task"` or `"danger"`); from 768px its "more" button opens them under the card. A drag never ends in a tap, and a tap on an open card closes it |
| `TaskParent` / `TaskNote` | where a Task or Routine belongs, in its owner's colour (or «مستقل»); the one fact beside a Task's title: how close its deadline is (caution within three days, attention once passed) or how many times it was moved |
| `RoutineWeekBars` | this week of a Routine: one bar per scheduled day filled by the share of its slots done (`everyDay` keeps a quiet place for the other days, so list rows line up); `weekProgress` counts the complete days |
| `RoutineMonth` | the last four weeks of a Routine as a Saturday-first calendar of `.month-day` cells: full, part, none (quiet grey, never red), later, today ringed |
| `.slot-pill` / `.slot-tile` | one of a Routine's slots today: a pill on Today, a tile on the Routine page; the open one is the button that completes it |
| `FactRow` in a `.fact-list` | one fact as a row of a facts card: icon tile and label, the value and a quieter line on the end side; `tone="caution"` tints the tile |
| `.complete-button` | a Task's one big action, complete, in the Task colour |
| `.parent-chip` | the owner of an item as a chip in the owner's colour, linking to it |
| `.notice` / `.notice-attention` | neutral context / a problem that needs attention |
| `.decision-card` | one item waiting for an answer (Reconcile): its title and chips, then a `.decision-bar`: a row of equal `.decision-button` tiles, icon over a short label. Tones: `done` (Task colour) and `today` (sun) for the two one-tap decisions, `danger`, `primary`; `aria-pressed` for a toggle such as «تک‌تک»; `data-suggested` rings the tile an AI recommendation points at, with a `.decision-spark` |
| `.decided-row`, `.decided-tile`, `.undo-button` | a decision applied on tap, kept in its group: what happened and «بازگردان» while it can be undone |
| `.review-card`, `.capture-card` | a due Goal or Project washed in its colour (continuing is its tinted tile); a quick capture on the sun |
| `LaneHeading`, `.lane-tile`, `.lane-owner` | a Reconcile lane's heading: icon tile, name and count, one line of what to do; an owner's name in its colour above its cards |
| `.ai-question` | the optional AI explanation of a session: a dashed moonstone card |
| `ReviewApplyDialog` | Review & Apply as a bottom sheet: the action and its date in the title, «یک‌جا… یا هیچ‌کدام», each Task with its old date struck through and the new one, and «تأیید و {verb} N کار» |
| `DateLeaf` | a planned date as a small calendar leaf (day over month), coloured by `when`; used by Task rows and Reconcile |
| `Calendar` | a Jalali month grid, Saturday first, ISO values in and out; days before `min` are disabled, and a day can carry a deadline mark and a count of what is planned on it. `DateField` and the Carry sheet use it |
| `DayChoice` | when something is for, as one-press chips: today, tomorrow, a picked day (opens the calendar) and, where allowed, none |
| `ParentChoice` | the owner of a new item as chips: the first two active Projects and Goals, the chosen one, standalone, and a search button that opens the full `TaskParentSelect` |
| `SegmentedControl` | 2–4 mutually exclusive view filters; `statusFilterOptions` is the standard active/all pair |

Lists are semantic `ul`/`li`. A card or row that navigates is one link wrapping its content, with the title as a heading inside it.

## Identity and status

| Component | Use |
|---|---|
| `EntityLabel` | chip naming the entity kind (icon + word), on detail pages |
| `EntityIcon` | decorative entity icon tile at the start of cards, rows and menu choices |
| `StatusBadge` | lifecycle status; `active`, `positive` (achieved/completed) and `neutral` tones |

Entity identity and lifecycle status are separate elements and are never merged into one colour.

## Forms

| Component | Use |
|---|---|
| `FormField` | labelled text input or textarea bound to React Hook Form; `autoFocus` marks the field its sheet starts in; `prominent` draws the form's title field as the design's Naskh question over an underlined line; a textarea grows with its content |
| `SelectField` | single choice from a list: a field-styled trigger with a searchable options panel floating under it (type to narrow, arrows, Enter, Escape). Options may carry an icon and a group heading. Bind with `Controller`. Use it instead of a native `<select>` |
| `ChoiceField` | two to four mutually exclusive choices as chips (`role="radio"`), such as a Routine's recurrence. Bind with `Controller` |
| `SwitchField` | an on/off setting with a one-line explanation; a checkbox drawn as a switch |
| `MoreFields` | the "جزئیات بیشتر" disclosure that holds a form's optional fields. Hidden fields keep their values; pass `forceOpen` when one of them has an error and `defaultOpen` when editing an item that already uses them |
| `DateField` | Jalali date picker; value is the ISO Gregorian string, `''` for none. Bind with `Controller` |
| checkbox | every `<input type="checkbox">` is restyled globally in `index.css` (rounded square, accent fill, `on-accent` tick in both themes); size it with `size-5`. `SwitchField` hides its input and draws a switch instead |
| `ValidationSummary` | all client-side messages, above the fields |
| `FormError` | a failed command; offers a reload on a stale-version conflict |
| `.form-stack`, `.form-grid` | vertical field rhythm; two columns from `sm` |
| `.sheet-actions` | the pinned cancel + submit row at the end of a sheet form |

Each entity has one form component (`GoalForm`, `ProjectForm`, `TaskForm`, `RoutineForm`) that serves both create and edit; passing the entity switches it to edit mode. Forms render as the body of a `Sheet` and do not draw their own card or title.

A create form shows only what is needed to save, title first, focused and `prominent`, and puts everything optional in `MoreFields`. A label ending in "(اختیاری)" is passed as one string; `LabelText` sets that ending quieter without changing the label's accessible name. Hints sit under the field. Chips for a few choices or shortcuts use `.choice-chip`: a pill outline that fills with the sun tint when chosen, or with the item's own colour inside a sheet that makes one kind of item.

The quick create forms (New Task, New Routine) ask a question as the title label («چه کاری باید انجام شود؟», «چه کاری تکرار می‌شود؟»), then give the day (`DayChoice`, starting at today) and the owner (`ParentChoice`) as chips, so a title alone is enough to save. Under «جزئیات بیشتر», New Task offers «بعد از «…»» for an active Task of the same owner. The server's preview of the order is shown under it («ترتیب بعد از ساخت», the new Task by its typed title), and the Task is created already in that order in the same request (`follow`), or not at all (029 §9.2). A choice that no longer matches the chosen owner is not sent. Edit forms keep the plain fields.

`DateField` expands its calendar inline rather than floating, so it is never clipped inside a scrolling sheet. Each day button carries `data-date` with its ISO date for tests.

## Overlays

| Component | Use |
|---|---|
| `Sheet` | create/edit flows: bottom sheet on phones, side panel from 768px. `entity` puts that kind's icon before the title and its colour on the title line and the chosen chips |
| `ConfirmationDialog` | one explicit decision. Title and close button on top, body, then `.dialog-actions`: a tinted bar that stacks the buttons on a phone and lines them up from 640px |
| `TerminalDialog` | the Goal/Project terminal confirmation (`CodeGoalTerminal`): the item, then either the active children standing in the way, each named with «باز کن» to its page and only «باشه، بعداً», or what confirming means a line each, the Routines it will stop by name, and the confirm button |
| `Toaster` + `showToast` | confirmed success messages |

All three modal surfaces share [`useModal`](../../frontend/src/shared/lib/use-modal.ts): focus moves in, Tab is trapped, Escape closes unless an action is pending, the page behind stops scrolling, and focus returns to the trigger.

## States

| Component | Use |
|---|---|
| `LoadingState` | initial load: labelled skeleton rows shaped like a list row (tile and two lines) |
| `EmptyState` | icon, what is missing, and the one action that fills it |
| `ErrorState` | failure with a retry, or an exit link when retrying cannot help |
| `ResourceState` | the loading → error → empty → content ladder for list pages |
| `LoadMoreButton` | cursor pagination |

Background refetches keep the content on screen and show a small "updating" hint beside the filter.

## Shell components

In [`features/shell`](../../frontend/src/features/shell/components): `AppShell`, `Rail` (desktop), `TabBar` (phones, with the floating create button), `AccountButton`, `AccountPanel`, `CreateSheet`, and `Navigation` (the five places, `PlaceLink`, the Reconcile count). They compose features, so they live in a feature, not in `shared`.

`Stepper` ([`shared/ui/Stepper.tsx`](../../frontend/src/shared/ui/Stepper.tsx)) shows a fixed sequence of named steps (`aria-current="step"` on the current one, a tick on passed ones, every label shown; the connectors stretch to fill the row). It is the four-step planning flow (STEP-18): a step the model skipped shows as passed.

`Sheet` takes an `aside` beside its close button, for a mark such as «۴ از ۴».

## Cross-feature UI state

[`shared/lib/ui-store.ts`](../../frontend/src/shared/lib/ui-store.ts) (Zustand) holds only: whether the account panel is open, which create flow is open, and the toast queue. Server data stays in TanStack Query.
