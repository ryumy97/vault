import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let cachedClient: S3Client | null = null;

/**
 * Shared S3-compatible client for Cloudflare R2.
 *
 * Required env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
 * Optional: `R2_ENDPOINT` (defaults to `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`),
 * `R2_FORCE_PATH_STYLE` (`true` by default; set to `false` if your setup needs virtual-hosted style).
 */
export function getR2Client(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  const accountId = requireEnv("R2_ACCOUNT_ID");
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    `https://${accountId}.r2.cloudflarestorage.com`;

  const forcePathStyle = process.env.R2_FORCE_PATH_STYLE !== "false";

  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
    forcePathStyle,
  });

  return cachedClient;
}

export function getR2BucketName(): string {
  return requireEnv("R2_BUCKET");
}
