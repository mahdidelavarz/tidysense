# Frontend Testing and Performance

Use **Vitest** for pure logic, utilities and useful hook tests; **Testing Library** for user-visible component/form behavior; **Playwright** for critical end-to-end flows against the real API/PostgreSQL environment.

Test server field errors, preserved form input, loading/empty/error/forbidden/conflict states, polling/cancellation where relevant, keyboard use, Persian/RTL and representative mobile/desktop reflow. Do not test Tailwind class lists/framework internals or pursue arbitrary coverage percentages.

Measure before optimizing. Bound list rendering with the cursor contract, avoid waterfalls, lazy-load meaningful route boundaries and keep polling cancellable/visibility-aware. Performance changes must preserve accessibility and authoritative error/state behavior.
