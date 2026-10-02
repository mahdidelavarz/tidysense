# Layout and Navigation

How the application frame, navigation and pages are arranged at each screen size. Foundations are in [`design-system.md`](design-system.md); components in [`components.md`](components.md).

## The frame

The authenticated frame is [`features/shell`](../../frontend/src/features/shell/components/AppShell.tsx). It has **no top application bar**. The login screen is outside the frame.

| Width | Navigation | Create | Overlays |
|---|---|---|---|
| below 1024px (phone, tablet) | bottom **tab bar** with the four destinations; **menu button** in each page header opens the **drawer** | raised round button in the centre of the tab bar | forms open as a **bottom sheet** below 768px and as a **side panel** from 768px |
| 1024px and up (desktop) | fixed **sidebar** on the inline-start edge (the right, in RTL) | "افزودن" button at the top of the sidebar | forms open as a **side panel** on the inline-end edge |

This is two layouts, not one scaled layout: the tab bar, drawer and bottom sheet do not exist on desktop, and the sidebar does not exist on phones. The switch is in CSS (`.sidebar`, `.tabbar`, `.app-frame` in `index.css`), so only one navigation is ever exposed to assistive technology.

- **Sidebar:** brand, create button, destinations, and the account menu pinned to the bottom. Width 272px.
- **Tab bar:** 68px plus the device safe-area inset. The page reserves that space so content never hides behind it.
- **Drawer:** brand, destinations and the account menu. It holds what the tab bar has no room for. It closes on navigation, Escape or a tap outside.
- **Account menu:** shows the signed-in phone number and expands to "sign out of this browser" and "sign out of all sessions".
- **Offline banner:** appears at the top of the content area when the browser reports no connection.
- **Toasts:** bottom-centre above the tab bar on phones, bottom corner on desktop.

### Destinations

Defined once in [`Navigation.tsx`](../../frontend/src/features/shell/components/Navigation.tsx), in order of daily use: **Today → Tasks → Routines → Projects → Goals**. Add a destination only when its product step ships. The tab bar holds at most four destinations plus create. Routines (STEP-06) is marked `tab: false`: it lives in the sidebar and drawer only, because Routines are executed from Today. Any further destination needs the same decision: replace a tab, or stay out of the tab bar.

## Routes

| Route | Page | Width |
|---|---|---|
| `/` | redirects to `/today` | — |
| `/today` | Today: tasks for the local date, ready first, waiting below, then the date's Routines with a row per slot | narrow |
| `/tasks`, `/tasks/$taskId` | Task list, Task detail | narrow |
| `/routines`, `/routines/$routineId` | Routine list, Routine detail with occurrence history | narrow |
| `/projects`, `/projects/$projectId` | Project list, Project detail | wide list, narrow detail |
| `/goals`, `/goals/$goalId` | Goal list, Goal detail | wide list, narrow detail |
| `/first-entry` | welcome after first sign-in | narrow |
| `/login` | two-step OTP sign-in (outside the frame) | split on desktop |
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

1. **Identity** — entity chip and status badge, then the title, then the description.
2. **Facts** — one card of icon + label + value terms. Related entities are links.
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
