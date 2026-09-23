import { ExecutionMethod } from "node-appwrite";

import { createSessionClient, requireEnv } from "#/server/appwrite.server";

/**
 * Runs the personal-account Function as the signed-in person.
 *
 * Appwrite checks the session before the Function runs and throws an
 * AppwriteException with code 401 when it is no longer valid. Otherwise it
 * tells the Function who is calling, so the Function never has to trust us.
 */
async function callFunction(
  sessionSecret: string,
  method: ExecutionMethod,
  body?: object,
) {
  const { functions } = createSessionClient(sessionSecret);
  const execution = await functions.createExecution({
    functionId: requireEnv("APPWRITE_FUNCTION_ID"),
    xpath: "/personal-account",
    method,
    ...(body && {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  });

  return { status: execution.responseStatusCode, body: execution.responseBody };
}

/** The caller's own account, or 404 when they have none yet. */
export function getPersonalAccount(sessionSecret: string) {
  return callFunction(sessionSecret, ExecutionMethod.GET);
}

/** 201 created, 200 when it already exists, 409 when it exists with another role. */
export function createPersonalAccount(
  sessionSecret: string,
  input: { firstName: string; lastName: string; role: string },
) {
  return callFunction(sessionSecret, ExecutionMethod.POST, input);
}
