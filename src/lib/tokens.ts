// The theme's colours, read for the canvases. Everything drawn by CSS or SVG reads the kiosk tokens directly
// (fill="var(--c1)"); a <canvas> and a WebGL scene cannot, so they ask the document for the token's value when they
// draw and draw again when the theme changes (lib/theme's useTheme is the signal). No colour is written in a
// component: a reader's own theme has to reach every pixel, which is the kit's rule.
export type Rgb = [number, number, number];

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function rgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [128, 128, 128];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const token = (name: string): Rgb => rgb(cssVar(name));

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const u = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

/** The theme's drawing colours, read once per draw. */
export function palette() {
  return {
    ground: token("--ground"), sheet: token("--sheet"), ink: token("--ink"), mute: token("--mute"),
    line: token("--line"), brand: token("--brand"), c1: token("--c1"), c2: token("--c2"), c3: token("--c3"),
  };
}

export const hex = (c: Rgb) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/** Does the reader prefer less motion? Read live; the views stop their rotation when so. */
export const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
