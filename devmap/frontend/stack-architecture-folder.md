# Frontend Stack, Architecture, and Folders

Stack: React 19, strict TypeScript, Vite 8, Tailwind 4, TanStack Router/Query, React Hook Form, Zod, Zustand only when justified, Axios and `date-fns-jalali` for presentation.

```text
frontend/src/
  routes/                 # TanStack file routes and route composition
  features/<feature>/     # feature components, hooks, services, schemas, types, utils
  shared/                 # UI primitives, HTTP/client generation, cross-feature utilities
```

Keep feature-specific code together. Do not create global type-based dumping grounds. Shared code must not import features. Prefer an existing pattern/component/hook/service, then extend it, then write a small feature-specific implementation; extract a reusable abstraction only after real repetition. Avoid universal forms, query hooks, deep configuration components and generic service layers.

Server resources live in TanStack Query, forms in React Hook Form, shareable navigation state in typed URL search, ephemeral UI in component state, and only genuinely cross-feature client-only state in Zustand. The backend remains authoritative.
