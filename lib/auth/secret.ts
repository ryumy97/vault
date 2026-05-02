export function getAuthSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length > 0) {
    return new TextEncoder().encode(secret);
  }
  if (process.env.NODE_ENV === "development") {
    return new TextEncoder().encode(
      "dev-only-archive-auth-secret-do-not-use-in-production",
    );
  }
  throw new Error("AUTH_SECRET is required in production");
}
