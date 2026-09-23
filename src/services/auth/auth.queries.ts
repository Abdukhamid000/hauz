import { mutationOptions, queryOptions } from "@tanstack/react-query";

import {
  getViewer,
  sendSignInCode,
  verifySignInCode,
  type SendSignInCodeResult,
  type VerifySignInCodeResult,
} from "./auth.functions";

export const authQueries = {
  /** The root route loads this before any page renders, and the header reads it. */
  viewer: () =>
    queryOptions({
      queryKey: ["auth", "viewer"],
      queryFn: () => getViewer(),
    }),
};

type Failure<Result> = Result extends { ok: false; reason: infer Reason }
  ? Reason
  : never;
export type AuthFailure =
  | Failure<SendSignInCodeResult>
  | Failure<VerifySignInCodeResult>;

/**
 * The server functions report failures as data. The mutations below turn them
 * into this error, so components read every failure from `mutation.error`.
 */
export class AuthError extends Error {
  readonly reason: AuthFailure;

  constructor(reason: AuthFailure) {
    super(`Sign-in failed (${reason}).`);
    this.name = "AuthError";
    this.reason = reason;
  }
}

export const authMutations = {
  sendSignInCode: () =>
    mutationOptions({
      mutationKey: ["auth", "send-sign-in-code"],
      mutationFn: async (email: string) => {
        const result = await sendSignInCode({ data: { email } });
        if (!result.ok) {
          throw new AuthError(result.reason);
        }

        return { userId: result.userId };
      },
    }),

  verifySignInCode: () =>
    mutationOptions({
      mutationKey: ["auth", "verify-sign-in-code"],
      mutationFn: async (input: { userId: string; code: string }) => {
        const result = await verifySignInCode({ data: input });
        if (!result.ok) {
          throw new AuthError(result.reason);
        }
      },
    }),
};
