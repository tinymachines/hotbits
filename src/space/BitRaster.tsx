// The raster: one pixel per bit, in order, scrolling up through the shared buffer. The eye is very good at finding
// periodicity, and a stream with any is hard to look at without seeing it. When most of the buffer has scrolled by
// it asks for a fresh slice, so the same bits never come round again.
import { useEffect, useRef } from "react";
import { useTheme } from "@tinymachines/kit/lib/theme";
import { palette, reducedMotion } from "../lib/tokens";
import type { EntropyStatus } from "./use-entropy";

const W = 160, H = 80, BAND = 4, TICK_MS = 1500;

export default function BitRaster({ bytes, status, onRegenerate }: { bytes: Uint8Array | null; status: EntropyStatus; onRegenerate?: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const asked = useRef(false);
  const theme = useTheme();

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    asked.current = false;
    const p = palette();
    ctx.fillStyle = `rgb(${p.ground.join(",")})`;
    ctx.fillRect(0, 0, W, H);
    if (!bytes || bytes.length === 0) return;
    const total = bytes.length * 8;
    const regenAt = Math.floor(total * 0.8);
    const bitAt = (pos: number) => { const q = ((pos % total) + total) % total; return (bytes[q >> 3] >> (7 - (q & 7))) & 1; };
    const drawRows = (start: number, rows: number, atY: number) => {
      const band = ctx.createImageData(W, rows);
      for (let r = 0; r < rows; r++) for (let c = 0; c < W; c++) {
        const on = bitAt(start + r * W + c);
        const col = on ? p.brand : p.ground;
        const o = (r * W + c) * 4;
        band.data[o] = col[0]; band.data[o + 1] = col[1]; band.data[o + 2] = col[2]; band.data[o + 3] = 255;
      }
      ctx.putImageData(band, 0, atY);
    };
    drawRows(0, H, 0);
    let head = H * W;
    if (reducedMotion()) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      ctx.globalCompositeOperation = "copy";
      ctx.drawImage(ctx.canvas, 0, -BAND);
      ctx.globalCompositeOperation = "source-over";
      drawRows(head, BAND, H - BAND);
      head += BAND * W;
      if (head >= regenAt && !asked.current && onRegenerate) { asked.current = true; onRegenerate(); }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [bytes, onRegenerate, theme]);

  const overlay = !bytes ? (status === "unavailable" ? "archive unavailable" : "sampling") : null;

  return (
    <div className="hb-viz">
      <div className="hb-well hb-well--raster" data-ready={bytes ? "1" : undefined}>
        {overlay ? <div className="hb-fallback">{overlay}</div> : null}
        <canvas ref={canvas} width={W} height={H} className="hb-pixels" role="img" aria-label="Raw bits, one pixel each, scrolling" />
      </div>
      <p className="hb-caption"><b>Raw bits.</b> Each pixel is one bit of the conditioned stream (lit for a one, dark for a zero), scrolling up through a block of real decay. No pattern forms because there is none to form. {reducedMotion() ? "It holds still because your device asks for less motion." : "It asks for a fresh block before the same bits could come round."}</p>
    </div>
  );
}
