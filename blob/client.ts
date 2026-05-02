import "server-only";

import { S3Client } from "@aws-sdk/client-s3";
import { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } from "@/lib/env";
import { R2_ENDPOINT } from "@/lib/env";
import { R2_BUCKET } from "@/lib/env";

const cachedClient: S3Client | null = null;

/**
 * Shared S3-compatible client for Cloudflare R2.
 *
 * Required env: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, 'R2_FORCE_PATH_STYLE'
 */
export function getR2Client(): S3Client {
  if (cachedClient !== null) {
    return cachedClient;
  }

  return new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT?.trim(),
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

export function getR2BucketName(): string {
  return R2_BUCKET;
}
