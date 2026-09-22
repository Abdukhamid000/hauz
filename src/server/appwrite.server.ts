import { Account, Client } from "node-appwrite";

function requireEnv(name: string): string {
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
