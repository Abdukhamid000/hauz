import { Account, AppwriteException, Client, Functions } from "node-appwrite";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

/**
 * An Appwrite client that uses the project's API key.
 *
 * The `.server.ts` name matters: TanStack Start refuses to put a `.server.*`
 * file into the browser bundle, so the key cannot leak through an import.
 *
 * Appwrite skips its rate limits for requests made with a key. Every server
 * function that uses this client has to limit its own callers.
 */
export function createAdminClient() {
  const client = new Client()
    .setEndpoint(requireEnv("APPWRITE_ENDPOINT"))
    .setProject(requireEnv("APPWRITE_PROJECT_ID"))
    .setKey(requireEnv("APPWRITE_API_KEY"));

  return { account: new Account(client) };
}

/**
 * An Appwrite client that acts as one signed-in person: it sends their session
 * secret instead of the API key. Appwrite checks the secret on every call, so
 * whatever we call this way runs with that person's identity and nothing more.
 */
export function createSessionClient(sessionSecret: string) {
  const client = new Client()
    .setEndpoint(requireEnv("APPWRITE_ENDPOINT"))
    .setProject(requireEnv("APPWRITE_PROJECT_ID"))
    .setSession(sessionSecret);

  return { functions: new Functions(client) };
}

/** Logs enough to debug. The browser gets none of Appwrite's error, only a reason. */
export function logFailure(operation: string, error: unknown) {
  if (error instanceof AppwriteException) {
    console.error(`${operation} failed: ${error.code} ${error.type}`);
  } else {
    console.error(`${operation} failed`, error);
  }
}
