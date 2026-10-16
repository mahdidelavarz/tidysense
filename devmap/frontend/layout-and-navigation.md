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
- **Create button:** a 48px ink square with 17px corners floating 16px above the dock at the thumb's edge. It opens the create menu. The page reserves `--tabbar-height` plus room for the button, so the last item can scroll clear of both.
- **Rail:** a 76px rounded column (38px radius) on `surface`, vertically centred 20px from the screen edge, ringed by 8px of canvas so it reads as plugged into the page panel. From top: the brand mark, the five places, Operations for operators, and the account button, separated by hairlines. The current place is an ink tile. Planning is the moonstone tile with its slow halo. Today carries the Reconcile count in `sun`. Every icon names itself in a tooltip on hover and keyboard focus.
- **Page panel:** on desktop the page sits in one rounded panel (34px) on a tone between canvas and surface, 20px from the screen, with its inline-start edge under the rail.
- **Account panel:** who is signed in (initial or person, name or «حساب شما», phone number), then grouped rows: بازبینی (with its count), برنامه‌ریزی, عملیات (operators); ظاهر (خودکار / روشن / تیره) and حریم خصوصی و داده‌ها; خروج از این دستگاه and خروج از همه‌ی دستگاه‌ها. A bottom sheet on phones, a 352px panel beside the rail on desktop. It closes on navigation, Escape or a tap outside.
- **Offline banner:** appears at the top of the content area when the browser reports no connection.
- **Toasts:** bottom-centre above the tab bar on phones, bottom corner on desktop.

### Places

Defined once in [`Navigation.tsx`](../../frontend/src/features/shell/components/Navigation.tsx), in order of daily use: **Today → Tasks → Planning → Routines → Goals**, the same on the tab bar and the rail. The Goals place also stands for Projects (`also: ['/projects']`), as in the design: both pages carry `StructureSwitch` under their photograph («هدف‌ها ۳ | پروژه‌ها ۵», active counts), so Projects are reached from Goals and the Goals place stays current on both.

Reconcile has no place of its own. It is offered from Today when something waits, its count sits on Today's icon, and the account panel links to it. Operations (STEP-11) is shown only to operator accounts: last on the rail, and in the account panel on phones. A new destination needs the same decision as Reconcile: a place (there are only five) or the account panel.

## Routes

| Route | Page | Width |
|---|---|---|
| `/` | redirects to `/today` | — |
| `/today` | Today: the **hero** instead of `PageHeader` (below) with the Reconcile offer at its foot when eligible, the day wheel (the three days before today as context, today and the nine days after it), then «کارهای امروز» as a timeline (ready, waiting, then those already done today, read-only) and «روتین‌های امروز» (each Routine's schedule, this week's bars and a pill per slot). A Task completes from its ring and opens from its card; «روز دیگر» and «کنار بگذار» are revealed by dragging the card toward the end side below 768px or by its "more" button from 768px; dropping asks for confirmation. Choosing a later day shows that day's planned active Tasks, which can be moved or dropped | narrow |
| `/reconcile` | Reconcile: a progress card («N تصمیم مانده، از M», the size, and that «امروز» stays open), the optional AI explanation («چرا این‌ها اینجا هستند؟»), then «کارهای عقب‌افتاده» (owner → sequence → Task), «مرور هدف و پروژه» and «یادداشت‌های سریع», and «پایان بازبینی». Every item is a card with a row of tiles: on a Task «انجام شد» and «امروز» apply on the tap and leave a row with «بازگردان» in place (which takes the focus) until the session closes; «جابه‌جا»، «بماند» and «کنار بگذار», a sequence's «هر دو جابه‌جا»، «تک‌تک»، «هر دو کنار», and every review decision go through Review & Apply, a bottom sheet with the server's preview. An AI recommendation rings the tile it points at | narrow |
| `/planning` | Planning in four steps, the same on every entry (028 §3), with the `Stepper` on top: **نوشتن** (the intention card, «دربارهٔ چیزی که از قبل دارید؟» as none or one active Goal or Project, «N نکته در یادم مانده» once one is chosen, «یا خودم دستی می‌سازم»); **پرسش‌ها** (up to three questions with options, «چیز دیگر…», a reason line, a progress line, «پیش‌نویس را بساز» and «بدون پاسخ بساز»; shown as passed when the model asked nothing); **مرور** (summary with the intention quoted, totals, the Goal → Project → Task tree, «هفت روز پیش رو», «برای دفعه‌های بعد یادم بماند؟», and a footer whose button leads to the first item to fix while one blocks); **تأیید** (a sheet with «۴ از ۴»: the server's preview as the same tree and «تأیید و ساخت N مورد»). Steps two and three show «ویرایش نوشته» and «خودم دستی می‌سازم» instead of the page header. `?goalId=` or `?projectId=` preselects that parent | narrow |
| `/tasks`, `/tasks/$taskId` | Task list as one timeline grouped by when each Task is planned (today, earlier days, tomorrow, later days, undated, closed); each row completes from its ring and opens from its card; the status filter is behind the filter button. Task detail: owner chip, a big complete button and a move button, a facts card, the sequence with this step marked, a grip to drag each open step to another place, and «زودتر», «دیرتر», «بیرون از ترتیب» (or «بعد از…» for an active Task with none), each through a sheet that shows the server's preview, notes, drop at the foot | narrow |
| `/routines`, `/routines/$routineId` | Routine list: active Routines split by whether they have slots today, each with its schedule, this week's bars, its owner and next open slot; stopped Routines folded at the foot. Routine detail: today's slots (completed or corrected here), the last four weeks as a calendar, facts, history; stop or resume at the foot | narrow |
| `/goals`, `/goals/$goalId` | Goals under the photograph with the switch and, when one is due or nearest, a frosted review card; active Goals as `.goal-card`s (meaning, Task progress, target date, Projects/Tasks/Routines under it), closed ones folded at the foot. Goal detail: identity and meaning line, a progress card (target and review notes), «زیر این هدف» (Projects, open Tasks, Routines), «قدم‌های بعدی» (the next three Tasks), planning facts, then «به این هدف رسیدم» and the quiet «رها کردن هدف» | narrow |
| `/projects`, `/projects/$projectId` | The same shape for Projects: each card names its parent Goal. Project detail: parent Goal link, progress card, next steps, the Tasks and Routines under it with «کار جدید در این پروژه» (the create sheet with this Project preset), then «این پروژه تمام شد» and «توقف پروژه» | narrow |
| `/operations` | operator accounts only, read-only, two tabs over one 7/28/90-day window: «سلامت سیستم» (alerts and maintenance, AI runtime, H1/H2 cards with «x از y») and «سنجش محصول» (027 §5 figures, accounts first). Anyone else sees the not-found state | wide |
| `/first-entry` | first sign-in, under the sunset photograph: a moonstone intention card with example prompts that hands its text to `/planning` (as history state, prefilling the form), then «خودم می‌سازم» with Task / Goal / Routine choices that open the create flow, and a link to Today. From 1280px a second column shows a static sample proposal | full width, two columns from 1280px |
| `/login` | «ورود یا ثبت‌نام» (a first OTP sign-in creates the account), outside the frame: the phone step, then the code step with the number and its edit link, a resend countdown and the dev code with a copy button when the server returns one. A night-sky brand panel and the form in a card, which rises over the brand band on a phone | split on desktop |
| `/welcome` | before sign-in on a phone (below 1024px), once per device: a welcome over the sunset photograph and three guides (speak your intention, Today in one place, Reconcile), each with skip; finishing or skipping sets `tidysense:guides-seen` in `localStorage` and goes to `/login`. Nothing is stored on the server. Wider screens, and a device that has seen them, go straight to `/login` | full screen |
| anything else | not-found state with a link to Today | narrow |

`.page` is the narrow container (768px max) for reading and single-column lists; `.page-wide` (1024px max) is for two-column card grids.

## Desktop layouts

From 1024px the primary pages have their own layouts (STEP-21; boards `CodeDesktopToday`, `CodeDesktopTasks`, `CodeDesktopRoutines`, `CodeDesktopGoals`, `CodeDesktopPlanningIntent`, `CodeDesktopPlanningQuestions`, `CodeDesktopPlanning`, `CodeDesktopReconcile`, `CodeInsights`). A page renders exactly one layout, chosen by [`useIsDesktop()`](../../frontend/src/shared/lib/use-desktop.ts) (the 64rem query the rail uses), so each control exists once for assistive technology and tests. While a sheet or dialog is open (`useModal`), the page keeps the layout it had (`holdLayout`) and takes the new one when the last modal closes; the sheet itself follows the width in CSS. So crossing 1024px, as when a tablet turns, never closes an open sheet or loses what was typed in it. **Desktop adds no behaviour** (Discussion 028 §5): every action is the phone's own, and every extra figure is derived from data the phone already reads. Nothing is estimated or forecast. Desktop pages use `.page-desk`, the whole panel up to 90rem.

| Page | Desktop layout | Where each extra figure comes from |
|---|---|---|
| Today | greeting and date; four tiles (Tasks done of today's, Routine slots done with the next one, active Projects with those ending in seven days, active Goals with the nearest target date); «کارهای امروز» with the day wheel, a همه / مانده / انجام‌شده filter, «فردا» and a quick add; «روتین‌های امروز» and this week's slots by day; the photograph with the Reconcile offer, «مهلت‌های نزدیک» and «هدف‌ها» | Today, Routine week, Task options (as the day wheel), Goal and Project options and progress (as the Goals page). The quick add is the create action with a title and the day in view |
| Tasks, `/tasks/$taskId` | views (all open, today, the next seven days, earlier days, undated, closed, each Project, each Goal, standalone) with counts; the phone's grouped list; the open Task beside it, with the other Tasks of its Project and when and how it was made | the paged Task list read to its end, Goal and Project options; `createdAt` and `source` |
| Routines, `/routines/$routineId` | tiles (this week's slots, today's, the last stopped Routine); a grid of Routines by this week's days: done of scheduled for days gone, today's slots completed in place, the planned times ahead; stopped Routines at the foot; the open Routine beside it | Routine week counts, Today's occurrences, the Routine list |
| Goals | a tile per active Goal; a timeline (or the phone's cards) where a Project's bar runs from its creation to its target date and fills with its Tasks done, a Goal's flag is its target date and its Routines run as a dotted line; «نیاز به توجه» as facts (review due, no Tasks yet, days left with open Tasks, no Goal, no target date) | Goal and Project options and progress |
| Planning | the step in the middle; «چه چیزهایی کمک می‌کند» (static) or what was written with «ویرایش» and «چرا می‌پرسیم؟» on one side; «مسیر تا هدف» on the other: empty before a draft, then the draft's own included dated items in date order from today to the Goal's target date, its Routines as the rhythm | the draft |
| Reconcile | the earlier days the open Tasks come from; the phone's lanes and Review & Apply; «امروز بعد از بازبینی», Today's list with Tasks brought by a tap of «امروز» marked «تازه»; progress «x از y تصمیم» in the header | the session and Today |

On desktop `/tasks/$taskId` and `/routines/$routineId` render the list with the item open beside it; on a phone they stay their own pages. Goal and Project details keep their single-column pages.

### The Today hero

Below 1024px Today opens under a photograph ([`PhotoHero`](../../frontend/src/shared/ui/PhotoHero.tsx), [`sunset.webp`](../../frontend/src/shared/assets/sunset.webp), 1600px wide, about 120 KB; Goals and Projects use the same hero with the switch in its `below` slot): the title «امروز» in white Naskh with the Jalali date at the start, the account button (below desktop) and the page's action «افزودن کار» (desktop; phones have the create button) at the end as frosted glass. A dark veil keeps the white text legible in both themes and fades into the page's own background at the foot; night adds a darker wash. The photograph is decorative (`alt=""`). The Reconcile offer is a frosted card at its foot: what is waiting as chips (Tasks left, quick notes, reviews, and the oldest item's age in days), a small arrow into Reconcile and, after it inside the card, a small close that is the "not now".

It is 300px tall and sticky, and it folds with the scroll itself: over the first 150px of scrolling it shrinks pixel by pixel to a 150px band (it sticks with a negative `top` that follows the scroll position and slides the title down with it, so the page never jumps), and scrolling back up unfolds it the same way. There is no threshold and no animation of its own. The foot and the row under the title fade out over the first half of the fold and are inert once it is mostly folded. On a phone it runs to the screen edges and under the safe-area inset; from 1024px it is a rounded panel in the page column.

### Focused steps

While planning asks its questions, makes a draft or shows one for review, the phone screen belongs to the flow: the tab bar and the create button step aside (`focused` in the UI store, `data-focused` on the frame) and the step's footer sits at the bottom edge. The flow carries its own way back. Desktop keeps the rail.

## Page anatomy

Every primary page starts with `PageHeader` and follows the same order, so users always look in the same place:

1. **Header row** — page title, then on the opposite side the page's single primary action and, below desktop, the account button.
2. **Description** — one or two lines saying what this page is for.
3. **Filter** — a segmented control (lists default to "active").
4. **Content** — list, or the loading / error / empty state in its place.
5. **Load more** — centred, only when another page exists.

Detail pages start with `BackLink` instead (its end holds the edit button while editing is allowed), then:

1. **Identity** — entity label and status badge, then the title, then its meaning (Goal outcome, Project definition of done) or description.
2. **State** — what the item is now: a progress card for a Goal or Project, the complete button for a Task, today's slots for a Routine.
3. **Around it** — facts (`FactRow`: icon + label + value; related entities are links), what sits under it and what comes next, as cards.
4. **Decision at the foot** — only the actions the current status allows: one leading button and its quiet opposite under it, each confirmed by a dialog.

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
