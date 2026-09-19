# Frontend Summary

- Stack: React/TypeScript/Vite/Tailwind 4; TanStack Router/Query, RHF, Zod, Zustand, Axios are installed.
- Routing: `routes/__root.tsx` suggests TanStack file routing, but routing is not bootstrapped (`DEC-004`).
- State: server -> Query; forms -> RHF; shareable filters/navigation -> URL; local UI -> React; cross-feature-only state -> Zustand.
- API: components never call Axios directly. Typed service functions feed query/mutation hooks. Success comes only from authoritative response/CommandResult.
- Forms: entity-specific forms; Zod resolves client feedback while backend/domain remain authoritative.
- UI: Persian/RTL, semantic tokens only, explicit loading/empty/error/unauthorized/forbidden/not-found/conflict states.
- Styling: Tailwind `@theme` tokens live in `src/index.css`; feature code uses semantic utilities, not arbitrary colors/hex.
- Folder layout, router mode, test tools, and remaining visual scales are open.

Read `frontend/README.md` before frontend work.
