import "server-only";

import { S3Client } from "@aws-sdk/client-s3";
import { R2_ACCESS_KEY_ID, R2_BUCKET, R2_ENDPOINT, R2_SECRET_ACCESS_KEY } from "@/lib/env";

let cachedClient: S3Client | null = null;

/**
 * Shared S3-compatible client for Cloudflare R2.
 *
 * Required env: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`
 */
export function getR2Client(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT?.trim(),
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  return cachedClient;
}

export function getR2BucketName(): string {
  return R2_BUCKET;
}
