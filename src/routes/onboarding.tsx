import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { safeRedirectPath } from "#/lib/safe-redirect";
import { authQueries } from "#/services/auth/auth.queries";
import { onboardingSchema } from "#/services/personal-account/personal-account.functions";
import {
  PersonalAccountError,
  personalAccountMutations,
} from "#/services/personal-account/personal-account.queries";

export const Route = createFileRoute("/onboarding")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async ({ context, search }) => {
    const viewer = await context.queryClient.query(authQueries.viewer());

    if (viewer.status === "signed_out") {
      const back = search.redirect
        ? `/onboarding?redirect=${encodeURIComponent(search.redirect)}`
        : "/onboarding";

      throw redirect({ to: "/sign-in", search: { redirect: back } });
    }

    // Already has an account, and a role cannot be changed, so there is nothing
    // to do on this page.
    if (viewer.status === "signed_in") {
      throw redirect({ href: safeRedirectPath(search.redirect) });
    }
  },
  component: Onboarding,
});

function Onboarding() {
  const { redirect: target } = Route.useSearch();
  const createAccount = useMutation(personalAccountMutations.create());
  const [invalid, setInvalid] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const input = onboardingSchema.safeParse({
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      role: form.get("role"),
    });

    setInvalid(!input.success);
    if (!input.success) {
      return;
    }

    createAccount.mutate(input.data, {
      // A full page load, so the server builds the next page, header included,
      // with the new account.
      onSuccess: () => window.location.assign(safeRedirectPath(target)),
    });
  }

  // Stays busy after success too, while the browser loads the next page.
  const busy = createAccount.isPending || createAccount.isSuccess;
  const error = invalid
    ? "Enter your first name and last name."
    : createAccount.error && describeError(createAccount.error);

  return (
    <main>
      <h1>Tell us who you are</h1>
      <p>One step before you continue. Your role cannot be changed later.</p>

      <form method="post" onSubmit={handleSubmit} noValidate>
        <label htmlFor="firstName">First name</label>
        <input id="firstName" name="firstName" autoComplete="given-name" required />

        <label htmlFor="lastName">Last name</label>
        <input id="lastName" name="lastName" autoComplete="family-name" required />

        <label htmlFor="role">I am a</label>
        <select id="role" name="role" defaultValue="property_owner">
          <option value="property_owner">Property owner</option>
          <option value="realtor">Realtor</option>
        </select>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Continue"}
        </button>
      </form>
    </main>
  );
}

function describeError(error: Error) {
  if (error instanceof PersonalAccountError) {
    if (error.reason === "signed_out") {
      return "Your sign-in expired. Sign in again to continue.";
    }
    if (error.reason === "role_conflict") {
      return "You already have an account with the other role. Reload the page.";
    }
  }

  return "We could not save your details. Try again.";
}
