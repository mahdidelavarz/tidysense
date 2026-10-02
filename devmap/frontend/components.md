# Component Catalogue

The shared building blocks and when to use each. Shared components live in [`frontend/src/shared/ui`](../../frontend/src/shared/ui) and own visual and interaction semantics only; entity rules, copy and data stay in features. Style classes named below are defined in [`index.css`](../../frontend/src/index.css).

Reuse order: existing component → extend it → small feature component → new shared component only after real repetition.

## Actions

| Element | Class / component | Use |
|---|---|---|
| primary button | `.primary-button` | the single main action of a page, sheet or dialog |
| secondary button | `.secondary-button` | alternative or cancel actions; "load more" |
| danger button | `.danger-button` | the confirming button of a destructive dialog |
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
| `.card` | a static white surface (fact card) |
| `.card-link` | a whole-card link in a grid (Goal, Project) |
| `.row-link` | a whole-row link in a list (Task) |
| `.notice` / `.notice-attention` | neutral context / a problem that needs attention |
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
| `FormField` | labelled text input or textarea bound to React Hook Form |
| `DateField` | Jalali date picker; value is the ISO Gregorian string, `''` for none. Bind with `Controller` |
| `.field-input` on `<select>` | native select inside a `.field-label` |
| `ValidationSummary` | all client-side messages, above the fields |
| `FormError` | a failed command; offers a reload on a stale-version conflict |
| `.form-stack`, `.form-grid` | vertical field rhythm; two columns from `sm` |
| `.sheet-actions` | the pinned cancel + submit row at the end of a sheet form |

Each entity has one form component (`GoalForm`, `ProjectForm`, `TaskForm`) that serves both create and edit; passing the entity switches it to edit mode. Forms render as the body of a `Sheet` and do not draw their own card or title.

`DateField` expands its calendar inline rather than floating, so it is never clipped inside a scrolling sheet. Each day button carries `data-date` with its ISO date for tests.

## Overlays

| Component | Use |
|---|---|
| `Sheet` | create/edit flows: bottom sheet on phones, side panel from 768px |
| `ConfirmationDialog` | one explicit decision |
| `TerminalDialog` | the Goal/Project terminal confirmation with its blocker list |
| `Toaster` + `showToast` | confirmed success messages |

All three modal surfaces share [`useModal`](../../frontend/src/shared/lib/use-modal.ts): focus moves in, Tab is trapped, Escape closes unless an action is pending, the page behind stops scrolling, and focus returns to the trigger.

## States

| Component | Use |
|---|---|
| `LoadingState` | initial load: labelled skeleton shaped like the list |
| `EmptyState` | icon, what is missing, and the one action that fills it |
| `ErrorState` | failure with a retry, or an exit link when retrying cannot help |
| `ResourceState` | the loading → error → empty → content ladder for list pages |
| `LoadMoreButton` | cursor pagination |

Background refetches keep the content on screen and show a small "updating" hint beside the filter.

## Shell components

In [`features/shell`](../../frontend/src/features/shell/components): `AppShell`, `Sidebar`, `TabBar`, `NavDrawer`, `AccountMenu`, `CreateSheet`, and `Navigation` (the destination list and brand). They compose features, so they live in a feature, not in `shared`.

## Cross-feature UI state

[`shared/lib/ui-store.ts`](../../frontend/src/shared/lib/ui-store.ts) (Zustand) holds only: whether the drawer is open, which create flow is open, and the toast queue. Server data stays in TanStack Query.
