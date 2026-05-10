"use server";

import { cookies } from "next/headers";

import {
  DIRECTORY_VIEW_MODE_COOKIE,
  type DirectoryViewMode,
  parseDirectoryViewMode,
} from "@/lib/view-mode";

export async function setDirectoryViewModeAction(viewMode: DirectoryViewMode): Promise<void> {
  const normalized = parseDirectoryViewMode(viewMode);
  const cookieStore = await cookies();
  cookieStore.set(DIRECTORY_VIEW_MODE_COOKIE, normalized, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
