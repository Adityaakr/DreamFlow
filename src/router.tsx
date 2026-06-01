import { lazy, Suspense } from "react";
import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";

const DreamFlowShell = lazy(() =>
  import("@/components/DreamFlowShell").then((module) => ({
    default: module.DreamFlowShell,
  })),
);

function TerminalLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-terminal)] text-[var(--text-primary)]">
      <div className="border border-[var(--border-panel)] bg-[var(--bg-panel)] px-4 py-3">
        <p className="bb-title">DREAMFLOW</p>
        <p className="bb-label mt-1">LOADING LIVE TERMINAL</p>
      </div>
    </main>
  );
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <Suspense fallback={<TerminalLoading />}>
      <DreamFlowShell />
    </Suspense>
  ),
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
