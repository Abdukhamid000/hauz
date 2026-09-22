import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { AppwriteException, ID } from "node-appwrite";
import { z } from "zod";

import { createAdminClient } from "#/server/appwrite.server";
import { allow } from "#/server/rate-limit.server";
import { setSessionCookie } from "#/server/session.server";

/** Also used by the sign-in form, so it rejects the same input before calling the server. */
export const signInEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254));

/** Appwrite emails 6 random digits. Spaces are dropped, since people paste codes like "123 456". */
export const signInCodeSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{6}$/));

// Appwrite does not rate limit requests made with the API key. Without these
// limits, anyone could use this endpoint to flood someone's inbox with codes.
const HOUR = 60 * 60 * 1000;
const CODES_PER_EMAIL_PER_HOUR = 5;
const CODES_PER_IP_PER_HOUR = 20;

export type SendSignInCodeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "rate_limited" | "failed" };

/**
 * Emails a one-time sign-in code. New and returning people go through the same
 * call: Appwrite creates the user if the email has never been seen.
 */
export const sendSignInCode = createServerFn({ method: "POST" })
  .validator(z.object({ email: signInEmailSchema }))
  .handler(async ({ data }): Promise<SendSignInCodeResult> => {
    // The socket address. Behind a proxy or CDN that is the proxy's address,
    // so a deployment has to read the client IP from the proxy's trusted header.
    const ip = getRequestIP() ?? "unknown";

    if (
      !allow(`sign-in-code:ip:${ip}`, CODES_PER_IP_PER_HOUR, HOUR) ||
      !allow(`sign-in-code:email:${data.email}`, CODES_PER_EMAIL_PER_HOUR, HOUR)
    ) {
      return { ok: false, reason: "rate_limited" };
    }

    try {
      const { account } = createAdminClient();
      const token = await account.createEmailToken({
        userId: ID.unique(),
        email: data.email,
      });

      // For an email that already has an account, Appwrite ignores the id we
      // sent and answers with the existing user's id. Always use the answer.
      return { ok: true, userId: token.userId };
    } catch (error) {
      logFailure("createEmailToken", error);
      if (error instanceof AppwriteException && error.code === 429) {
        return { ok: false, reason: "rate_limited" };
      }

      return { ok: false, reason: "failed" };
    }
  });

// Appwrite also skips its limit on code guesses for requests made with the API
// key. A code is only 6 digits, so without these limits it could be guessed.
const CODE_ATTEMPTS_PER_USER_PER_HOUR = 10;
const CODE_ATTEMPTS_PER_IP_PER_HOUR = 30;

/** An Appwrite user id: up to 36 letters, digits, periods, hyphens and underscores. */
const userIdSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/);

export type VerifySignInCodeResult =
  | { ok: true }
  | { ok: false; reason: "invalid_code" | "rate_limited" | "failed" };

/**
 * Checks the emailed code and signs the person in. The session secret goes into
 * an httpOnly cookie and never into the response, so browser JavaScript cannot
 * read it.
 */
export const verifySignInCode = createServerFn({ method: "POST" })
  .validator(z.object({ userId: userIdSchema, code: signInCodeSchema }))
  .handler(async ({ data }): Promise<VerifySignInCodeResult> => {
    const ip = getRequestIP() ?? "unknown";

    // The per-user counter matters most: an attacker can switch IP addresses,
    // but every guess at one person's code adds to the same count.
    if (
      !allow(`sign-in-attempt:ip:${ip}`, CODE_ATTEMPTS_PER_IP_PER_HOUR, HOUR) ||
      !allow(`sign-in-attempt:user:${data.userId}`, CODE_ATTEMPTS_PER_USER_PER_HOUR, HOUR)
    ) {
      return { ok: false, reason: "rate_limited" };
    }

    try {
      const { account } = createAdminClient();
      // Appwrite includes `secret` in the session only because this request uses the API key.
      const session = await account.createSession({
        userId: data.userId,
        secret: data.code,
      });

      setSessionCookie(session.secret, new Date(session.expire));
      return { ok: true };
    } catch (error) {
      // A wrong code, an expired one and an unknown user id all come back as
      // user_invalid_token, so the answer does not reveal which it was.
      if (error instanceof AppwriteException && error.type === "user_invalid_token") {
        return { ok: false, reason: "invalid_code" };
      }

      logFailure("createSession", error);
      if (error instanceof AppwriteException && error.code === 429) {
        return { ok: false, reason: "rate_limited" };
      }

      return { ok: false, reason: "failed" };
    }
  });

/** Logs enough to debug. The browser gets none of Appwrite's error, only a reason. */
function logFailure(operation: string, error: unknown) {
  if (error instanceof AppwriteException) {
    console.error(`${operation} failed: ${error.code} ${error.type}`);
  } else {
    console.error(`${operation} failed`, error);
  }
}
