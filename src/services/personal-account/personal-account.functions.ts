import { createServerFn } from "@tanstack/react-start";
import { AppwriteException } from "node-appwrite";
import { z } from "zod";

import { logFailure } from "#/server/appwrite.server";
import { createPersonalAccount as createOnAppwrite } from "#/server/personal-account.server";
import { deleteSessionCookie, getSessionSecret } from "#/server/session.server";

/** The two roles the Function accepts. A role cannot be changed afterwards. */
export const personalRoles = ["property_owner", "realtor"] as const;

/** Shared with the onboarding form, so it rejects the same input before the server does. */
export const onboardingSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  role: z.enum(personalRoles),
});

export type OnboardingInput = z.output<typeof onboardingSchema>;

export type CreatePersonalAccountResult =
  | { ok: true }
  | { ok: false; reason: "signed_out" | "role_conflict" | "failed" };

/**
 * Creates the caller's Personal Account. Nothing here says who the person is:
 * the Function learns that from Appwrite, which checks the session cookie.
 */
export const createPersonalAccount = createServerFn({ method: "POST" })
  .validator(onboardingSchema)
  .handler(async ({ data }): Promise<CreatePersonalAccountResult> => {
    const secret = getSessionSecret();
    if (!secret) {
      return { ok: false, reason: "signed_out" };
    }

    try {
      const response = await createOnAppwrite(secret, data);

      // 201 created it. 200 means it already existed with the same role, which
      // is what a second click gets, so double clicking cannot make two accounts.
      if (response.status === 201 || response.status === 200) {
        return { ok: true };
      }

      // 409: an account exists with the other role, so this is not a retry.
      if (response.status === 409) {
        return { ok: false, reason: "role_conflict" };
      }

      throw new Error(`personal-account answered ${response.status}`);
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 401) {
        deleteSessionCookie();
        return { ok: false, reason: "signed_out" };
      }

      logFailure("createPersonalAccount", error);
      return { ok: false, reason: "failed" };
    }
  });
