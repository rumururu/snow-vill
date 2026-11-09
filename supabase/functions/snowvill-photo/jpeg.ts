/**
 * Minimal JPEG validator + metadata stripper (no decoding).
 * Keeps image-defining segments (SOFn, DQT, DHT, DRI, SOS + scan data, APP0/JFIF) and drops
 * APP1–APP15 (EXIF/GPS/XMP/ICC…) and COM segments. Pure function — shared by the Edge Function
 * (Deno) and the Vitest suite (Node).
 */

export interface SanitizedJpeg {
  bytes: Uint8Array;
  width: number;
  height: number;
  removedSegments: number;
}

const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

export function sanitizeJpeg(input: Uint8Array): SanitizedJpeg | null {
  const b = input;
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  let width = 0;
  let height = 0;
  let removed = 0;

  while (i < b.length) {
    if (b[i] !== 0xff) return null;
    while (i < b.length && b[i] === 0xff) i++; // fill bytes
    if (i >= b.length) return null;
    const marker = b[i];
    const start = i - 1;
    i++;

    if (marker === 0xd9) {
      parts.push(b.subarray(start, i));
      break; // EOI without scan → invalid below (no SOF/SOS)
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(b.subarray(start, i));
      continue;
    }
    if (i + 2 > b.length) return null;
    const len = (b[i] << 8) | b[i + 1];
    if (len < 2 || i + len > b.length) return null;
    const end = i + len;

    if (SOF_MARKERS.has(marker)) {
      if (len < 7) return null;
      height = (b[i + 3] << 8) | b[i + 4];
      width = (b[i + 5] << 8) | b[i + 6];
    }

    if (marker === 0xda) {
      // Start of scan: keep everything to the end (entropy data, further DHT/SOS for progressive).
      if (!width || !height) return null;
      const rest = b.subarray(start);
      if (rest.length < 2 || rest[rest.length - 2] !== 0xff || rest[rest.length - 1] !== 0xd9) return null;
      parts.push(rest);
      return { bytes: concat(parts), width, height, removedSegments: removed };
    }

    if ((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) removed++;
    else parts.push(b.subarray(start, end));
    i = end;
  }
  return null;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
