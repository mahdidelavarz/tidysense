# Routing, State, and API

Use TanStack Router **file-based routing**. Configure the Vite router plugin to generate the route tree; `main.tsx` creates the router and mounts `RouterProvider` inside required top-level providers (Query client, error boundary and direction/theme as applicable). Generated route-tree files are generated, not hand-edited.

Routes own URL parsing, access prerequisites and page composition. Navigation-relevant filters/sorts/cursors use typed search parameters. Not-found, unauthenticated and forbidden are distinct.

One configured HTTP client targets `/api/v1` and sends cookies; components never call Axios directly. Feature services own operations and use generated OpenAPI transport types. Zod owns form/frontend validation or explicit runtime checks, not a duplicate wire contract. Normalize RFC 9457 while retaining status, stable code, field errors and trace ID.

TanStack Query owns server state. Mutations update/invalidate affected keys only after authoritative success. Consequential lifecycle/AI-confirmed mutations are not optimistically declared successful unless their contract explicitly permits reversible optimism.

## Related Mind Map

- [API contract index](../../mindmap/04-Specs/api-contracts-phase-1.md) — canonical transport and resource families.
- [API/frontend state contracts](../../mindmap/01-Closed-Discussions/020b-api-and-frontend-state-contracts.md) — required attempt, command, recovery and failure states.
