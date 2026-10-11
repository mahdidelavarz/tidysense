# Layout and Navigation

How the application frame, navigation and pages are arranged at each screen size. Foundations are in [`design-system.md`](design-system.md); components in [`components.md`](components.md).

## The frame

The authenticated frame is [`features/shell`](../../frontend/src/features/shell/components/AppShell.tsx). It has **no top application bar**. The login screen is outside the frame.

| Width | Navigation | Create | Overlays |
|---|---|---|---|
| below 1024px (phone, tablet) | floating bottom **tab bar** (a dock) with the four destinations; **menu button** in each page header opens the **drawer** | round button in the centre of the dock | forms open as a **bottom sheet** below 768px and as a **side panel** from 768px |
| 1024px and up (desktop) | fixed **sidebar** on the inline-start edge (the right, in RTL) | "افزودن" button at the top of the sidebar | forms open as a **side panel** on the inline-end edge |

This is two layouts, not one scaled layout: the tab bar, drawer and bottom sheet do not exist on desktop, and the sidebar does not exist on phones. The switch is in CSS (`.sidebar`, `.tabbar`, `.app-frame` in `index.css`), so only one navigation is ever exposed to assistive technology.

- **Sidebar:** a rounded panel floating 12px off the screen edge: brand, create button, destinations in groups (daily, review, structure, operations) separated by hairlines, and the account menu pinned to the bottom. The current destination has a tinted row and an accent marker on the panel edge. Panel width 272px; the list scrolls on short screens.
- **Tab bar:** a 64px rounded dock floating 12px above the device safe-area inset, at most 448px wide, over a strip that fades the page into the canvas. The current tab has a tinted pill behind its icon. The page reserves `--tabbar-height` so content never ends behind it.
- **Drawer:** a rounded panel floating 8px off the edges with the brand, the same grouped destinations and the account menu. It holds what the tab bar has no room for. It closes on navigation, Escape or a tap outside.
- **Account menu:** a card showing the signed-in phone number; pressing it opens a small menu above it with the privacy page, "sign out of this browser" and "sign out of all sessions". A press outside closes it.
- **Menu button:** `.menu-button`, a bordered surface square at the start of `PageHeader` and `BackLink`, shown only below 1024px.
- **Offline banner:** appears at the top of the content area when the browser reports no connection.
- **Toasts:** bottom-centre above the tab bar on phones, bottom corner on desktop.

### Destinations

Defined once in [`Navigation.tsx`](../../frontend/src/features/shell/components/Navigation.tsx), in order of daily use: **Today → Tasks → Routines → Reconcile → Planning → Projects → Goals**. Add a destination only when its product step ships. The tab bar holds at most four destinations plus create. Routines (STEP-06), Reconcile (STEP-07) and Planning (STEP-08) are marked `tab: false`: they live in the sidebar and drawer only, because Routines are executed from Today, Reconcile is offered from Today when there is something to decide, and Planning is an occasional flow that is also opened from a Goal or Project detail page. The Reconcile link carries one count badge for everything waiting in it. Any further destination needs the same decision: replace a tab, or stay out of the tab bar. A destination marked `operatorOnly` (Operations, STEP-11) is listed last and rendered only when the current user is an operator.

## Routes

| Route | Page | Width |
|---|---|---|
| `/` | redirects to `/today` | — |
| `/today` | Today: a day strip (today and the nine days after it), a dismissible Reconcile alert under it when eligible, then the local date's Tasks, ready first, waiting below, then the date's Routines with a row per slot. Each item is a `TodayCard`: its only visible control is the complete button; details and "another day" are revealed by dragging the card left below 768px or by its three-dot button from 768px. Choosing a later day shows that day's planned active Tasks read-only | narrow |
| `/reconcile` | Reconcile: a summary whose three counts jump to their lanes, the optional AI explanation, then the execution lane (owner → sequence → Task), commitment-review lane and capture lane. Every item is a decision card with its answers in a bar underneath; Review & Apply dialog | narrow |
| `/planning` | Planning: intention input, progress, draft review (hierarchy, seven-day view, planning details), final confirmation dialog, result. `?goalId=` or `?projectId=` plans inside that parent | narrow |
| `/tasks`, `/tasks/$taskId` | Task list grouped by when each Task is planned (today, earlier days, tomorrow, later days, undated, closed), Task detail | narrow |
| `/routines`, `/routines/$routineId` | Routine list (each row draws its week as seven dots, with its times and parent), Routine detail with occurrence history | narrow |
| `/projects`, `/projects/$projectId` | Project card grid (parent Goal, target date, review date or "review is due"), Project detail | wide list, narrow detail |
| `/goals`, `/goals/$goalId` | Goal card grid (target date, review date or "review is due", active Project count), Goal detail | wide list, narrow detail |
| `/operations` | operator accounts only: alerts and maintenance, AI runtime, H1/H2 tables (numerator and denominator columns). Read-only. Anyone else sees the not-found state | wide |
| `/first-entry` | first sign-in: an intention input with example prompts that hands its text to `/planning` (as history state, prefilling the form), then manual Task / Goal / Routine choices that open the create flow, and a link to Today. From 1280px a second column shows a static sample proposal | full width, two columns from 1280px |
| `/login` | two-step OTP sign-in (outside the frame): a gradient brand panel and the form in a white card, which rises over the brand band on a phone | split on desktop |
| anything else | not-found state with a link to Today | narrow |

`.page` is the narrow container (768px max) for reading and single-column lists; `.page-wide` (1024px max) is for two-column card grids.

## Page anatomy

Every primary page starts with `PageHeader` and follows the same order, so users always look in the same place:

1. **Header row** — menu button (below desktop), page title, and the page's single primary action on the opposite side.
2. **Description** — one or two lines saying what this page is for.
3. **Filter** — a segmented control (lists default to "active").
4. **Content** — list, or the loading / error / empty state in its place.
5. **Load more** — centred, only when another page exists.

Detail pages start with `BackLink` instead, then:

1. **Identity** — entity chip and status badge, then the title, then the description, at the top of one `.detail-card` washed in the entity's colour.
2. **Facts** — icon + label + value terms in the same card, under a rule. Related entities are links.
3. **"What do you want to do?"** — action tiles, each with a one-line explanation. Shown only for the actions the current status allows.

## Creating and editing

There is **one create flow**, owned by the shell (`CreateSheet`) and opened through the UI store (`openCreate`). The tab-bar button and the sidebar button open a chooser (Task / Routine / Project / Goal); a page's own "new" button and its empty state open that page's form directly. Creating something therefore looks the same from everywhere.

| Need | Use |
|---|---|
| create or edit an entity (several fields) | `Sheet` |
| confirm one consequential decision (drop, complete, abandon) | `ConfirmationDialog` / `TerminalDialog` |
| report a confirmed success | toast (`showToast`), only after the server responded |
| report a failure | `FormError` in place, next to what failed |

A sheet keeps its submit row pinned to the bottom while the fields scroll. A pending submit locks the sheet: it cannot be dismissed until the server answers.

## Adding a page

1. Add the file route under `frontend/src/routes`. Stop the dev server first, or check the file afterwards: the router plugin scaffolds a placeholder into route files it sees appear while running.
2. Compose it from `PageHeader` or `BackLink`, a `.page` container and existing components.
3. If it is a primary destination, add it to `destinations` and decide its tab-bar placement.
4. Cover the phone and desktop layouts in `frontend/e2e/responsive.spec.ts`.
