import { describe, expect, it } from "vitest";
import { detectImageType, MAX_UPLOAD_BYTES, PhotoError, validatePhotoFile } from "./image";

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0];

describe("image signature detection", () => {
  it("detects jpeg/png/webp by magic bytes", () => {
    expect(detectImageType(new Uint8Array(JPEG))).toBe("jpeg");
    expect(detectImageType(new Uint8Array(PNG))).toBe("png");
    expect(detectImageType(new Uint8Array(WEBP))).toBe("webp");
  });
  it("rejects other formats regardless of claimed MIME", async () => {
    expect(detectImageType(new Uint8Array(GIF))).toBeNull();
    const fake = new File([new Uint8Array(GIF)], "photo.jpg", { type: "image/jpeg" });
    await expect(validatePhotoFile(fake)).rejects.toBeInstanceOf(PhotoError);
    const html = new File(["<html><script>"], "x.png", { type: "image/png" });
    await expect(validatePhotoFile(html)).rejects.toMatchObject({ code: "UNSUPPORTED" });
  });
  it("rejects files over 10MB", async () => {
    const big = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "big.jpg");
    await expect(validatePhotoFile(big)).rejects.toMatchObject({ code: "TOO_LARGE" });
  });
  it("accepts a valid jpeg header", async () => {
    await expect(validatePhotoFile(new File([new Uint8Array(JPEG)], "a.jpg"))).resolves.toBe("jpeg");
  });
});
