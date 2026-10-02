# Design System

The visual and interaction foundation of the TidySense web app. Tokens live in [`frontend/src/index.css`](../../frontend/src/index.css); change a value there and here together. Layout and navigation are in [`layout-and-navigation.md`](layout-and-navigation.md), the component catalogue in [`components.md`](components.md), and RTL/accessibility rules in [`design-system-accessibility.md`](design-system-accessibility.md).

This document supersedes the earlier compact foundation (Tahoma, `#4f7a88` accent, text-only controls, top application bar). Those were replaced deliberately on 2026-10-02.

## Principles

1. **One obvious next step.** Every page has at most one primary (filled) action. Everything else is secondary, an action tile, or a row.
2. **An app, not a website.** No top application bar. Navigation sits at the edge of the screen (sidebar or tab bar) and each page carries its own title and actions on the canvas.
3. **Designed per size, not shrunk.** Phones get a tab bar, a drawer and bottom sheets; desktops get a sidebar and side panels. See the layout document.
4. **Calm.** A warm neutral canvas, white surfaces, one accent. Colour marks meaning (entity, status, danger) and is never the only cue.
5. **Say what will happen.** Consequential actions carry a one-line explanation before they are pressed and a confirmation dialog after.
6. **Persian first.** RTL layout, Jalali dates, Persian digits, a Persian typeface.

## Colour

| Token | Value | Use |
|---|---|---|
| `canvas` | `#f5f4f0` | page background |
| `surface` | `#ffffff` | cards, sheets, sidebar, inputs |
| `surface-sunken` | `#eeece6` | notices, icon tiles, segmented track, hover fill |
| `accent` | `#1f6f6b` | primary button, create button, selected day |
| `accent-strong` | `#175653` | hover of accent; accent-coloured text |
| `accent-tint` | `#e2f0ee` | active navigation item, hover of secondary controls |
| `positive` / `positive-tint` | `#2f855a` / `#e3f2e9` | completed/achieved status, positive action tile |
| `caution` / `caution-tint` | `#a86a12` / `#f8eedb` | waiting/blocked hints, offline banner |
| `attention` / `attention-tint` | `#bf4d34` / `#fbe9e4` | errors, destructive actions |
| `text-primary` | `#1d1c21` | body and headings |
| `text-secondary` | `#5a5863` | supporting text, inactive navigation |
| `text-tertiary` | `#84818d` | placeholders and decorative icons only (below 4.5:1 on white) |
| `border` / `border-subtle` | `#dcd8ce` / `#e9e6de` | control borders / card and divider borders |
| `entity-goal` | `#b7791f` | Goal identity |
| `entity-project` | `#4a5fc1` | Project identity |
| `entity-task` | `#2f855a` | Task identity |
| `entity-routine` | `#8556b8` | Routine identity (reserved for STEP-06) |

White text on `accent` is 5.9:1; `text-secondary` on `canvas` is above 6:1. Feature code uses these tokens through Tailwind utilities (`bg-accent`, `text-text-secondary`) and never raw hex values.

Entity colours are never used as large fills. They appear only through `.entity-chip` and `.entity-icon`, which derive a 12% tint background and a darkened foreground from `--entity-color`.

There is no dark theme yet. Add one by redefining these tokens, not by adding per-component overrides.

## Typography

One family: **Vazirmatn** (variable), self-hosted through `@fontsource-variable/vazirmatn` so it loads without a third-party font host. Fallback: Tahoma, system UI.

| Role | Size | Weight | Class |
|---|---|---|---|
| page title | 24px, 28px from `sm` | 800 | `.page-title` |
| sheet/dialog title | 20px | 800 | — |
| card title | 18px | 700 | — |
| row title, body emphasis | 16px | 700 | — |
| body | 16px, line height 1.75 | 400 | — |
| supporting text | 14px | 400 | — |
| section label | 14px | 700, secondary colour | `.section-title` |
| meta, chips, tab labels | 12px (tab labels 11px) | 500–700 | — |

Inputs are 16px so mobile browsers do not zoom on focus. Numbers shown to the user use Persian digits (`formatNumber`); dates use the Jalali calendar (`formatLocalDate`, `formatLongDate` in [`shared/lib/date.ts`](../../frontend/src/shared/lib/date.ts)). API values stay ISO Gregorian.

## Space, shape and elevation

- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 48px. Page gutters are 16px on phones, 24px from `sm`, 40px from `lg`. Lists use 12px gaps; sections are separated by 32px.
- **Radius:** 12px controls and icon tiles (`rounded-xl`), 16px cards, rows and tiles (`rounded-2xl`), 24px sheets, dialogs and empty states (`rounded-3xl`), full for chips and the create button.
- **Elevation:** `shadow-sm` resting cards, `shadow-md` hovered cards and the create button, `shadow-lg` sheets, dialogs, drawer and toasts. Borders carry most separation; shadow only signals lift.
- **Touch targets:** at least 44×44px (`min-h-11`, `.icon-button` is 44px, inputs are 48px).
- **Layers:** navigation `10`, backdrop `40`, sheet/dialog/drawer `50`, toast and skip link `60`.

## Motion

| Token | Use |
|---|---|
| 200ms, `cubic-bezier(.2,0,0,1)` | hover, colour and state transitions; dialog and toast entrance |
| 280ms, same easing | sheet and drawer entrance |

Only `transform` and `opacity` animate. Press feedback is a 2% scale-down, never a layout shift. `prefers-reduced-motion` collapses all durations.

## Icons

**Lucide** (`lucide-react`), outline, 2px stroke. Sizes: 14px inside chips, 18–20px in buttons and rows, 22–26px in navigation. Icons always accompany a text label, or the control has an `aria-label`. Decorative icons are `aria-hidden`.

Direction: the layout is RTL, so "back" is `ArrowRight`/`ChevronRight` and "forward/open" is `ChevronLeft`. Do not mirror non-directional icons.

| Meaning | Icon |
|---|---|
| Today | `Sun` |
| Task | `ListChecks` |
| Project | `FolderKanban` |
| Goal | `Target` |
| Routine (reserved) | `Repeat` |
| create | `Plus` |
| edit | `Pencil` |
| complete / achieve | `CircleCheckBig` |
| abandon / stop / drop | `CircleSlash` / `CircleStop` / `Trash2` |
| restore | `RotateCcw` |

## Dependencies added for this system

Recorded per the [dependency policy](../operations/dependency-policy.md).

| Package | Problem | Why not existing/local | Impact |
|---|---|---|---|
| `lucide-react` | The UI had no icons; actions were text-only and entity identity relied on colour dots. | No icon set existed. Hand-maintained SVG paths would duplicate a maintained, tree-shaken, ISC-licensed set. | Only imported icons are bundled. Removal means replacing imports in `shared/ui` and `features/shell`. |
| `@fontsource-variable/vazirmatn` | Tahoma is not an acceptable Persian UI face and has only two weights. | A hosted font adds a third-party request that is unreliable for the pilot audience; the package ships the OFL-licensed files with the app. | One variable font file per script subset, loaded by the browser on demand. Removal is one import in `main.tsx` and one token. |

`date-fns-jalali` (already a dependency) is now used by the date picker for Jalali month arithmetic.
