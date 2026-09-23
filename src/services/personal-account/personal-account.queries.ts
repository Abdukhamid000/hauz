import { mutationOptions } from "@tanstack/react-query";

import {
  createPersonalAccount,
  type CreatePersonalAccountResult,
  type OnboardingInput,
} from "./personal-account.functions";

type Failure<Result> = Result extends { ok: false; reason: infer Reason }
  ? Reason
  : never;

/** Like AuthError: a failure reported as data becomes an error the page can read. */
export class PersonalAccountError extends Error {
  readonly reason: Failure<CreatePersonalAccountResult>;

  constructor(reason: Failure<CreatePersonalAccountResult>) {
    super(`Personal account request failed (${reason}).`);
    this.name = "PersonalAccountError";
    this.reason = reason;
  }
}

export const personalAccountMutations = {
  create: () =>
    mutationOptions({
      mutationKey: ["personal-account", "create"],
      mutationFn: async (input: OnboardingInput) => {
        const result = await createPersonalAccount({ data: input });
        if (!result.ok) {
          throw new PersonalAccountError(result.reason);
        }
      },
    }),
};
