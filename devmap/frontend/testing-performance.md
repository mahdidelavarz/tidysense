# Frontend Testing and Performance

Use **Vitest** for pure logic, utilities and useful hook tests; **Testing Library** for user-visible component/form behavior; **Playwright** for critical end-to-end flows against the real API/PostgreSQL environment.

Test server field errors, preserved form input, loading/empty/error/forbidden/conflict states, polling/cancellation where relevant, keyboard use, Persian/RTL and representative mobile/desktop reflow. Do not test Tailwind class lists/framework internals or pursue arbitrary coverage percentages.

Measure before optimizing. Bound list rendering with the cursor contract, avoid waterfalls, lazy-load meaningful route boundaries and keep polling cancellable/visibility-aware. Performance changes must preserve accessibility and authoritative error/state behavior.

## Two layouts

A page with a desktop layout renders one layout, chosen by `useIsDesktop()` (see [layout and navigation](layout-and-navigation.md#desktop-layouts)). jsdom has no `matchMedia`, so a component test renders the phone layout by default; a test that calls `onDesktop()` from `src/test/desktop.ts` renders the desktop one. Desktop tests check that every extra figure is the one the phone's data gives (for example deadlines from the Task options, a timeline bar from a Project's dates and progress) and that each action calls the phone's own service. `e2e/desktop.spec.ts` walks every desktop board at 1440px, by pointer and by keyboard, and checks there is no sideways scroll. The other browser scenarios run at Playwright's default 1280px, which is desktop, so they cover the same flows on the desktop layouts.

## Related Mind Map

- [API/frontend state contracts](../../mindmap/01-Closed-Discussions/020b-api-and-frontend-state-contracts.md) — failure, recovery and asynchronous state coverage.
- [Test coverage matrix](../../mindmap/05-Implementation/test-coverage-matrix.md) — milestone-level evidence expectations.
