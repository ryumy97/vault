import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";

import { getR2BucketName, getR2Client } from "./client";

function isNotFound(err: unknown): boolean {
  if (err && typeof err === "object" && "$metadata" in err) {
    const code = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    return code === 404;
  }
  return false;
}

export async function putBlob(
  key: string,
  body: NonNullable<PutObjectCommandInput["Body"]>,
  options?: {
    contentType?: string;
    cacheControl?: string;
  },
): Promise<void> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
      Body: body,
      ContentType: options?.contentType,
      CacheControl: options?.cacheControl,
    }),
  );
}

export async function getBlobBytes(key: string): Promise<{
  body: Uint8Array;
  contentType?: string;
  contentLength?: number;
}> {
  const out = await getR2Client().send(
    new GetObjectCommand({ Bucket: getR2BucketName(), Key: key }),
  );

  if (!out.Body) {
    return { body: new Uint8Array(), contentType: out.ContentType, contentLength: 0 };
  }

  const body = await out.Body.transformToByteArray();

  return {
    body,
    contentType: out.ContentType,
    contentLength: out.ContentLength,
  };
}

/** For piping to a Response body without buffering the whole object. */
export async function getBlobStream(key: string): Promise<{
  body: GetObjectCommandOutput["Body"];
  contentType?: string;
  contentLength?: number;
  etag?: string;
}> {
  const out = await getR2Client().send(
    new GetObjectCommand({ Bucket: getR2BucketName(), Key: key }),
  );

  return {
    body: out.Body,
    contentType: out.ContentType,
    contentLength: out.ContentLength,
    etag: out.ETag,
  };
}

export async function deleteBlob(key: string): Promise<void> {
  await getR2Client().send(new DeleteObjectCommand({ Bucket: getR2BucketName(), Key: key }));
}

export type ListedBlob = {
  key: string;
  size: number;
  lastModified?: Date;
};

export async function listBlobs(options?: {
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  continuationToken?: string;
}): Promise<{
  objects: ListedBlob[];
  commonPrefixes: string[];
  continuationToken?: string;
  isTruncated: boolean;
}> {
  const out = await getR2Client().send(
    new ListObjectsV2Command({
      Bucket: getR2BucketName(),
      Prefix: options?.prefix ?? "",
      Delimiter: options?.delimiter,
      MaxKeys: options?.maxKeys,
      ContinuationToken: options?.continuationToken,
    }),
  );

  const objects =
    out.Contents?.map((c) => ({
      key: c.Key!,
      size: c.Size ?? 0,
      lastModified: c.LastModified,
    })) ?? [];

  const commonPrefixes = out.CommonPrefixes?.map((p) => p.Prefix!).filter(Boolean) ?? [];

  return {
    objects,
    commonPrefixes,
    continuationToken: out.NextContinuationToken,
    isTruncated: out.IsTruncated ?? false,
  };
}

export async function headBlob(key: string): Promise<{
  contentType?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
} | null> {
  try {
    const out = await getR2Client().send(
      new HeadObjectCommand({ Bucket: getR2BucketName(), Key: key }),
    );
    return {
      contentType: out.ContentType,
      contentLength: out.ContentLength,
      etag: out.ETag,
      lastModified: out.LastModified,
    };
  } catch (err) {
    if (isNotFound(err)) {
      return null;
    }
    throw err;
  }
}
