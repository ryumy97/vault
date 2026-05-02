import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token && (await verifySessionToken(token))) {
    return NextResponse.next();
  }

  const signInUrl = new URL("/signin", request.url);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    "/((?!signin|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
