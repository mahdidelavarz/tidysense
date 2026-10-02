# Frontend Summary

React 19, strict TypeScript, Vite 8, Tailwind 4. Structure: `src/routes`, `src/features/<feature>` and `src/shared`. TanStack Router uses file routing/generated tree; TanStack Query owns server state; React Hook Form owns forms; Zustand is exceptional cross-feature client state.

OpenAPI generates transport types. Zod handles forms/frontend constraints or explicit runtime checks, never a competing transport schema. UI is Persian/RTL, calm and token-driven, with an app-like frame: sidebar on desktop, tab bar plus drawer on phones, sheets for create/edit and no top bar (see `frontend/design-system.md`, `layout-and-navigation.md`, `components.md`). Each feature has `types`, one `services` file, one `hooks` file and `components`. Tests use Vitest, Testing Library and Playwright.
