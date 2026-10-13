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
| action tile | `ActionTile` | the actions of a detail page: icon, label, one-line explanation; tones `neutral`, `positive`, `attention` |

The label of an `ActionTile` is its accessible name; the explanation is its description. Never put two primary buttons on one screen.

## Structure

| Component | Use |
|---|---|
| `PageHeader` | top of a primary page: menu button, title, description, one action |
| `BackLink` | top of a detail page: menu button and the way back to its list |
| `.card` | a static surface lifted by shadow, without an outline |
| `.group-card` | a grouped list (Today): one surface whose direct children are rows divided by hairlines |
| `SkyHeader` (Today) | the Today page's header: the live sky, title, date, menu button and the page action as frosted `.sky-action`. See layout-and-navigation |
| `.detail-card` | the top of a detail page: identity (chips, title, description) in the entity's corner wash, then `.detail-facts`, the `<dl>` of `DetailTerm`s, under a rule. Takes `entity-goal`, `entity-project`, `entity-task` or `entity-routine` |
| `.proposal-card` | a proposed item in a planning draft, in its entity's corner wash, with its include switch and edit button in a bar underneath; `data-excluded` drops the wash |
| `.state-panel` | the panel behind `EmptyState`, `ErrorState` (`data-tone="attention"`) and the "building draft" state |
| `.entity-card` | a whole-card link in a grid (Goal, Project), with `entity-goal` or `entity-project` for its corner wash; `data-closed` drops the wash for finished work |
| `.list-row` | a whole-row link in a list. A Routine row draws its week as seven `.week-dot`s; a Task row starts with a `.date-leaf` (planned day and month, or how the Task ended) at the start, the title, then `.meta-chip`s for its parent, a blocked sequence and protection |
| `.notice` / `.notice-attention` | neutral context / a problem that needs attention |
| `.check-button` / `.check-done` | completing an item: an empty 28px ring in a 44px target that warms to `sun` on hover / the sun-filled ring with an `on-sun` tick for a done item |
| `.routine-tile` | the Routine's orbit icon in its tint at the start of a Routine row |
| `.decision-card` | one item waiting for an answer (Reconcile): what it is on top (`.decision-head`, `.decision-title`), then a `.decision-bar` of `.decision-button`s, one per possible answer; tones `primary`, `positive`, `danger`. Below 640px the bar is one compact row with the icon over an 11px label; from 640px the answers are ordinary buttons |
| `.lane` | a part of a page with its own kind of decision: a rule above, a `.lane-title` with a `.lane-count`, a `.lane-hint`, and `.lane-owner` pills naming the Goal or Project its cards belong to |
| `DateLeaf` | a planned date as a small calendar leaf (day over month), coloured by `when`; used by Task rows and Reconcile |
| `DetailTerm` | one icon + label + value fact inside a `<dl>` |
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

A create form shows only what is needed to save, title first, focused and `prominent`, and puts everything optional in `MoreFields`. A label ending in "(اختیاری)" is passed as one string; `LabelText` sets that ending quieter without changing the label's accessible name. Hints sit under the field. Chips for a few choices or shortcuts use `.choice-chip`: a pill outline that fills with the sun tint when chosen.

`DateField` expands its calendar inline rather than floating, so it is never clipped inside a scrolling sheet. Each day button carries `data-date` with its ISO date for tests.

## Overlays

| Component | Use |
|---|---|
| `Sheet` | create/edit flows: bottom sheet on phones, side panel from 768px |
| `ConfirmationDialog` | one explicit decision. Title and close button on top, body, then `.dialog-actions`: a tinted bar that stacks the buttons on a phone and lines them up from 640px |
| `TerminalDialog` | the Goal/Project terminal confirmation with its blocker list |
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

In [`features/shell`](../../frontend/src/features/shell/components): `AppShell`, `Sidebar`, `TabBar`, `NavDrawer`, `AccountMenu`, `CreateSheet`, and `Navigation` (the destination list and brand). They compose features, so they live in a feature, not in `shared`.

## Cross-feature UI state

[`shared/lib/ui-store.ts`](../../frontend/src/shared/lib/ui-store.ts) (Zustand) holds only: whether the drawer is open, which create flow is open, and the toast queue. Server data stays in TanStack Query.
