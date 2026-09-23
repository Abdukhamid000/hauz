import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { authQueries } from "#/services/auth/auth.queries";

export function SiteHeader() {
  // Already in the cache: the root route loaded it before anything rendered,
  // on the server for a first page load. So this never waits.
  const { data: viewer } = useSuspenseQuery(authQueries.viewer());
  console.log(viewer, "viewer");
  return (
    <header>
      <Link to="/">HAUZ</Link>

      {viewer.status === "signed_out" && <Link to="/sign-in">Sign in</Link>}

      {/* The Log out button comes next. Someone who still needs onboarding has no first name yet. */}
      {viewer.status === "signed_in" && <span>{viewer.account.firstName}</span>}
    </header>
  );
}
