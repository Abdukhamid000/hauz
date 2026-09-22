import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { safeRedirectPath } from "#/lib/safe-redirect";
import { signInCodeSchema, signInEmailSchema } from "#/services/auth/auth.functions";
import { AuthError, authMutations } from "#/services/auth/auth.queries";

export const Route = createFileRoute("/sign-in")({
  // Where to go after signing in, as in /sign-in?redirect=/profile. The value is
  // untrusted: it only goes through safeRedirectPath when it is used.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: SignIn,
});

type SentCode = { email: string; userId: string };

function SignIn() {
  const [sent, setSent] = useState<SentCode | null>(null);

  if (sent) {
    return <CodeStep sent={sent} onBack={() => setSent(null)} />;
  }

  return <EmailStep onSent={setSent} />;
}

function EmailStep({ onSent }: { onSent: (sent: SentCode) => void }) {
  const sendCode = useMutation(authMutations.sendSignInCode());
  const [invalidEmail, setInvalidEmail] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = signInEmailSchema.safeParse(new FormData(event.currentTarget).get("email"));
    setInvalidEmail(!email.success);
    if (!email.success) {
      return;
    }

    sendCode.mutate(email.data, {
      onSuccess: ({ userId }, sentTo) => onSent({ email: sentTo, userId }),
    });
  }

  const error = invalidEmail
    ? "Enter a valid email address."
    : sendCode.error && describeError(sendCode.error, "We could not send the code. Try again.");

  return (
    <main>
      <h1>Sign in</h1>
      <p>Enter your email and we will send you a code. New to HAUZ? The steps are the same.</p>

      {/* method="post" keeps what was typed out of the URL if someone submits before the page's JavaScript loads. */}
      <form method="post" onSubmit={handleSubmit} noValidate>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={sendCode.isPending}>
          {sendCode.isPending ? "Sending…" : "Send code"}
        </button>
      </form>
    </main>
  );
}

function CodeStep({ sent, onBack }: { sent: SentCode; onBack: () => void }) {
  const { redirect } = Route.useSearch();
  const verifyCode = useMutation(authMutations.verifySignInCode());
  const [invalidCode, setInvalidCode] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const code = signInCodeSchema.safeParse(new FormData(event.currentTarget).get("code"));
    setInvalidCode(!code.success);
    if (!code.success) {
      return;
    }

    verifyCode.mutate(
      { userId: sent.userId, code: code.data },
      {
        // A full page load, so the server renders the next page, header
        // included, with the new session cookie.
        onSuccess: () => window.location.assign(safeRedirectPath(redirect)),
      },
    );
  }

  // Stays busy after success too, while the browser loads the next page.
  const busy = verifyCode.isPending || verifyCode.isSuccess;
  const error = invalidCode
    ? "Enter the 6-digit code from the email."
    : verifyCode.error && describeError(verifyCode.error, "We could not sign you in. Try again.");

  return (
    <main>
      <h1>Check your email</h1>
      <p>
        We sent a 6-digit code to <strong>{sent.email}</strong>. It expires in 15 minutes.
      </p>

      <form method="post" onSubmit={handleSubmit} noValidate>
        <label htmlFor="code">Code</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required />

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <button type="button" onClick={onBack} disabled={busy}>
        Use a different email
      </button>
    </main>
  );
}

function describeError(error: Error, fallback: string) {
  if (error instanceof AuthError) {
    if (error.reason === "rate_limited") {
      return "Too many attempts. Wait a while and try again.";
    }
    if (error.reason === "invalid_code") {
      return "That code is wrong or has expired.";
    }
  }

  return fallback;
}
