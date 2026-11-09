import { describe, expect, it } from "vitest";
import { sanitizeJpeg } from "./jpeg";

const seg = (marker: number, payload: number[]) => {
  const len = payload.length + 2;
  return [0xff, marker, len >> 8, len & 0xff, ...payload];
};
const SOI = [0xff, 0xd8];
const EOI = [0xff, 0xd9];
const APP0 = seg(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
const EXIF = seg(0xe1, [0x45, 0x78, 0x69, 0x66, 0, 0, ...Array(20).fill(0x47)]); // "Exif" + fake GPS bytes
const COM = seg(0xfe, [0x63, 0x61, 0x6d]);
const DQT = seg(0xdb, [0, ...Array(64).fill(1)]);
const sof = (w: number, h: number) => seg(0xc0, [8, h >> 8, h & 0xff, w >> 8, w & 0xff, 1, 1, 0x11, 0]);
const SOS = [...seg(0xda, [1, 1, 0, 0, 63, 0]), 0x12, 0x34, 0xff, 0x00, 0x56];

const jpeg = (...parts: number[][]) => new Uint8Array(parts.flat());

describe("sanitizeJpeg", () => {
  it("strips EXIF (APP1) and COM segments, keeps image data", () => {
    const input = jpeg(SOI, APP0, EXIF, COM, DQT, sof(512, 512), SOS, EOI);
    const out = sanitizeJpeg(input);
    expect(out).not.toBeNull();
    expect(out!.width).toBe(512);
    expect(out!.height).toBe(512);
    expect(out!.removedSegments).toBe(2);
    expect(Array.from(out!.bytes)).toEqual(Array.from(jpeg(SOI, APP0, DQT, sof(512, 512), SOS, EOI)));
    expect(Buffer.from(out!.bytes).includes(Buffer.from("Exif"))).toBe(false);
  });

  it("reads dimensions from progressive SOF2", () => {
    const sof2 = seg(0xc2, [8, 0x03, 0x00, 0x04, 0x00, 1, 1, 0x11, 0]);
    expect(sanitizeJpeg(jpeg(SOI, DQT, sof2, SOS, EOI))).toMatchObject({ width: 1024, height: 768 });
  });

  it("rejects non-JPEG, truncated and malformed input", () => {
    expect(sanitizeJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(sanitizeJpeg(jpeg(SOI, APP0, DQT, sof(10, 10), SOS))).toBeNull(); // no EOI
    expect(sanitizeJpeg(jpeg(SOI, APP0, EOI))).toBeNull(); // no frame/scan
    expect(sanitizeJpeg(jpeg(SOI, [0xff, 0xe1, 0xff, 0xff, 0]))).toBeNull(); // length past end
    expect(sanitizeJpeg(jpeg(SOI, DQT, SOS, EOI))).toBeNull(); // scan before frame
  });
});
