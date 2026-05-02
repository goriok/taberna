import { v4 as uuidv4 } from "uuid";

const COOKIE_NAME = "taberna-sid";
const COOKIE_MAX_AGE = 3600; // 1 hour in seconds

function makeSetCookieHeader(
  sessionId: string,
  maxAge: number,
): string {
  return `${COOKIE_NAME}=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function parseCookies(cookieHeader: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;

  for (const pair of cookieHeader.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) {
      cookies.set(key, value);
    }
  }

  return cookies;
}

/**
 * Reads the existing `taberna-sid` cookie from the request.
 * Returns the session ID string or `null` if not present.
 */
export function getSessionId(request: Request): string | null {
  const cookies = parseCookies(request.headers.get("cookie"));
  return cookies.get(COOKIE_NAME) ?? null;
}

/**
 * Reads the existing `taberna-sid` cookie, or creates a new UUID-based
 * session ID if absent. Returns the session ID and any response headers
 * needed to set the cookie on the response.
 *
 * When no cookie exists, the returned `responseHeaders` includes a
 * `Set-Cookie` header. Use these headers in your middleware or route
 * handler to persist the new session.
 */
export function getOrCreateSessionId(request: Request): {
  sessionId: string;
  responseHeaders: Headers;
} {
  const existing = getSessionId(request);

  if (existing) {
    return { sessionId: existing, responseHeaders: new Headers() };
  }

  const sessionId = uuidv4();
  const responseHeaders = new Headers();
  responseHeaders.set("Set-Cookie", makeSetCookieHeader(sessionId, COOKIE_MAX_AGE));

  return { sessionId, responseHeaders };
}

/**
 * Returns response headers that immediately expire the `taberna-sid` cookie.
 */
export function clearSession(): { headers: Headers } {
  const headers = new Headers();
  headers.set("Set-Cookie", makeSetCookieHeader("", 0));
  return { headers };
}
