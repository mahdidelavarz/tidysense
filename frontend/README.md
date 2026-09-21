# TidySense Frontend

React, strict TypeScript and Vite frontend using TanStack Router file routes, TanStack Query, Axios, and generated OpenAPI transport types.

## Commands

```text
npm run dev
npm run generate:api
npm run typecheck
npm test
npm run build
```

Build the backend first when the API contract changes; it generates `/backend/openapi/TidySense.json`. Then run `npm run generate:api` to refresh `src/shared/api/generated.ts`. The browser client sends the HttpOnly auth cookie with same-origin `/api/v1` requests and never stores JWT values in JavaScript storage.
