"use server";

import { redirect } from "next/navigation";

import { getAdminCredentials } from "@/lib/auth/credentials";
import { createAndStoreSession } from "@/lib/auth/session";

export type SignInState = {
  error: string | null;
};

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const username = formData.get("username")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  let expected: { username: string; password: string };
  try {
    expected = getAdminCredentials();
  } catch {
    return { error: "Sign-in is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD." };
  }

  if (username !== expected.username || password !== expected.password) {
    return { error: "Invalid username or password." };
  }

  await createAndStoreSession();
  redirect("/dir");
}
