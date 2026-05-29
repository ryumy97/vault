import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isRequestAuthorized } from "@/lib/auth/request-auth";

/** Public image stream; not gated by session (see `app/files/[id]/image/route.ts`). */
const FILE_IMAGE_PATH = /^\/files\/[^/]+\/image$/;
const API_PATH = /^\/api\//;

export async function proxy(request: NextRequest) {
  if (FILE_IMAGE_PATH.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (await isRequestAuthorized(request)) {
    return NextResponse.next();
  }

  if (API_PATH.test(request.nextUrl.pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signInUrl = new URL("/signin", request.url);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    "/((?!signin|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
