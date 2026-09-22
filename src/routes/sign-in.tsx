import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { sendSignInCode, signInEmailSchema } from "#/server/auth.functions";

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

const errorMessages = {
  rate_limited: "Too many codes were requested. Wait a while and try again.",
  failed: "We could not send the code. Try again.",
};

function EmailStep({ onSent }: { onSent: (sent: SentCode) => void }) {
  const [error, setError] = useState<string | null>(null);

  const sendCode = useMutation({
    mutationFn: (email: string) => sendSignInCode({ data: { email } }),
    onSuccess: (result, email) => {
      if (result.ok) {
        onSent({ email, userId: result.userId });
      } else {
        setError(errorMessages[result.reason]);
      }
    },
    onError: () => setError(errorMessages.failed),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = signInEmailSchema.safeParse(new FormData(event.currentTarget).get("email"));
    if (!email.success) {
      setError("Enter a valid email address.");
      return;
    }

    setError(null);
    sendCode.mutate(email.data);
  }

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
