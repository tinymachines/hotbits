// Who this app is: plain data, no kit code, so vite.config.ts can import it too (for the manifest and
// /seo.json). src/app.ts hands it to the kit; main.tsx imports that first.
import type { AppConfig } from "@tinymachines/kit/app";

declare const __APP_VERSION__: string;
declare const __GIT_COMMIT__: string;
declare const __BUILD_DATE__: string;
const build = typeof __APP_VERSION__ === "string" ? { version: __APP_VERSION__, commit: __GIT_COMMIT__, date: __BUILD_DATE__ } : { version: "0.0.0", commit: "node", date: new Date().toISOString() };

export const APP: AppConfig = {
  name: "hotbits",
  tagline: "what this app does, in one line",
  site: "https://hotbits.tinymachines.ai",
  prefix: "hotbits",
  logo: "/logo.svg",
  build,
  pages: [
    { path: "/", title: "hotbits", card: "home", index: true, kicker: "the kit's hotbits app", description: "The kit's own hotbits app: the frame, themes, sensors, sharing, install and offline." },
    { path: "/theme", title: "Themes", card: "theme", index: true, kicker: "theme", description: "Pick, build and share a theme, set the text size and the font. Every theme is checked for contrast before it can be kept." },
    { path: "/sensors", title: "Sensors", card: "plain", index: true, kicker: "sensors", description: "Everything your phone can sense that a web page may read, live. Nothing is recorded or sent." },
    { path: "/app", title: "This app", card: "plain", index: true, kicker: "app", description: "Install it on your phone or computer. It works offline." },
    { path: "/account", title: "Your account", card: "plain", index: false, kicker: "account", description: "Sign in with a passkey." },
    { path: "/share", title: "Shared with hotbits", card: "plain", index: false, kicker: "share", description: "What you have shared here from other apps. It stays on your device." },
  ],
  doors: [
    { id: "home", title: "Home", hint: "The front door.", pages: [{ href: "/", title: "Home", hint: "Where it starts." }] },
    { id: "you", title: "You", hint: "Your account, how the app looks, this device.", pages: [
      { href: "/account", title: "Your account", hint: "A passkey.", me: true },
      { href: "/theme", title: "Themes", hint: "Colours, text size, the reading font." },
      { href: "/sensors", title: "Sensors", hint: "Everything the phone can sense that a page may read." },
      { href: "/share", title: "Shared with hotbits", hint: "What other apps sent here." },
      { href: "/app", title: "This app", hint: "Install it, and it works offline." },
    ] },
  ],
  shortcuts: [
    { id: "sensors", label: "Sensors", href: "/sensors" },
    { id: "theme", label: "Themes", href: "/theme" },
    { id: "app", label: "This app", href: "/app" },
    { id: "share", label: "Shared with hotbits", href: "/share" },
    { id: "account", label: "Account", href: "/account" },
  ],
  defaultShortcuts: ["theme", "app"],
};
