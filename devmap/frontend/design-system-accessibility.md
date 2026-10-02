# RTL and Accessibility

Rules every screen must meet. Tokens, typography and icons are in [`design-system.md`](design-system.md); layout in [`layout-and-navigation.md`](layout-and-navigation.md); components in [`components.md`](components.md).

## Related Mind Map

- [AI-native MVP baseline](../../mindmap/04-Specs/ai-native-mvp-baseline.md) — product tone, manual escape and removed crisis UX.
- [Day-0 onboarding](../../mindmap/04-Specs/day-0-onboarding.md) — authentication/onboarding flow context.
- [Reconcile UI specification](../../mindmap/04-Specs/reconcile-ui-ux-specification.md) — adaptation flow presentation.

## Persian and RTL

- `index.html` declares `lang="fa"` and `dir="rtl"`.
- Use logical CSS (`ms-*`, `pe-*`, `inset-inline-*`, `text-start`), never left/right.
- Directional icons follow reading direction: back points right, forward points left. Non-directional icons are not mirrored.
- Phone numbers, OTP codes and trace IDs are intrinsically left-to-right: wrap them in `dir="ltr"` (and `<bdi>` inside running text).
- Dates are shown in the Jalali calendar and numbers in Persian digits; values sent to the API stay ISO Gregorian.
- The sheet and drawer slide animations are written for RTL. A future LTR locale must flip them.

## Accessibility

- **Semantics:** one `h1` per page; lists are `ul`/`li`; navigation regions are labelled; `main` has the skip-link target.
- **Names:** every control has a visible label or an `aria-label`. Controls that repeat in a list include the item's title in their name (for example "تکمیل کار: …").
- **Keyboard:** everything is reachable and operable by keyboard; focus is always visible (3px accent ring). Tab order follows visual order.
- **Modals:** sheets, dialogs and the drawer are `role="dialog"` with `aria-modal`, a labelled title, a focus trap, Escape to close and focus restored to the trigger.
- **Targets:** at least 44×44px.
- **Colour:** text contrast is at least 4.5:1; `text-tertiary` is for placeholders and decoration only. Status and entity identity always pair colour with text or an icon.
- **Feedback:** loading states are `role="status"`; errors are `role="alert"` and appear next to what failed; success toasts are announced politely and only after the server confirmed the change.
- **Motion:** respects `prefers-reduced-motion`.
- **Responsive:** no horizontal scrolling at 320px and up; content is never hidden behind the tab bar; the device safe-area inset is respected.

A screen is not done until it meets this list at phone and desktop width. `frontend/e2e/responsive.spec.ts` checks the navigation model and overflow at both.
