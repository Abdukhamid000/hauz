import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  redirect,
} from "@tanstack/react-router";

import { SiteHeader } from "#/components/site-header";
import { authQueries } from "#/services/auth/auth.queries";
import appCss from "../styles.css?url";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // Runs before every page: on the server for a first page load, in the
  // browser when moving between pages. Either way the answer comes from
  // getViewer on the server, and it is cached so moving around stays fast.
  beforeLoad: async ({ context, location }) => {
    const viewer = await context.queryClient.query(authQueries.viewer());

    // Someone signed in without an account finishes onboarding before anything
    // else. That is how a new person passes through it on the way to the page
    // they were heading for.
    if (
      viewer.status === "needs_onboarding" &&
      location.pathname !== "/onboarding"
    ) {
      throw redirect({ to: "/onboarding", search: { redirect: location.href } });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HAUZ" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Renders inside RootDocument's body, and only once beforeLoad has succeeded,
// so the header always has the viewer.
function RootLayout() {
  return (
    <>
      <SiteHeader />
      <Outlet />
    </>
  );
}
