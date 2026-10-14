# Layout and Navigation

How the application frame, navigation and pages are arranged at each screen size. Foundations are in [`design-system.md`](design-system.md); components in [`components.md`](components.md).

## The frame

The authenticated frame is [`features/shell`](../../frontend/src/features/shell/components/AppShell.tsx). It has **no top application bar**. The login screen is outside the frame. The reference is the design canvas "Adaptive Planner — Dawn", page «در کد — پیاده‌سازی» (`CodeDrawer`, `CodeCreateMenu`, the rail on every desktop board), adopted in STEP-15 on 2026-10-14.

| Width | Navigation | Create | Everything else |
|---|---|---|---|
| below 1024px (phone, tablet) | floating bottom **tab bar** (a dock) with the five places, Planning raised in the middle | a floating **create button** above the dock, at the inline-start edge | the **account button** in each page header opens the **account sheet** |
| 1024px and up (desktop) | an **icon rail** floating at the inline-start edge (the right, in RTL), plugged into the **page panel** | each page's own "new" action | the rail's account button opens the **account panel** beside the rail |

This is two layouts, not one scaled layout: the tab bar and the create button do not exist on desktop, and the rail and page panel do not exist on phones. The switch is in CSS (`.rail`, `.tabbar`, `.create-fab`, `.app-panel` in `index.css`), so only one navigation is ever exposed to assistive technology. Forms open as a **bottom sheet** below 768px and as a **side panel** from 768px.

- **Tab bar:** a 68px frosted dock (26px radius) floating 12px above the device safe-area inset, at most 448px wide, over a strip that fades the page into the canvas. The current tab has an ink label and a soft `accent-tint` pill behind its icon. Planning is a 56px moonstone tile raised out of the dock (`.tab-ai`), ringed when current. Today carries the Reconcile count in `moon`.
- **Create button:** a 56px ink square with 20px corners floating 16px above the dock at the thumb's edge. It opens the create menu. The page reserves `--tabbar-height` so content never ends behind the dock.
- **Rail:** a 76px rounded column (38px radius) on `surface`, vertically centred 20px from the screen edge, ringed by 8px of canvas so it reads as plugged into the page panel. From top: the brand mark, the five places, Operations for operators, and the account button, separated by hairlines. The current place is an ink tile. Planning is the moonstone tile with its slow halo. Today carries the Reconcile count in `sun`. Every icon names itself in a tooltip on hover and keyboard focus.
- **Page panel:** on desktop the page sits in one rounded panel (34px) on a tone between canvas and surface, 20px from the screen, with its inline-start edge under the rail.
- **Account panel:** who is signed in (initial or person, name or «حساب شما», phone number), then grouped rows: بازبینی (with its count), برنامه‌ریزی, پروژه‌ها (until STEP-17), عملیات (operators); ظاهر (خودکار / روشن / تیره) and حریم خصوصی و داده‌ها; خروج از این دستگاه and خروج از همه‌ی دستگاه‌ها. A bottom sheet on phones, a 352px panel beside the rail on desktop. It closes on navigation, Escape or a tap outside.
- **Offline banner:** appears at the top of the content area when the browser reports no connection.
- **Toasts:** bottom-centre above the tab bar on phones, bottom corner on desktop.

### Places

Defined once in [`Navigation.tsx`](../../frontend/src/features/shell/components/Navigation.tsx), in order of daily use: **Today → Tasks → Planning → Routines → Goals**, the same on the tab bar and the rail. The Goals place also stands for Projects (`also: ['/projects']`), as in the design, where the Goals page switches between the two. Until that switch is built (STEP-17), Projects are reached from the account panel.

Reconcile has no place of its own. It is offered from Today when something waits, its count sits on Today's icon, and the account panel links to it. Operations (STEP-11) is shown only to operator accounts: last on the rail, and in the account panel on phones. A new destination needs the same decision as Reconcile: a place (there are only five) or the account panel.

## Routes

| Route | Page | Width |
|---|---|---|
| `/` | redirects to `/today` | — |
| `/today` | Today: the **sky header** instead of `PageHeader` (below), a day strip (today and the nine days after it), a dismissible Reconcile alert under it when eligible, then the local date's Tasks, ready first, waiting below, then the date's Routines with a row per slot, each list one `.group-card` under a heading with its count. Each item is a `TodayCard` row: its only visible control is the complete button; details and "another day" are revealed by dragging the card left below 768px or by its three-dot button from 768px. Choosing a later day shows that day's planned active Tasks read-only | narrow |
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

### The Today sky

Today opens under a drawing of the day's sky ([`SkyHeader`](../../frontend/src/features/today/components/SkyHeader.tsx)): the account button, the Jalali date, the title «امروز» in Naskh and the page's action as frosted glass, over a sky whose colours follow the time of day (dawn 05:00–09:30, day to 16:00, dusk to 19:30, night) in the current theme. The sun sits on a dotted arc where it is now (the moon, at night); today's timed Routine occurrences are marked on the same arc at their hour, filled once done. The clock is the browser's, refreshed each minute: the pilot runs in one time zone. The drawing is one `role="img"` with a sentence for screen readers.

It is 300px tall and sticky. Scrolling down past 120px collapses it to a 150px band (it sticks with a negative `top` and slides its content into the band, so the page never jumps); scrolling up or reaching the top opens it again. On a phone it runs to the screen edges and under the safe-area inset; from 1024px it is a rounded panel in the page column.

## Page anatomy

Every primary page starts with `PageHeader` and follows the same order, so users always look in the same place:

1. **Header row** — page title, then on the opposite side the page's single primary action and, below desktop, the account button.
2. **Description** — one or two lines saying what this page is for.
3. **Filter** — a segmented control (lists default to "active").
4. **Content** — list, or the loading / error / empty state in its place.
5. **Load more** — centred, only when another page exists.

Detail pages start with `BackLink` instead, then:

1. **Identity** — entity chip and status badge, then the title, then the description, at the top of one `.detail-card` washed in the entity's colour.
2. **Facts** — icon + label + value terms in the same card, under a rule. Related entities are links.
3. **"What do you want to do?"** — action tiles, each with a one-line explanation. Shown only for the actions the current status allows.

## Creating and editing

There is **one create flow**, owned by the shell (`CreateSheet`) and opened through the UI store (`openCreate`). The floating create button opens a chooser: one card per kind (Task / Routine / Project / Goal) with its description and an example in the entity's colour, then a dashed card «نمی‌دانید از کجا شروع کنید؟» that goes to Planning. A page's own "new" button and its empty state open that page's form directly. Creating something therefore looks the same from everywhere.

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
3. If it is a primary destination, decide between one of the five places in `places` and a row in the account panel.
4. Cover the phone and desktop layouts in `frontend/e2e/responsive.spec.ts`.
