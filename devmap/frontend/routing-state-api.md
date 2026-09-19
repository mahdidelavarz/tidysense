# Routing, State, and API

## Routing

`INFERRED`: TanStack Router is intended from `routes/__root.tsx` and the router plugin dependency. `DEC-004` must confirm file-based routing and bootstrap it before pages are added.

- Routes own URL parsing, auth/access boundary, loader-level prerequisites where appropriate, and page composition.
- Search/filter/sort/page state belongs in typed URL search parameters when shareable or navigation-relevant.
- Do not hide canonical entity state in router context.
- Not-found, unauthorized, and forbidden are distinct UI states.

## State ownership

| State | Owner | Rule |
|---|---|---|
| server resources/results | TanStack Query | never duplicate in Zustand |
| form/edit buffer | React Hook Form | initialize from explicit data; preserve on recoverable failures |
| navigation/filter/search | Router/URL | use when shareable/back-button relevant |
| local ephemeral UI | React state | menus, local disclosure, temporary selection |
| cross-feature client-only | Zustand | only when multiple distant routes/features truly coordinate |
| derived | calculation/select | do not persist a second copy |

A new Zustand store requires a named cross-feature owner, lifecycle/reset rule, persistence decision, and proof that URL, Query, form, or component state is insufficient.

## API layer

- One configured client uses `/api/v1`; browser code never reads/stores auth tokens.
- Service functions own HTTP method/path and request/response transformation. Components do not call Axios.
- Transport schemas/types follow `DEC-005`; never maintain two independent handwritten wire contracts.
- Normalize RFC 9457 responses into one typed frontend error shape while retaining status/code/field errors/traceId.
- Cancellation uses `AbortSignal` where supported. Retrying mutations is explicit and respects idempotency.

## TanStack Query

Query keys are feature factories, from broad to specific:

```ts
const goalKeys = {
  all: ["goals"] as const,
  lists: () => [...goalKeys.all, "list"] as const,
  list: (filters: GoalFilters) => [...goalKeys.lists(), filters] as const,
  detail: (id: string) => [...goalKeys.all, "detail", id] as const,
};
```

Queries return server data and expose background fetch separately from initial loading. Mutations invalidate/update only affected keys after authoritative success. Do not optimistically apply consequential lifecycle/AI-confirmed mutations unless the owning contract explicitly permits reversible optimism.
