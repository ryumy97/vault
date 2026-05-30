import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let cachedClient: S3Client | null = null;

function getScriptR2Client(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: requireEnv("R2_ENDPOINT"),
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });

  return cachedClient;
}

/** R2 byte read for standalone scripts (avoids Next.js `server-only` imports). */
export async function getBlobBytesForScript(key: string): Promise<Uint8Array> {
  const out = await getScriptR2Client().send(
    new GetObjectCommand({
      Bucket: requireEnv("R2_BUCKET"),
      Key: key,
    }),
  );

  if (!out.Body) {
    return new Uint8Array();
  }

  return out.Body.transformToByteArray();
}
