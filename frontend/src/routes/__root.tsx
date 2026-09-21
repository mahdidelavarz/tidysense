import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <main className="min-h-screen bg-canvas text-text-primary">
      <Outlet />
    </main>
  ),
});
