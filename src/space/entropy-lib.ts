// Shared arithmetic for the entropy views. True entropy plotted in three dimensions fills the cube as a structureless
// cloud; a deterministic generator betrays its arithmetic as planes. These turn byte streams, and IBM's RANDU, into
// point clouds. Came from bradley.io/trng/space via tinymachines.ai/hotbits/space (2026-08-29, 2026-10-14).
import { mix, type Rgb } from "../lib/tokens";

/** Bytes three at a time as (x, y, z) in the [-1, 1] cube. */
export function bytesToPoints(bytes: Uint8Array, count: number): Float32Array {
  const n = Math.min(count, Math.floor(bytes.length / 3));
  const pts = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const o = i * 3;
    pts[o] = (bytes[o] / 255) * 2 - 1;
    pts[o + 1] = (bytes[o + 1] / 255) * 2 - 1;
    pts[o + 2] = (bytes[o + 2] / 255) * 2 - 1;
  }
  return pts;
}

/**
 * RANDU, IBM's linear congruential generator of the 1960s: x' = 65539 x mod 2^31. Consecutive triples satisfy
 * z = 6y - 9x (mod 1), so the cloud collapses onto 15 parallel planes. The product stays under 2^47, so doubles
 * compute it exactly.
 */
export function randuPoints(count: number, seed = 1): Float32Array {
  const M = 2 ** 31;
  let x = (seed % M) || 1;
  if (x % 2 === 0) x += 1;
  const next = () => { x = (65539 * x) % M; return x / M; };
  const pts = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) pts[i] = next() * 2 - 1;
  return pts;
}

/** Per-vertex colours: the brand hue, drifting toward the ink by distance from the centre, as 0..1 RGB. */
export function pointColors(points: Float32Array, brand: Rgb, ink: Rgb): Float32Array {
  const n = points.length / 3;
  const colors = new Float32Array(points.length);
  for (let i = 0; i < n; i++) {
    const o = i * 3;
    const r = Math.sqrt(points[o] ** 2 + points[o + 1] ** 2 + points[o + 2] ** 2) / Math.SQRT2;
    const c = mix(brand, ink, 0.45 * Math.min(1, r));
    colors[o] = c[0] / 255; colors[o + 1] = c[1] / 255; colors[o + 2] = c[2] / 255;
  }
  return colors;
}

/** A trailing mean over `window` readings. */
export function rollingMean(values: number[], window: number): number[] {
  const out = new Array<number>(values.length);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    out[i] = sum / Math.min(i + 1, window);
  }
  return out;
}
