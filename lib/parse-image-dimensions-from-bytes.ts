import exifr from "exifr";

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function normalizeDimensions(
  width: number | undefined,
  height: number | undefined,
): { width: number; height: number } | null {
  if (width == null || height == null) {
    return null;
  }
  const w = Math.round(width);
  const h = Math.round(height);
  if (w <= 0 || h <= 0 || w > 32768 || h > 32768) {
    return null;
  }
  return { width: w, height: h };
}

/** Swap width/height when EXIF orientation rotates the displayed image (e.g. 90°/270°). */
export async function applyExifDisplayOrientation(
  bytes: Uint8Array,
  dimensions: { width: number; height: number },
): Promise<{ width: number; height: number }> {
  try {
    const rotation = await exifr.rotation(bytes);
    if (rotation?.dimensionSwapped) {
      return { width: dimensions.height, height: dimensions.width };
    }
  } catch {
    // keep stored pixel order
  }
  return dimensions;
}

async function parseRawImageDimensionsFromBuffer(
  bytes: Uint8Array,
): Promise<{ width: number; height: number } | null> {
  try {
    const parsed = await exifr.parse(bytes, {
      icc: false,
      iptc: false,
      xmp: false,
      jfif: true,
      translateKeys: true,
      translateValues: false,
      reviveValues: false,
      mergeOutput: true,
    });

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const data = parsed as Record<string, unknown>;
    const width =
      num(data.ExifImageWidth) ??
      num(data.ImageWidth) ??
      num(data.PixelXDimension) ??
      num(data.width);
    const height =
      num(data.ExifImageHeight) ??
      num(data.ImageHeight) ??
      num(data.PixelYDimension) ??
      num(data.height);

    return normalizeDimensions(width, height);
  } catch {
    return null;
  }
}

async function parseImageDimensionsFromBuffer(
  input: Blob | Uint8Array,
): Promise<{ width: number; height: number } | null> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(await input.arrayBuffer());
  if (bytes.length === 0) {
    return null;
  }

  const raw = await parseRawImageDimensionsFromBuffer(bytes);
  if (!raw) {
    return null;
  }

  return applyExifDisplayOrientation(bytes, raw);
}

/** Display-oriented pixel size from encoded image bytes (applies EXIF orientation). */
export async function parseImageDimensionsFromBytes(
  bytes: Uint8Array,
): Promise<{ width: number; height: number } | null> {
  return parseImageDimensionsFromBuffer(bytes);
}

/** Display-oriented pixel size from an uploaded file/blob. */
export async function parseImageDimensionsFromFile(
  file: Blob,
): Promise<{ width: number; height: number } | null> {
  return parseImageDimensionsFromBuffer(file);
}

/** Stored sensor pixel size before EXIF display rotation is applied. */
export async function parseRawImageDimensionsFromFile(
  file: Blob,
): Promise<{ width: number; height: number } | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length === 0) {
    return null;
  }
  return parseRawImageDimensionsFromBuffer(bytes);
}

export async function parseRawImageDimensionsFromBytes(
  bytes: Uint8Array,
): Promise<{ width: number; height: number } | null> {
  return parseRawImageDimensionsFromBuffer(bytes);
}
