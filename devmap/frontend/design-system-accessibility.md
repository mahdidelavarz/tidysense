# Design System, RTL, and Accessibility

## Language and direction

`LOCKED`: product UI is Persian and primary direction is RTL. The root document/app shell must set Persian language and RTL direction. Verify logical spacing/alignment, form labels, tables, dialogs, dropdowns, navigation, text truncation, mixed Latin/numeric content, and directional icons. Prefer CSS logical properties and Tailwind logical utilities when available; do not mirror icons whose meaning is not directional.

## Color authority

The palette is locked. Tailwind 4 semantic tokens belong in `frontend/src/index.css`, the current global stylesheet entry (`INFERRED`). Feature code consumes semantic utilities; it does not use arbitrary palette utilities or raw hex.

```css
@theme {
  --color-canvas: #f3f1ec;
  --color-surface: #ffffff;
  --color-surface-sunken: #ebe7df;
  --color-accent: #4f7a88;
  --color-accent-strong: #3c616d;
  --color-accent-tint: #e7eef0;
  --color-positive: #5f8f68;
  --color-positive-tint: #e9f0e9;
  --color-caution: #b8863e;
  --color-caution-tint: #f5ede0;
  --color-attention: #b36b52;
  --color-attention-tint: #f3e7e1;
  --color-text-primary: #2b2a2e;
  --color-text-secondary: #6e6c74;
  --color-text-tertiary: #9d9aa2;
  --color-border: #d5d0c3;
  --color-border-subtle: #e4e0d6;
  --color-entity-goal: #b8863e;
  --color-entity-project: #4f7a88;
  --color-entity-task: #5f8f68;
  --color-entity-routine: #86678f;
}
```

Entity colors identify entity type through small icons, badges, indicators, borders or accents. They are separate semantic names from state colors even when values match. Avoid large saturated entity backgrounds.

## Open foundation

Typography/font, spacing scale, radii, shadows, widths, breakpoints, z-index layers, motion durations/easing, icon set, and precise Button/Input/Card/Badge/Dialog variants are `OPEN DECISION DEC-009`. Do not manufacture a competing scale per feature. Until resolved, browser/scaffold defaults may support infrastructure screens only, not accepted product UI.

## Accessibility contract

- semantic HTML and visible labels before ARIA workarounds;
- full keyboard operation and visible focus;
- minimum 44x44px touch targets on mobile where product specs require;
- status/severity/entity meaning never communicated by color alone;
- errors and async result changes announced appropriately;
- focus trapped/restored in modal surfaces;
- sticky controls do not cover focused content;
- reduced-motion preference respected;
- responsive reflow preserves reading/action order in RTL;
- test contrast against semantic foreground/background pairings before acceptance.
