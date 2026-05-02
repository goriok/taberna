import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOrCreateSessionId } from "@/lib/session";

export function middleware(request: NextRequest) {
  const { sessionId, responseHeaders } = getOrCreateSessionId(request);

  // Forward sessionId to API routes via custom request header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-session-id", sessionId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Merge Set-Cookie header if a new session was created
  responseHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
