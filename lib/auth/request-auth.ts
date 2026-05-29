import type { NextRequest } from "next/server";

import { verifyApiKey } from "@/lib/auth/api-keys";
import { API_KEY_HEADER, SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";

type RequestLike = Pick<Request, "headers"> & {
  cookies?: Pick<NextRequest["cookies"], "get">;
};

function parseCookieValue(
  cookieHeader: string | null,
  name: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    if (trimmed.slice(0, eq) === name) {
      return trimmed.slice(eq + 1);
    }
  }
  return undefined;
}

function getSessionToken(request: RequestLike): string | undefined {
  const fromJar = request.cookies?.get(SESSION_COOKIE_NAME)?.value;
  if (fromJar) {
    return fromJar;
  }
  return parseCookieValue(request.headers.get("cookie"), SESSION_COOKIE_NAME);
}

/** Reads an API key from `Authorization: Bearer …` or `X-API-Key`. */
export function extractApiKeyFromRequest(request: RequestLike): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  const headerKey = request.headers.get(API_KEY_HEADER);
  if (headerKey?.trim()) {
    return headerKey.trim();
  }

  return null;
}

export async function isRequestAuthorized(
  request: RequestLike,
): Promise<boolean> {
  const sessionToken = getSessionToken(request);
  if (sessionToken && (await verifySessionToken(sessionToken))) {
    return true;
  }

  return verifyApiKey(extractApiKeyFromRequest(request));
}

/** Returns a 401 JSON response when the request is not authorized; otherwise `null`. */
export async function requireRequestAuth(
  request: Request,
): Promise<Response | null> {
  if (await isRequestAuthorized(request)) {
    return null;
  }
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
