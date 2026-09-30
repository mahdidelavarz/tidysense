# Design System, RTL, and Accessibility

TidySense UI is Persian, RTL, calm, low-noise and semantic-token driven. Set `lang="fa"` and `dir="rtl"`; use logical CSS and do not mirror non-directional icons.

## Related Mind Map

- [AI-native MVP baseline](../../mindmap/04-Specs/ai-native-mvp-baseline.md) — product tone, manual escape and removed crisis UX.
- [Day-0 onboarding](../../mindmap/04-Specs/day-0-onboarding.md) — authentication/onboarding flow context.
- [Reconcile UI specification](../../mindmap/04-Specs/reconcile-ui-ux-specification.md) — adaptation flow presentation.

## Compact foundation

- Typography: one Persian-capable UI family; sizes `12, 14, 16, 20, 24, 32px`; weights `400, 500, 700`; body line height `1.75`, heading `1.35`.
- Spacing: `4, 8, 12, 16, 24, 32, 48, 64px`.
- Radius: `8px` controls, `12px` cards, `16px` dialogs/sheets, pill `999px`.
- Shadows: `sm` subtle card; `md` raised menu; `lg` modal/sheet. Prefer borders/surface contrast over shadow.
- Breakpoints: `640, 768, 1024, 1280px`; design mobile-first.
- Z-index: base `0`, sticky `10`, dropdown `30`, overlay `40`, modal/sheet `50`, toast `60`.
- Motion: `120ms` immediate, `200ms` standard, `280ms` emphasized; standard easing `cubic-bezier(.2,0,0,1)`; respect reduced motion.
- Icons: one consistent outline set, normally 20/24px; icons supplement labels and never carry sole meaning.

The accepted palette remains in semantic Tailwind tokens. Feature code avoids raw hex/arbitrary palette colors and large saturated entity backgrounds.

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

## Implemented UI foundation

The production baseline lives in [`frontend/src/index.css`](../../frontend/src/index.css) and the small set of proven shared UI components under [`frontend/src/shared/ui`](../../frontend/src/shared/ui). Feature code should use the semantic surface, control, form, state and typography classes there before adding local visual rules.

- The authenticated application shell provides the product identity, current primary navigation, a skip link and one centered content boundary. New primary destinations are added only when their owning product step exists; the shell must not advertise future modules.
- Goal, Project, Task and Routine keep distinct semantic identity through `entity-goal`, `entity-project`, `entity-task` and `entity-routine`. Entity color is a quiet marker or border plus a text label, never a large saturated fill and never the only identifier.
- Lifecycle status is separate from entity identity. Active, positive-terminal and neutral-terminal badges combine copy, shape and color.
- Shared async states use labelled loading feedback, preserved content for background refresh, actionable empty/error states and bounded retry. Lists remain semantic `ul`/`li` structures; introduce a table only when the content has genuine column relationships.
- The shared confirmation dialog is modal, labelled, keyboard-dismissable when idle, focus-trapped and restores trigger focus. Consequential actions keep an explicit preview and confirmation; visual treatment must not imply success before the authoritative response.
- Reusable controls provide at least a 44px target, visible hover/focus/disabled/invalid states and logical-direction layout. Date, phone, OTP and other intrinsically left-to-right values may set local `dir="ltr"` without changing the surrounding RTL flow.

Use semantic HTML, visible labels, keyboard operation, visible focus, ≥44px mobile targets where applicable, non-color status cues, announced errors/async results, modal focus management, accessible contrast and RTL responsive reflow.
