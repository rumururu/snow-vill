/**
 * Client-side photo handling for the M0 prototype.
 *
 * - Type is decided by file signature (magic bytes), not by extension/MIME.
 * - The photo is center-cropped to 1:1 and re-encoded through a canvas, which
 *   drops EXIF/GPS metadata. The result stays in this browser session only.
 *
 * M1 must repeat signature/size/pixel validation and re-encoding server-side.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const OUTPUT_SIZE = 512;
export const MAX_SOURCE_PIXELS = 40_000_000;

export type ImageKind = "jpeg" | "png" | "webp";

export function detectImageType(bytes: Uint8Array): ImageKind | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  )
    return "png";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  )
    return "webp";
  return null;
}

export class PhotoError extends Error {
  constructor(
    public code: "TOO_LARGE" | "UNSUPPORTED" | "TOO_MANY_PIXELS" | "DECODE_FAILED",
    message: string,
  ) {
    super(message);
  }
}

async function readHead(file: Blob, n: number): Promise<Uint8Array> {
  const slice = file.slice(0, n);
  const buf =
    typeof slice.arrayBuffer === "function"
      ? await slice.arrayBuffer()
      : await new Response(slice).arrayBuffer();
  return new Uint8Array(buf);
}

/** Validate size and signature. Throws PhotoError with a Korean user message. */
export async function validatePhotoFile(file: Blob): Promise<ImageKind> {
  if (file.size > MAX_UPLOAD_BYTES) throw new PhotoError("TOO_LARGE", "사진은 10MB 이하만 올릴 수 있어요.");
  const kind = detectImageType(await readHead(file, 16));
  if (!kind) throw new PhotoError("UNSUPPORTED", "JPG, PNG, WEBP 사진만 올릴 수 있어요.");
  return kind;
}

/** Validate, center-crop to 1:1, resize to 512px and re-encode as JPEG (metadata stripped). */
export async function preparePhoto(file: Blob): Promise<string> {
  await validatePhotoFile(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError("DECODE_FAILED", "사진을 읽지 못했어요. 다른 사진으로 시도해 주세요.");
  }
  try {
    if (bitmap.width * bitmap.height > MAX_SOURCE_PIXELS)
      throw new PhotoError("TOO_MANY_PIXELS", "사진 해상도가 너무 커요.");
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new PhotoError("DECODE_FAILED", "사진을 처리하지 못했어요.");
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    bitmap.close();
  }
}
