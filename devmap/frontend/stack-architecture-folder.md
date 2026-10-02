# Frontend Stack, Architecture, and Folders

Stack: React 19, strict TypeScript, Vite 8, Tailwind 4, TanStack Router/Query, React Hook Form, Zod, Zustand only when justified, Axios, `date-fns-jalali` for Jalali calendar arithmetic, `lucide-react` icons and the self-hosted Vazirmatn font.

```text
frontend/src/
  routes/                 # TanStack file routes and route composition
  features/<feature>/     # feature components, hooks, services, schemas, types, utils
  shared/                 # UI primitives, HTTP/client generation, cross-feature utilities
```

Each feature folder has the same four parts:

- `types/` — transport types re-exported from the generated OpenAPI module, plus Zod form schemas;
- `services/<feature>-api.ts` — HTTP calls only, one documented function per endpoint;
- `hooks/<feature>-hooks.ts` — the query-key factory and every TanStack Query hook of the feature in one file; hooks call services and own cache updates;
- `components/` — small components; pages compose hooks and components and never call services directly.

`features/shell` is the application frame (sidebar, tab bar, drawer, create flow). `shared/ui` holds reusable components; `shared/lib` holds small cross-feature helpers and the UI store.

Keep feature-specific code together. Do not create global type-based dumping grounds. Shared code must not import features. Prefer an existing pattern/component/hook/service, then extend it, then write a small feature-specific implementation; extract a reusable abstraction only after real repetition. Avoid universal forms, query hooks, deep configuration components and generic service layers.

Server resources live in TanStack Query, forms in React Hook Form, shareable navigation state in typed URL search, ephemeral UI in component state, and only genuinely cross-feature client-only state in Zustand. The backend remains authoritative.
