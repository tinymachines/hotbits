// Who this app is: plain data, no kit code, so vite.config.ts can import it too (for the manifest and
// /seo.json). src/app.ts hands it to the kit; main.tsx imports that first.
import type { AppConfig } from "@tinymachines/kit/app";
import { API_PATH } from "./api-paths";

declare const __APP_VERSION__: string;
declare const __GIT_COMMIT__: string;
declare const __BUILD_DATE__: string;
const build = typeof __APP_VERSION__ === "string" ? { version: __APP_VERSION__, commit: __GIT_COMMIT__, date: __BUILD_DATE__ } : { version: "0.0.0", commit: "node", date: new Date().toISOString() };

export const APP: AppConfig = {
  name: "hotbits",
  tagline: "random, from radioactive decay",
  site: "https://hotbits.tinymachines.ai",
  prefix: "hotbits",
  logo: "/logo.svg",
  logoDark: "/logo-dark.svg",
  protocol: "web+hotbits",
  // the kit's shared account service (nginx sends its routes under /api/ to it; the daemon owns the other paths) and
  // Your files at /files
  yourFiles: "/files",
  // hotbits' own API (api/, hotbits-api.service), FastAPI on the kit's kitapi: the rest of /api/; app.yaml says the same port
  api: { port: 8170 },
  build,
  // hotbits' own look: Ember, the hue the family's brand library (meatball-labs, 2026-10-07) holds for it in the
  // electric set (glow #ff8505, haze #322318). Every pairing passes the kit's contrast checks (text 15:1 on panels,
  // quiet text 6.8:1, the ember 7.5:1); the kit refuses a theme otherwise, so a failing one never shows.
  theme: { default: "ember", extra: [{ id: "ember", name: "Ember", colors: {
    ground: "#0d0b09", sheet: "#19140f", ink: "#f1eae0", ink2: "#d8cfc3", mute: "#a89c8e", line: "#3b3027", tint: "#322318",
    brand: "#ff8505", brandBg: "#0d0b09", onInk: "#f1eae0", onInkMute: "#a89c8e", alert: "#ff7a66", mapSea: "#120f0c", mapLand: "#1f1813", mapLine: "#6f635a" } }] },
  pages: [
    { path: "/", title: "hotbits", card: "home", index: true, kicker: "random, from radioactive decay",
      description: "A Geiger tube, a timestamp on every click, and a bit from comparing one gap between decays with the next. The instrument live, the bytes drawn four ways, six games played with real decay, and the API." },
    { path: "/instrument", title: "The instrument", card: "plain", index: true, kicker: "live",
      description: "What the Geiger source is doing right now: the pool, the last quality window against a perfect source, the NIST 800-90B health tests, the test batteries, and a sample from the stream. Read from the instrument every 30 seconds." },
    { path: "/space", title: "The entropy, drawn", card: "plain", index: true, kicker: "the bytes, drawn",
      description: "Four ways of looking at the same radioactive decay: the bytes as a field in three dimensions, as a return map, as a raster of raw bits, and as their own measurements over the last day. None of them is a summary; a flaw would be visible rather than reported." },
    { path: "/play", title: "Play", card: "plain", index: true, kicker: "games",
      description: "Dice, coins, cards, a pick from your list, lottery tickets and passwords, every one decided by real radioactive decay replayed from the public archive. Each page says how many bits it used and how many it threw away to stay fair." },
    { path: "/play/dice", title: "Dice", card: "plain", index: true, kicker: "play", description: "Roll up to twenty dice of one kind, from a d4 to a d100, on bits from radioactive decay." },
    { path: "/play/coins", title: "Coins", card: "plain", index: true, kicker: "play", description: "Flip up to fifty coins at once, one bit of decay each." },
    { path: "/play/cards", title: "Cards", card: "plain", index: true, kicker: "play", description: "Draw from a shuffled deck. The shuffle is Fisher-Yates on unbiased integers from decay bits." },
    { path: "/play/pick", title: "Pick", card: "plain", index: true, kicker: "play", description: "Paste a list, one item a line, and let radioactive decay pick one or several." },
    { path: "/play/lottery", title: "Lottery", card: "plain", index: true, kicker: "play", description: "Lottery tickets drawn without replacement: Lotto 47, Powerball, Mega Millions, 6 of 49, or your own k of n." },
    { path: "/play/password", title: "Passwords", card: "plain", index: true, kicker: "play", description: "How a password's entropy is counted, with the characters chosen by decay bits. Replayed bits, so a demonstration and not a secret." },
    { path: "/api", title: "The reference", card: "plain", index: true, kicker: "the API",
      description: "Every address the instrument answers, read from its own OpenAPI schema when the page loads, and the gateway's four: which are open, which need a key, and which are closed." },
    { path: "/scan", title: "Scan a code", card: "plain", index: true, kicker: "scan",
      description: "Read a QR code with the camera or from a photo, on this phone, and see what it holds before anything opens." },
    { path: "/theme", title: "Themes", card: "theme", index: true, kicker: "theme",
      description: "How hotbits looks on your device: pick, build and share a theme, set the text size and the font. Every theme is checked for contrast before it can be kept." },
    { path: "/app", title: "This app", card: "plain", index: true, kicker: "app",
      description: "Install hotbits on your phone or computer. The pages work offline; the instrument needs the network." },
    { path: "/account", title: "Your account", card: "plain", index: false, kicker: "account", description: "Sign in to hotbits with a passkey: one account for every tinymachines app." },
    { path: "/files", title: "Your files", card: "plain", index: false, kicker: "files", description: "Your files: kept on this device and, signed in, in your account, so every device you sign in on has them." },
    { path: "/share", title: "Shared with hotbits", card: "plain", index: false, kicker: "share",
      description: "What you have shared to hotbits from other apps. It stays on your device." },
  ],
  // the daemon's own pages (its Swagger reference and its reports) are on this site and are not the app
  outside: API_PATH,
  notHere: "the instrument, the bytes drawn, and six games played with radioactive decay.",
  doors: [
    { id: "instrument", title: "The instrument", hint: "The Geiger source, live, and its bytes drawn.", pages: [
      { href: "/instrument", title: "Live", hint: "The pool, the quality window, the health tests, a sample." },
      { href: "/space", title: "The entropy, drawn", hint: "A field, a return map, a raster, phase space." },
      { href: "/api", title: "The reference", hint: "Every address, open, keyed or closed." },
      { href: "/", title: "About", hint: "What hotbits is and how a bit is made." },
    ] },
    { id: "play", title: "Play", hint: "Six games, every one decided by real decay.", pages: [
      { href: "/play/dice", title: "Dice", hint: "d4 to d100, up to twenty at once." },
      { href: "/play/coins", title: "Coins", hint: "Up to fifty, one bit each." },
      { href: "/play/cards", title: "Cards", hint: "A fair shuffle, then a draw." },
      { href: "/play/pick", title: "Pick", hint: "From your own list." },
      { href: "/play/lottery", title: "Lottery", hint: "Tickets, without replacement." },
      { href: "/play/password", title: "Passwords", hint: "The arithmetic of entropy, shown." },
    ] },
    { id: "you", title: "You", hint: "Your account, your files, how the app looks, this device.", pages: [
      { href: "/account", title: "Your account", hint: "A passkey.", me: true },
      { href: "/scan", title: "Scan a code", hint: "A QR code, with the camera or from a photo." },
      { href: "/theme", title: "Themes", hint: "Colours, text size, the reading font." },
      { href: "/files", title: "Your files", hint: "Kept here and, signed in, in your account." },
      { href: "/share", title: "Shared with hotbits", hint: "What other apps sent here." },
      { href: "/app", title: "This app", hint: "Install it; the pages work offline." },
    ] },
  ],
  shortcuts: [
    { id: "instrument", label: "Live", href: "/instrument" },
    { id: "space", label: "Drawn", href: "/space" },
    { id: "play", label: "Play", href: "/play" },
    { id: "api", label: "Reference", href: "/api" },
    { id: "scan", label: "Scan", href: "/scan" },
    { id: "theme", label: "Themes", href: "/theme" },
    { id: "app", label: "This app", href: "/app" },
    { id: "files", label: "Your files", href: "/files" },
    { id: "account", label: "Account", href: "/account" },
  ],
  defaultShortcuts: ["instrument", "space", "play", "scan"],
};
