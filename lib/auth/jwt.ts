import { jwtVerify, SignJWT } from "jose";

import { getAuthSecretKey } from "./secret";

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAuthSecretKey());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getAuthSecretKey());
    return true;
  } catch {
    return false;
  }
}
