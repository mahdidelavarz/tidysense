# Frontend Summary

React 19, strict TypeScript, Vite 8, Tailwind 4. Structure: `src/routes`, `src/features/<feature>` and `src/shared`. TanStack Router uses file routing/generated tree; TanStack Query owns server state; React Hook Form owns forms; Zustand is exceptional cross-feature client state.

OpenAPI generates transport types. Zod handles forms/frontend constraints or explicit runtime checks, never a competing transport schema. UI is Persian/RTL, calm and token-driven. Tests use Vitest, Testing Library and Playwright.
