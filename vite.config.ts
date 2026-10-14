import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { APP } from "./src/app.config";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));
let commit = "dev";
try { commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { /* not in git */ }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_COMMIT__: JSON.stringify(commit),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  build: { target: "esnext" },
  // the kit is TypeScript source: Vite transforms it like the app's own files. preserveSymlinks is for this
  // example only (its copy of the kit is a link to ..); an app that installs the kit from git has real files.
  optimizeDeps: { exclude: ["@tinymachines/kit"] },
  plugins: [
    react(),
    // /seo.json: the page table for an account service that sends each address its own head
    { name: "kit-seo-json", apply: "build", generateBundle() { this.emitFile({ type: "asset", fileName: "seo.json", source: JSON.stringify({ site: APP.site, name: APP.name, pages: APP.pages }) }); } },
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: false,
      injectManifest: { globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,wasm,json}"], maximumFileSizeToCacheInBytes: 50 * 1024 * 1024 },
      manifest: {
        name: `${APP.name}: ${APP.tagline}`,
        short_name: APP.name,
        description: APP.tagline,
        id: APP.name,
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#e2e7eb",
        theme_color: "#112658",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        share_target: { action: "/share", method: "POST", enctype: "multipart/form-data", params: { title: "title", text: "text", url: "url", files: [{ name: "files", accept: ["image/*", "video/*", "text/*", "application/json"] }] } },
      },
    }),
  ],
});
