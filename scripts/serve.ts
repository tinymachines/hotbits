// Serve a built dist/ the way nginx will on hotbits.tinymachines.ai: static files, index.html for any path without
// one (the app's routes), and the instrument's own addresses (src/api-paths.ts) passed through to the live
// instrument, so the pages read the real Geiger box under the check. For the checks; not a deploy path.
//   bun run scripts/serve.ts [dist] [port]      default dist, 4431, binds 127.0.0.1
import { join } from "path";
import { API_PATH } from "../src/api-paths";

const dist = process.argv[2] ?? join(import.meta.dir, "..", "dist");
const port = Number(process.argv[3] ?? 4431);
const INSTRUMENT = process.env.HOTBITS_UPSTREAM ?? "https://hotbits.tinymachines.ai";
const TYPES: Record<string, string> = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".html": "text/html; charset=utf-8", ".txt": "text/plain" };

Bun.serve({
  hostname: "127.0.0.1", port,
  async fetch(req) {
    const u = new URL(req.url);
    if (API_PATH.test(u.pathname)) {
      const r = await fetch(`${INSTRUMENT}${u.pathname}${u.search}`, { headers: { accept: req.headers.get("accept") ?? "*/*" } });
      return new Response(r.body, { status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "application/octet-stream", "cache-control": "no-store" } });
    }
    const f = Bun.file(join(dist, u.pathname));
    if (u.pathname !== "/" && !u.pathname.endsWith("/") && (await f.exists())) {
      const ext = u.pathname.slice(u.pathname.lastIndexOf("."));
      return new Response(f, { headers: { "content-type": TYPES[ext] ?? "application/octet-stream", ...(u.pathname.endsWith("sw.js") ? { "cache-control": "no-cache" } : {}) } });
    }
    return new Response(Bun.file(join(dist, "index.html")), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" } });
  },
});
console.log(`serving ${dist} at http://127.0.0.1:${port}; the instrument's paths go to ${INSTRUMENT}`);
