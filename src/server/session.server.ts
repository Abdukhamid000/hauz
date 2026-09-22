import { setCookie } from "@tanstack/react-start/server";

/** The Appwrite session secret lives in this cookie and nowhere else in the browser. */
export const SESSION_COOKIE = "hauz_session";

/**
 * httpOnly: browser JavaScript cannot read the cookie, which the task requires.
 * SameSite=Lax: the cookie still comes along when someone follows a link to the
 * site, so the first page they land on knows who they are.
 * Secure only in production builds, because the dev server is plain http.
 */
export function setSessionCookie(secret: string, expires: Date) {
  setCookie(SESSION_COOKIE, secret, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
    expires,
  });
}
