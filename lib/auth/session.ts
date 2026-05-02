import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "./constants";
import { createSessionToken, verifySessionToken } from "./jwt";

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export async function getSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function createAndStoreSession(): Promise<void> {
  const token = await createSessionToken();
  await setSessionCookie(token);
}
