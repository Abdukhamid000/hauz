import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { signInEmailSchema } from "#/services/auth/auth.functions";
import { authMutations, SendSignInCodeError } from "#/services/auth/auth.queries";

export const Route = createFileRoute("/sign-in")({ component: SignIn });

type SentCode = { email: string; userId: string };

function SignIn() {
  const [sent, setSent] = useState<SentCode | null>(null);

  if (sent) {
    // Placeholder until the code step is built: that step will need `sent.userId`.
    return (
      <main>
        <h1>Check your email</h1>
        <p>
          We sent a sign-in code to <strong>{sent.email}</strong>. It expires in 15 minutes.
        </p>
        <button type="button" onClick={() => setSent(null)}>
          Use a different email
        </button>
      </main>
    );
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
    : sendCode.error && sendCodeErrorMessage(sendCode.error);

  return (
    <main>
      <h1>Sign in</h1>
      <p>Enter your email and we will send you a code. New to HAUZ? The steps are the same.</p>

      {/* method="post" keeps the email out of the URL if someone submits before the page's JavaScript loads. */}
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

function sendCodeErrorMessage(error: Error) {
  if (error instanceof SendSignInCodeError && error.reason === "rate_limited") {
    return "Too many codes were requested. Wait a while and try again.";
  }

  return "We could not send the code. Try again.";
}
