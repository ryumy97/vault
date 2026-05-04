import exifr from "exifr";

import type { FileMetadataKv } from "@/db/schema";
import { isImageFile } from "@/lib/is-image-file";

function put(meta: FileMetadataKv, label: string, value: unknown) {
  if (value === undefined || value === null) {
    return;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    meta[label] = value.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    return;
  }
  if (typeof value === "boolean") {
    meta[label] = value;
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return;
    }
    meta[label] = value;
    return;
  }
  const s = String(value).trim();
  if (s) {
    meta[label] = s.slice(0, 1024);
  }
}

function num(x: unknown): number | undefined {
  if (typeof x === "number" && Number.isFinite(x)) {
    return x;
  }
  if (typeof x === "string" && x.trim() !== "") {
    const n = Number(x);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** EXIF / exifr “revived” date-like values → epoch ms for DB `source_file_created_at`. */
export function exifTimestampToMs(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (
    typeof value === "object" &&
    "getTime" in value &&
    typeof (value as { getTime: () => unknown }).getTime === "function"
  ) {
    const t = (value as { getTime: () => number }).getTime();
    return Number.isFinite(t) && !Number.isNaN(t) ? t : null;
  }
  if (typeof value === "string") {
    const d = new Date(value.trim());
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 1e12) {
      return Math.round(value);
    }
    if (value > 1e9) {
      return Math.round(value * 1000);
    }
  }
  return null;
}

function formatExposureTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return String(seconds);
  }
  if (seconds >= 1) {
    const r = Math.round(seconds * 100) / 100;
    return r === Math.floor(r) ? `${r} s` : `${r} s`;
  }
  const inv = Math.round(1 / seconds);
  return `1/${inv}`;
}

function formatFNumber(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  const s = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `f/${s}`;
}

function exposureTimeLabel(x: unknown): string | undefined {
  const v = num(x);
  if (v != null) {
    return formatExposureTime(v);
  }
  if (typeof x === "string" && x.trim()) {
    return x.trim();
  }
  return undefined;
}

function fNumberLabel(x: unknown): string | undefined {
  if (typeof x === "number" && Number.isFinite(x)) {
    return formatFNumber(x);
  }
  if (Array.isArray(x) && x.length >= 2) {
    const a = num(x[0]);
    const b = num(x[1]);
    if (a != null && b != null && b !== 0) {
      return formatFNumber(a / b);
    }
  }
  return undefined;
}

function focalLengthLabel(x: unknown): string | undefined {
  if (typeof x === "number" && Number.isFinite(x)) {
    return `${Math.round(x)} mm`;
  }
  if (Array.isArray(x) && x.length >= 1) {
    const a = num(x[0]);
    const b = num(x[1]);
    if (a != null && b != null && b !== 0) {
      return `${Math.round((a / b) * 10) / 10} mm`;
    }
    if (a != null) {
      return `${Math.round(a)} mm`;
    }
  }
  return undefined;
}

function resolutionLine(data: Record<string, unknown>): string | undefined {
  const x = num(data.XResolution);
  const y = num(data.YResolution);
  if (x == null || y == null) {
    return undefined;
  }
  const unit = data.ResolutionUnit;
  const unitStr =
    unit === "inches" || unit === 2
      ? "dpi"
      : unit === "cm" || unit === 3
        ? "dpcm"
        : typeof unit === "string"
          ? unit
          : "";
  const pair = `${Math.round(x)}×${Math.round(y)}`;
  return unitStr ? `${pair} ${unitStr}` : pair;
}

export type UploadFileExtraction = {
  metadata: FileMetadataKv | undefined;
  /** EXIF capture / original time when present (images only). */
  sourceFileCreatedMs: number | null;
};

/**
 * Best-effort EXIF / ICC metadata for images, plus EXIF-based capture time when present.
 * Safe to call on any `File`.
 */
export async function extractUploadMetadata(file: File): Promise<UploadFileExtraction> {
  if (!isImageFile(file.name, file.type)) {
    return { metadata: undefined, sourceFileCreatedMs: null };
  }

  let data: Record<string, unknown>;
  try {
    const parsed = await exifr.parse(file, {
      icc: true,
      iptc: false,
      xmp: false,
      jfif: false,
      translateKeys: true,
      translateValues: true,
      reviveValues: true,
      mergeOutput: true,
    });
    if (!parsed || typeof parsed !== "object") {
      return { metadata: undefined, sourceFileCreatedMs: null };
    }
    data = parsed as Record<string, unknown>;
  } catch {
    return { metadata: undefined, sourceFileCreatedMs: null };
  }

  const contentCreatedRaw =
    data.DateTimeOriginal ?? data.CreateDate ?? data.DateCreated ?? data.DateTime;
  const sourceFileCreatedMs = exifTimestampToMs(contentCreatedRaw);

  const meta: FileMetadataKv = {};

  const w =
    num(data.ExifImageWidth) ??
    num(data.ImageWidth) ??
    num(data.PixelXDimension) ??
    num(data.width);
  const h =
    num(data.ExifImageHeight) ??
    num(data.ImageHeight) ??
    num(data.PixelYDimension) ??
    num(data.height);

  if (w != null && h != null) {
    put(meta, "Dimensions", `${Math.round(w)}×${Math.round(h)}`);
  }

  const res = resolutionLine(data);
  if (res) {
    put(meta, "Resolution", res);
  }

  put(meta, "Colour space", data.ColorSpace);
  put(meta, "Colour profile", data.ProfileDescription ?? data.PreferredCMM ?? data.ProfileName);

  put(meta, "Device make", data.Make);
  put(meta, "Device model", data.Model);
  put(meta, "Lens model", data.LensModel ?? data.Lens);

  const exp = exposureTimeLabel(data.ExposureTime);
  if (exp) {
    put(meta, "Exposure time", exp);
  }

  const f = fNumberLabel(data.FNumber);
  if (f) {
    put(meta, "F number", f);
  }

  const fl = focalLengthLabel(data.FocalLength);
  if (fl) {
    put(meta, "Focal length", fl);
  }

  const isoRaw = data.ISO ?? data.ISOSpeedRatings;
  const iso = Array.isArray(isoRaw) ? num(isoRaw[0]) : num(isoRaw);
  if (iso != null) {
    put(meta, "ISO speed", iso);
  }

  put(meta, "Flash", data.Flash);
  put(meta, "Exposure program", data.ExposureProgram);
  put(meta, "Metering mode", data.MeteringMode);
  put(meta, "White balance", data.WhiteBalance);
  put(meta, "Content Creator", data.Software ?? data.Artist);

  put(meta, "Content created", contentCreatedRaw);

  put(meta, "Modified", data.ModifyDate ?? data.ModifiedDate);

  return {
    metadata: Object.keys(meta).length > 0 ? meta : undefined,
    sourceFileCreatedMs,
  };
}
