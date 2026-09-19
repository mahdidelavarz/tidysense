# Frontend Testing and Performance

## Testing

`DEC-010` selects tools. Required responsibilities:

- unit-test pure transformations, query-key factories, and non-trivial state reducers;
- test forms for validation, server field errors, preserved input, submitting, and accessibility;
- test hooks when cache invalidation, polling/cancellation, retries, or lost-response behavior is meaningful;
- component-test loading/empty/error/forbidden/conflict states and keyboard behavior;
- browser-test critical flows against the real API/PostgreSQL for auth, first vertical slice, confirmation/application, and recovery;
- verify Persian/RTL at representative mobile and desktop widths.

Do not test Tailwind class lists, framework internals, trivial presentational wrappers, or snapshots with no behavioral assertion.

## Performance

- Measure before adding memoization, virtualization, or state libraries.
- Bound list queries and rendering; pagination contract precedes very large lists.
- Avoid request waterfalls by placing independent queries at the same composition level.
- Lazy-load meaningful route/feature boundaries, not every component.
- Keep Query caches normalized by keys and avoid copying server objects into local/global state.
- Images/assets need explicit sizing and appropriate formats.
- Background polling is contract-driven, cancellable, visibility-aware, and bounded.
- Performance work must preserve accessibility, input state, and authoritative server states.
