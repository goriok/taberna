import { describe, it, expect } from "vitest";
import { getOrCreateSessionId, getSessionId, clearSession } from "@/lib/session";
import { v4 as uuidv4 } from "uuid";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("getSessionId", () => {
  it("returns null when no cookie header exists", () => {
    const request = new Request("http://localhost:3000/api/health");
    expect(getSessionId(request)).toBeNull();
  });

  it("returns null when taberna-sid cookie is not present", () => {
    const request = new Request("http://localhost:3000/api/health", {
      headers: { cookie: "other-cookie=value" },
    });
    expect(getSessionId(request)).toBeNull();
  });

  it("returns the session ID when taberna-sid cookie exists", () => {
    const sid = uuidv4();
    const request = new Request("http://localhost:3000/api/health", {
      headers: { cookie: `taberna-sid=${sid}` },
    });
    expect(getSessionId(request)).toBe(sid);
  });

  it("reads taberna-sid among multiple cookies", () => {
    const sid = uuidv4();
    const request = new Request("http://localhost:3000/api/health", {
      headers: { cookie: `foo=bar; taberna-sid=${sid}; baz=qux` },
    });
    expect(getSessionId(request)).toBe(sid);
  });
});

describe("getOrCreateSessionId", () => {
  it("creates a new UUID when no cookie exists", () => {
    const request = new Request("http://localhost:3000/api/health");
    const { sessionId, responseHeaders } = getOrCreateSessionId(request);

    expect(sessionId).toMatch(UUID_RE);
    expect(responseHeaders.has("Set-Cookie")).toBe(true);
  });

  it("returns a Set-Cookie with correct attributes for new session", () => {
    const request = new Request("http://localhost:3000/api/health");
    const { sessionId, responseHeaders } = getOrCreateSessionId(request);
    const cookie = responseHeaders.get("Set-Cookie")!;

    expect(cookie).toContain(`taberna-sid=${sessionId}`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=3600");
  });

  it("returns the existing session ID when cookie is present", () => {
    const existing = uuidv4();
    const request = new Request("http://localhost:3000/api/health", {
      headers: { cookie: `taberna-sid=${existing}` },
    });
    const { sessionId, responseHeaders } = getOrCreateSessionId(request);

    expect(sessionId).toBe(existing);
    expect(responseHeaders.has("Set-Cookie")).toBe(false);
  });

  it("generates a unique ID on each call when no cookie", () => {
    const request1 = new Request("http://localhost:3000/api/health");
    const request2 = new Request("http://localhost:3000/api/health");
    const { sessionId: id1 } = getOrCreateSessionId(request1);
    const { sessionId: id2 } = getOrCreateSessionId(request2);

    expect(id1).not.toBe(id2);
  });
});

describe("clearSession", () => {
  it("returns headers that expire the cookie", () => {
    const { headers } = clearSession();
    const cookie = headers.get("Set-Cookie")!;

    expect(cookie).toContain("taberna-sid=");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
  });
});
