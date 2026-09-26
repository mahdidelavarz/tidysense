import { createRootRoute } from "@tanstack/react-router";
import { AuthGate } from "../features/auth/components/AuthGate";

export const Route = createRootRoute({
  component: () => (
    <main className="min-h-screen bg-canvas text-text-primary">
      <AuthGate />
    </main>
  ),
});
