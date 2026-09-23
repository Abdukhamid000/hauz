import { ExecutionMethod } from "node-appwrite";

import { createSessionClient, requireEnv } from "#/server/appwrite.server";

/**
 * GET /personal-account on the Function, run as the signed-in person.
 *
 * Appwrite checks the session before the Function runs and throws an
 * AppwriteException with code 401 when it is no longer valid. Otherwise it
 * tells the Function who is calling, so the Function never has to trust us.
 */
export async function getPersonalAccount(sessionSecret: string) {
  const { functions } = createSessionClient(sessionSecret);
  const execution = await functions.createExecution({
    functionId: requireEnv("APPWRITE_FUNCTION_ID"),
    xpath: "/personal-account",
    method: ExecutionMethod.GET,
  });

  return { status: execution.responseStatusCode, body: execution.responseBody };
}
