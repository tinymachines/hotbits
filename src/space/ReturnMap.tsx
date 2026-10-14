// The return map: each byte against the one after it. Top 5 bits of each, so 32 x 32 cells; with the shared 6 KB
// buffer that is about six pairs a cell, enough that Poisson grain reads as an even haze rather than speckle.
import { useEffect, useRef } from "react";
import { useTheme } from "@tinymachines/kit/lib/theme";
import { mix, palette } from "../lib/tokens";
import type { EntropyStatus } from "./use-entropy";

const N = 32;

export default function ReturnMap({ bytes, status, onRegenerate }: { bytes: Uint8Array | null; status: EntropyStatus; onRegenerate: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();

  useEffect(() => {
    if (!bytes) return;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const p = palette();
    const counts = new Uint32Array(N * N);
    let pairs = 0;
    for (let i = 0; i < bytes.length - 1; i++) { counts[(bytes[i] >> 3) * N + (bytes[i + 1] >> 3)]++; pairs++; }
    const denom = Math.max(1e-6, (pairs / (N * N)) * 2.4);
    const img = ctx.createImageData(N, N);
    for (let i = 0; i < counts.length; i++) {
      const t = Math.pow(Math.min(1, counts[i] / denom), 0.85);
      const c = mix(p.ground, p.brand, t);
      const o = i * 4;
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [bytes, theme]);

  const overlay = !bytes ? (status === "unavailable" ? "archive unavailable" : "sampling") : null;

  return (
    <div className="hb-viz">
      <div className="controls">
        <button type="button" className="btn quiet" onClick={onRegenerate} disabled={status === "loading"}>Resample</button>
      </div>
      <div className="hb-well hb-well--square" data-ready={bytes ? "1" : undefined}>
        {overlay ? <div className="hb-fallback">{overlay}</div> : null}
        <canvas ref={canvas} width={N} height={N} className="hb-pixels" role="img" aria-label="Return map of consecutive byte pairs" />
      </div>
      <p className="hb-caption"><b>The return map.</b> Each cell is a consecutive byte pair (value n across, value n+1 up), brighter where more pairs landed. Real entropy paints an even haze: every pairing equally likely. This is the plot that caught RANDU, whose output falls onto diagonals here and looked fine by every other test of its day.</p>
    </div>
  );
}
