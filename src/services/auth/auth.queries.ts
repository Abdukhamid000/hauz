import { mutationOptions } from "@tanstack/react-query";

import { sendSignInCode, type SendSignInCodeResult } from "./auth.functions";

type SendSignInCodeFailure = Extract<SendSignInCodeResult, { ok: false }>["reason"];

/**
 * The server function reports failures as data. The mutation below turns them
 * into this error, so components read every failure from `mutation.error`.
 */
export class SendSignInCodeError extends Error {
  readonly reason: SendSignInCodeFailure;

  constructor(reason: SendSignInCodeFailure) {
    super(`Could not send the sign-in code (${reason}).`);
    this.name = "SendSignInCodeError";
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
          throw new SendSignInCodeError(result.reason);
        }

        return { userId: result.userId };
      },
    }),
};
