# Design System

The visual and interaction foundation of the TidySense web app. Tokens live in [`frontend/src/index.css`](../../frontend/src/index.css); change a value there and here together. Layout and navigation are in [`layout-and-navigation.md`](layout-and-navigation.md), the component catalogue in [`components.md`](components.md), and RTL/accessibility rules in [`design-system-accessibility.md`](design-system-accessibility.md).

This document supersedes the earlier compact foundation (Tahoma, `#4f7a88` accent, text-only controls, top application bar), replaced on 2026-10-02, and the teal/Lucide system that followed it, replaced on 2026-10-12 by the **Sky** system taken from the owner's "Adaptive Planner — Dawn" design canvas (light «آسمان — روشن» and dark «آسمان — تیره» pages). The design was adopted as a visual system, not as a flow specification: its screens that need behaviour the product does not have («الان روی این», the start suggestion, skipping a Routine, Routines grouped by part of day, its own tab destinations) were not built.

## Principles

1. **One obvious next step.** Every page has at most one primary (filled) action. Everything else is secondary, an action tile, or a row.
2. **An app, not a website.** No top application bar. Navigation sits at the edge of the screen (icon rail or tab bar) and each page carries its own title and actions on the canvas.
3. **Designed per size, not shrunk.** Phones get a tab bar, a floating create button and bottom sheets; desktops get an icon rail, a page panel and side panels. See the layout document.
4. **Calm.** Warm paper by day, ink-blue by night, one ink action. Colour marks meaning (today's sun, yesterday's moon, entity, status, danger) and is never the only cue.
5. **Say what will happen.** Consequential actions carry a one-line explanation before they are pressed and a confirmation dialog after.
6. **Persian first.** RTL layout, Jalali dates, Persian digits, a Persian typeface.

## Colour

Two themes defined by the same tokens. Light values live in `@theme`; `:root[data-theme="dark"]` redefines them. Night is not the day inverted: the canvas is ink-blue (never black), surfaces get **lighter** as they rise instead of casting shadow, meaning colours are lighter and less saturated, and the action turns from ink to moonlight.

| Token | Light | Dark | Use |
|---|---|---|---|
| `canvas` | `#f3f1ec` | `#0f1720` | page background |
| `surface` | `#ffffff` | `#18222c` | cards, grouped lists, the rail, fields |
| `surface-raised` | `#ffffff` | `#1a2530` | sheets, dialogs, the account panel, menus |
| `surface-sunken` | `#ebe7df` | `#141d26` | notices, segmented track, action tray |
| `accent` | `#1c2e34` | `#ede8dd` | the action: primary button, create button, selected day, current tab |
| `accent-strong` | `#2f525c` | `#f7f3ea` | hover of accent; accent-coloured text |
| `accent-tint` | `#e6edef` | `#222f3a` | active navigation row, hover of secondary controls, later-day leaf |
| `on-accent` | `#f4f1ea` | `#0f1720` | text and icons on `accent`, `positive` or an entity fill |
| `sun` / `sun-tint` / `sun-strong` | `#dfa455` / `#f7ead2` / `#7a4f17` | `#e8b567` / `#2d2a22` / `#f0c886` | today: completion ring, today's leaf, current-tab dot, chosen chips, empty-state wash |
| `on-sun` | `#3a2a12` | `#1a1206` | the tick on a completed (sun-filled) ring |
| `moon` / `moon-tint` / `moon-strong` | `#3e4c6e` / `#e8ebf3` / `#34405e` | `#9aa8d4` / `#1a2238` / `#cdd4ee` | yesterday: the Reconcile offer, earlier-day leaf, lane counts |
| `positive` / `positive-tint` | `#356e4e` / `#e4efe7` | `#8cc7a1` / `#1a2d25` | completed/achieved status |
| `caution` / `caution-tint` | `#87561a` / `#f7ead2` | `#e8b567` / `#2a2519` | waiting/blocked hints, offline banner |
| `attention` / `attention-tint` | `#a9472f` / `#f7e7e1` | `#e59a85` / `#2c1d1b` | errors, destructive actions (a tinted fill, never a solid red) |
| `text-primary` | `#2b2a2e` | `#ede8dd` | body and headings (moonlight, not pure white, at night) |
| `text-secondary` | `#615e68` | `#a3acb6` | supporting text, inactive navigation |
| `text-tertiary` | `#8c8992` | `#6b7580` | placeholders, rings and decorative icons only (below 4.5:1) |
| `border` / `border-subtle` | `#dcd7cc` / `#eeeae2` | `#2a3642` / `#222d38` | field outlines / hairlines between rows |
| `scrim` | 45% `#162228` | 60% `#03060a` | behind sheets and dialogs |
| `entity-goal` | `#a83e78` | `#e29ac0` | Goal identity |
| `entity-project` | `#1d7f86` | `#7cc9cf` | Project identity |
| `entity-task` | `#2e6fb3` | `#86b8ea` | Task identity |
| `entity-routine` | `#7652c4` | `#b9a3ec` | Routine identity (the design's orbit) |
| `ai-icon` / `ai-ink` / `ai-spark` | `#34405e` / `#34405e` / `#dfa455` | `#1a2238` / `#cdd4ee` / `#ffffff` | the AI («سنگ ماه», moonstone): the icon on its fill, its text on the canvas, its accent spark |

**Moonstone, the AI.** Everything the AI offers wears one material, never a button colour (there is no purple on buttons): `--ai-fill` (a pale blue-to-sand gradient by day, a brighter one by night), `--ai-glow` (the slowly turning halo of `.ai-aura`), `--ai-tint` (a quiet wash for AI sections) and `--ai-shadow`. They are custom properties on `:root`, redefined in the dark block, because Tailwind colour tokens cannot hold gradients. Used today by the Planning tab and rail item; the planning, draft and explanation screens adopt it in their own steps.

Entity colours changed on 2026-10-14 (STEP-15) to the canvas set: Goal magenta, Project teal, Task blue, Routine violet, so Task no longer shares `positive`'s green. Every chip and icon pair stays at least 4.5:1 (lowest: Project icon 4.79:1 by day).

The design's own grey for meta text (`#7d7a84`) is 4.2:1 on white, so `text-secondary` is a step darker; every text pair above is at least 4.5:1 in both themes (`on-accent` on `accent` 12.5:1 light, 14.8:1 dark). The design palette had no Goal or Project colour; they were mapped into its family (ochre summit, cloud blue). Feature code uses these tokens through Tailwind utilities (`bg-accent`, `text-on-accent`) and never raw hex values, `white` or `black`: a colour mixed toward the surface is mixed with `var(--color-surface)`, toward ink with `var(--color-text-primary)`, so it works in both themes. The exceptions keep their own palette: the photograph heroes (`PhotoHero` on Today, Goals and Projects; the welcome, its guides and First Entry), whose text and frosted glass are white over a dark veil in both themes, and the sign-in panel, which is the night sky in both themes.

Entity colours mostly appear as tints: `.entity-chip`, `.entity-icon`, `.entity-ink` and the chosen chips of a sheet derive a 12% tint and a darker (light theme) or lighter (dark theme) foreground from `--entity-color`, and `.goal-card`, `.progress-card` and `.proposal-card` take its corner wash. Solid entity fills are kept to completion: a done ring or slot, the Routine calendar's complete days, its week bars, and a Task's one complete button (text in `canvas`, 4.6:1 light, 8.6:1 dark).

### Theme

The preference is `system` (the default), `light` or `dark`, chosen under «ظاهر» in the account menu and kept in this browser only (`localStorage` key `tidysense.theme`, [`shared/lib/theme.ts`](../../frontend/src/shared/lib/theme.ts)). The resolved theme is the `data-theme` attribute on `<html>`; a small script, [`public/theme-init.js`](../../frontend/public/theme-init.js), loaded from `index.html` sets it before first paint so the page never flashes the wrong theme (a file, not an inline script, because the production CSP allows scripts from `self` only), and it follows the system setting live while the preference is `system`. `meta[name=theme-color]` follows the canvas. Add nothing per component for dark mode: redefine a token, or, for a drawing, add its `[data-theme="dark"]` palette.

## Typography

Two families, both self-hosted so nothing loads from a third-party font host:

- **Vazirmatn** (variable, `@fontsource-variable/vazirmatn`) for everything. Fallback: Tahoma, system UI.
- **Noto Naskh Arabic** 700 (`@fontsource/noto-naskh-arabic`, Arabic subset only) for display titles: page titles (`.page-title`), the Today hero title, sheet and dialog titles and the question label of a create form (`.display-title`, `.title-label`). Never for body text, controls or numbers in tables.

| Role | Size | Weight | Class |
|---|---|---|---|
| Today hero title | 36px Naskh, white | 700 | `.hero-title` |
| page title | 32px, 36px from `sm`, Naskh | 700 | `.page-title` |
| sheet/dialog title | 23px Naskh | 700 | `.display-title` |
| create-form question | 21px Naskh | 700 | `.title-label` |
| card title | 18px | 700 | — |
| row title, body emphasis | 16px | 700 | — |
| body | 16px, line height 1.75 | 400 | — |
| supporting text | 14px | 400 | — |
| section label | 14px | 800, secondary colour | `.section-title` |
| meta, chips, tab labels | 12px (tab labels 11px) | 500–700 | — |

Buttons are 14px extra-bold. The `font: inherit` reset for controls lives in `@layer base` in `index.css`; outside a layer it would override the size and weight of every button class. Inputs are 16px so mobile browsers do not zoom on focus. Numbers shown to the user use Persian digits (`formatNumber`); dates use the Jalali calendar (`formatLocalDate`, `formatLongDate` in [`shared/lib/date.ts`](../../frontend/src/shared/lib/date.ts)). API values stay ISO Gregorian.

## Space, shape and elevation

- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 48px. Page gutters are 16px on phones, 24px from `sm`, 40px from `lg`. Lists use 12px gaps; sections are separated by 32px.
- **Radius:** 13–14px icon tiles, leaves and small controls; 15px fields; 18px buttons, choice tiles and day tiles; 22px cards, rows and grouped lists; 28px detail/entity cards, dialogs, the account panel and empty states; 34px the desktop page panel; 38px the rail; 30px the top of a bottom sheet; full for chips.
- **Elevation:** by day surfaces lift with a soft long shadow (`shadow-sm` resting, `shadow-md` hovered and the primary action, `shadow-lg` sheets and dialogs); by night the same tokens become an inner top highlight plus a deep shadow, and raised surfaces are lighter. Cards and rows have no outline; hairlines (`border-subtle`) separate rows inside a grouped list. Fields and secondary buttons keep a 1.5px outline.
- **Touch targets:** at least 44×44px (`min-h-11`); buttons and fields are 48px. The completion ring is drawn at 24px in the Task colour inside a 44px target.
- **Fields:** `.field-input` is a 1.5px `border` outline on `surface`; focus turns the outline `accent` with a 4px `accent` halo at 10%. The first field of a create/edit form is the design's underlined line (`FormField prominent`): the label as a Naskh question, a 2px `accent` underline that turns `sun` with a sun caret while typing. An invalid field uses `attention`. All of it transitions in 200ms.
- **Layers:** navigation and the create button `10`, the Today hero `20`, backdrop `40`, sheet/dialog/account panel `50`, toast and skip link `60`.

## Motion

| Token | Use |
|---|---|
| 200ms, `cubic-bezier(.2,0,0,1)` | hover, colour and state transitions; dialog and toast entrance |
| 280ms, same easing | sheet entrance, the account sheet on phones |
| 7s linear loop | the moonstone halo (`.ai-aura`) |

| 320ms, same easing | the Today hero collapsing and opening |
| 550ms, `cubic-bezier(.22,1,.36,1)` | the day wheel turning to the chosen day |

Only `transform`, `opacity` and the hero's sticky `top` animate. Press feedback is a 2% scale-down, never a layout shift. `prefers-reduced-motion` collapses all durations.

## Icons

**Solar, linear** (by 480 Design, CC BY 4.0), through Iconify data compiled into the bundle at build time by `unplugin-icons`; no icon is fetched at runtime. Feature code imports named icons from [`shared/ui/icons.tsx`](../../frontend/src/shared/ui/icons.tsx), never from `~icons/*` directly, and types icon props as `AppIcon`. Every icon takes `size` and is `aria-hidden` unless it is given an `aria-label`. Sizes: 13–14px inside chips and meta lines, 18–20px in buttons and rows, 22–24px in navigation and tiles. Icons always accompany a text label, or the control has an `aria-label`. The export names kept the names of the previous Lucide icons so the migration was mechanical; give a new icon a name for what it means.

Solar has no spinner; `LoaderCircle` is a small local arc turned by `animate-spin`.

Direction: the layout is RTL, so "back" is `ArrowRight`/`ChevronRight` and "forward/open" is `ChevronLeft`. Do not mirror non-directional icons.

| Meaning | Export | Solar icon |
|---|---|---|
| Today (navigation) | `Sun` | `sun-2` |
| appearance (account panel) | `Moon` | `moon` |
| Task list | `ListChecks` | `checklist-minimalistic` |
| Project (the design's stacked stones) | `FolderKanban` | `layers-minimalistic` |
| Goal | `Target` | `target` |
| Routine (the design's orbit) | `Repeat` | `planet` |
| Reconcile | `RefreshCcw` | `restart` |
| Planning (account panel) | `Compass` | `compass` |
| Planning with the AI (tab, rail, create menu) | `Sparkles` | `magic-stick-3` |
| account | `UserRound` | `user-rounded` |
| create | `Plus` | `add` |
| edit | `Pencil` | `pen` |
| filter (Tasks) | `Filter` | `filter` |
| earlier days (Reconcile offer, times moved) | `History` | `history` |
| complete / achieve | `Check`, `CircleCheckBig` | `check`, `check-circle` |
| abandon / stop / drop | `CircleSlash` / `CircleStop` / `Trash2` | `forbidden-circle` / `stop-circle` / `trash-bin-minimalistic` |
| no date | `CalendarOff` | `cloud` (the design's «بعداً») |
| move to another day | `CalendarClock` | `calendar-mark` |
| restore | `RotateCcw` | `undo-left` |
| phone number (sign-in) | `Smartphone` | `smartphone` |
| copy the dev code | `Copy` | `copy` |
| send the code | `Send` | `plain` |

## Dependencies added for this system

Recorded per the [dependency policy](../operations/dependency-policy.md).

| Package | Problem | Why not existing/local | Impact |
|---|---|---|---|
| `unplugin-icons`, `@iconify-json/solar` (dev) and `@svgr/core`, `@svgr/plugin-jsx` (dev, its React compiler) | The Sky design asked for one icon family in its rounded linear style; Solar was chosen by the owner from Iconify. | Iconify's runtime component fetches icons from its public API, which is unreliable for the pilot audience; compiling at build time ships only the used SVGs with no runtime dependency. Replaced `lucide-react`. | No runtime package. The used icons are one ~20 kB (gzip) chunk. Solar is CC BY 4.0: credit 480 Design wherever the product lists third-party work. Removal means replacing `shared/ui/icons.tsx`. |
| `@fontsource/noto-naskh-arabic` | The design sets titles in a Naskh serif; Vazirmatn alone gives no display voice. | Same reason as Vazirmatn: no third-party font host. | Only the 700 weight of the Arabic subset is imported (one woff2, loaded on first title). Removal is one import in `main.tsx` and the `--font-display` token. |
| `@fontsource-variable/vazirmatn` | Tahoma is not an acceptable Persian UI face and has only two weights. | A hosted font adds a third-party request that is unreliable for the pilot audience; the package ships the OFL-licensed files with the app. | One variable font file per script subset, loaded by the browser on demand. Removal is one import in `main.tsx` and one token. |

`date-fns-jalali` (already a dependency) is now used by the date picker for Jalali month arithmetic.
