# Frontend Stack, Architecture, and Folders

## Stack

`LOCKED`: React 19, strict TypeScript, Vite 8, Tailwind 4. Selected dependencies are TanStack Router/Query, React Hook Form, Zod, Zustand, Axios, and `date-fns-jalali`.

## Dependency direction

```text
route/page
  -> feature components/forms
  -> feature hooks (queries/mutations)
  -> typed API service
  -> shared HTTP client

shared UI/utilities do not import features.
```

Business authority remains on the backend. Frontend modules may mirror safe rules for immediate UX but must render server conflict/validation results and may not manufacture successful canonical state.

## Current evidence

`src/routes/__root.tsx` suggests TanStack file routing, but `main.tsx` renders `App` directly and no router/query provider is wired. `App.tsx` is placeholder UI. There are no stable feature/component conventions yet.

## Folder choice

`OPEN DECISION DEC-003` selects the detailed feature layout. Until resolved, do not create competing `services/`, `api/`, `hooks/`, and `features/` trees. Whichever option wins must keep feature-specific code together and a small, dependency-safe shared layer.
