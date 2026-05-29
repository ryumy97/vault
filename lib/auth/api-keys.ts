import { timingSafeEqual } from "node:crypto";

const API_KEYS_ENV = "ADMIN_API_KEYS";

function parseApiKeysFromEnv(): string[] {
  const raw = process.env[API_KEYS_ENV]?.trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

function keysMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

/** Whether any API keys are configured (`ARCHIVE_API_KEYS`, comma-separated). */
export function hasConfiguredApiKeys(): boolean {
  return parseApiKeysFromEnv().length > 0;
}

/** Constant-time check against configured API keys. */
export function verifyApiKey(candidate: string | null | undefined): boolean {
  if (!candidate) {
    return false;
  }
  const configured = parseApiKeysFromEnv();
  return configured.some((key) => keysMatch(candidate, key));
}
