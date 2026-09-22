import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { AppwriteException, ID } from "node-appwrite";
import { z } from "zod";

import { createAdminClient } from "#/server/appwrite.server";
import { allow } from "#/server/rate-limit.server";

/** Also used by the sign-in form, so it rejects the same input before calling the server. */
export const signInEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254));

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
      // Log enough to debug, but send the browser nothing from Appwrite's error.
      if (error instanceof AppwriteException) {
        console.error(`createEmailToken failed: ${error.code} ${error.type}`);
        if (error.code === 429) {
          return { ok: false, reason: "rate_limited" };
        }
      } else {
        console.error("createEmailToken failed", error);
      }

      return { ok: false, reason: "failed" };
    }
  });
