// The done-check, in headless Chrome, against a built dist/ served the way nginx will (scripts/serve.ts, with the
// instrument's paths passed through to the live box): every page opens with no error and the frame carries the name
// and the mark; a new reader sees Ember; the Menu lists the doors; the instrument page shows a measured pool figure;
// every one of the four views draws; each game produces a result in range with a receipt; the reference lists the
// daemon's operations; the footer and the Menu offer a Sign in (the kit's shared account service); Your files keeps a picked
// file on this device and a file shared from another app lands there; the app opens offline. Ends in ALL OK or a failure.
//   bun run scripts/check-site.ts [origin]      default http://127.0.0.1:4431 (scripts/check.sh starts the server)
import puppeteer, { type Page } from "puppeteer-core";
import { mkdtempSync as kfMkdtemp, writeFileSync as kfWrite } from "node:fs";
import { tmpdir as kfTmp } from "node:os";
import { join as kfJoin } from "node:path";

const origin = (process.argv[2] ?? "http://127.0.0.1:4431").replace(/\/$/, "");
let fails = 0;
const ok = (good: boolean, what: string) => { if (!good) fails++; console.log(`${good ? "OK  " : "FAIL"} ${what}`); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.createBrowserContext();
const page: Page = await ctx.newPage();
const errors: string[] = [];
let offline = false;
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !offline && !/status of 401/.test(m.text())) errors.push(m.text()); });   // 401: the account service, to a reader not signed in
page.on("dialog", (d) => void d.accept());
await page.setViewport({ width: 390, height: 844 });
const text = (sel: string) => page.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? "", sel);
const count = (sel: string) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
const waitFor = (sel: string, ms = 30_000) => page.waitForSelector(sel, { timeout: ms }).then(() => true).catch(() => false);

// 1. every page, no errors, the frame, the default theme
for (const p of ["/", "/instrument", "/space", "/play", "/play/dice", "/play/coins", "/play/cards", "/play/pick", "/play/lottery", "/play/password", "/api", "/theme", "/app", "/share", "/account", "/files", "/nowhere"]) {
  await page.goto(`${origin}${p}`, { waitUntil: "networkidle0" });
  const h1 = await text("main h1"), brand = await text("header .brand");
  const logo = await page.evaluate(() => (document.querySelector("header .brand img") as HTMLImageElement | null)?.naturalWidth ?? 0);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  ok(h1.length > 0 && brand === "hotbits" && logo > 0 && !wide, `${p}: "${h1}", brand "${brand}", logo ${logo}px, ${wide ? "SCROLLS SIDEWAYS" : "fits a phone"}`);
}
ok((await text("main h1")) === "Not here" && (await page.title()) === "Not here · hotbits", `an unknown address says Not here (tab: ${await page.title()})`);
const sheet = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--sheet").trim());
ok(sheet === "#19140f", `a new reader sees Ember (panels ${sheet})`);
await page.goto(`${origin}/`, { waitUntil: "networkidle0" });
await page.click("header .menu-btn"); await sleep(300);
const doors = await page.evaluate(() => [...(document.getElementById("tc-menu")?.shadowRoot?.querySelectorAll("button, a") ?? [])].map((b) => b.textContent?.trim() ?? "").filter(Boolean));
ok(await page.evaluate(() => /Sign in/.test(document.querySelector(".tc-foot")?.textContent ?? "") || /Sign in/.test(document.getElementById("tc-menu")?.shadowRoot?.textContent ?? "")), "a Sign in is offered: the kit's shared account service");
ok(doors.some((d) => d.startsWith("The instrument")) && doors.some((d) => d.startsWith("Play")) && doors.some((d) => d.startsWith("You")), `the Menu lists the doors: ${doors.slice(0, 5).join(" | ")}`);

// 2. the instrument: a measured figure, read from the live box through the server
await page.goto(`${origin}/instrument`, { waitUntil: "networkidle0" });
await page.waitForFunction(() => [...document.querySelectorAll(".hb-stats .stat .v")].some((v) => /\d/.test(v.textContent ?? "")), { timeout: 30_000 }).catch(() => null);
const pool = await page.evaluate(() => document.querySelector(".hb-stats .stat .v")?.textContent?.trim() ?? "");
ok(/\d/.test(pool), `the instrument reads the pool from the box: "${pool}"`);
const sparks = await count(".hb-spark path");
const batteries = await count(".hb-ledger tbody tr");
ok(sparks >= 5 && batteries >= 1, `the day's five sparklines (${sparks}) and the battery ledger (${batteries} rows) are drawn`);
ok(/[0-9a-f]{12}/.test(await text(".hb-hex")), `twelve seeds from the stream: ${(await text(".hb-hex")).slice(0, 25)}…`);

// 3. the four views draw
await page.goto(`${origin}/space`, { waitUntil: "networkidle0" });
ok(await waitFor(".hb-well--square[data-ready]") && await waitFor(".hb-well--raster[data-ready]"), "the return map and the raster have their bytes");
const painted = await page.evaluate(() => {
  const c = document.querySelector(".hb-well--square canvas") as HTMLCanvasElement | null;
  const d = c?.getContext("2d")?.getImageData(0, 0, c.width, c.height).data;
  if (!d) return 0;
  let lit = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] > 60) lit++;
  return lit;
});
ok(painted > 500, `the return map is painted (${painted} of 1024 cells carry the brand hue)`);
ok(await waitFor(".hb-well--cube[data-ready] canvas") && await waitFor(".hb-well--tall[data-ready] canvas", 60_000), "the field and phase space have WebGL canvases");
ok((await count(".hb-fallback")) === 0, "no view is showing a fallback");
await page.click(".seg button:nth-child(2)"); await sleep(400);
ok((await text(".hb-well--cube + .hb-caption b")).startsWith("RANDU"), "RANDU can be switched in beside the decay");

// 4. the games: a result in range, with a receipt
const game = async (path: string, button: string, result: string, check: (t: string[]) => boolean, what: string) => {
  await page.goto(`${origin}${path}`, { waitUntil: "networkidle0" });
  await page.click(button);
  const got = await page.waitForSelector(result, { timeout: 30_000 }).then(() => true).catch(() => false);
  const items = got ? await page.$$eval(`${result} > *`, (els) => els.map((e) => e.textContent?.trim() ?? "")) : [];
  const receipt = got ? await text(".hb-receipt") : "";
  ok(got && check(items) && /bits/.test(receipt), `${what}: ${items.slice(0, 8).join(" ")} (${receipt.slice(0, 60)}…)`);
};
await game("/play/dice", "#roll", "#faces", (t) => t.length === 2 && t.every((f) => +f >= 1 && +f <= 6), "two d6 roll faces 1 to 6");
await game("/play/coins", "#flip", "#coins", (t) => t.length === 5 && t.every((f) => f === "H" || f === "T"), "five coins land H or T");
await game("/play/cards", "#deal", "#hand", (t) => t.length === 5 && new Set(t).size === 5, "five cards, no two the same");
await game("/play/pick", "#pick", "#picks", (t) => t.length === 1 && ["Pizza", "Tacos", "Sushi", "A walk instead"].includes(t[0]), "a pick from the example list");
await game("/play/lottery", "#draw", "#tickets", (t) => t.length === 1, "one Lotto 47 ticket");
const balls = await page.$$eval("#tickets .hb-ball", (els) => els.map((e) => +(e.textContent ?? "")));
ok(balls.length === 6 && new Set(balls).size === 6 && balls.every((b) => b >= 1 && b <= 47) && balls.join() === [...balls].sort((a, b) => a - b).join(), `six distinct balls 1 to 47, sorted: ${balls.join(" ")}`);
await page.goto(`${origin}/play/password`, { waitUntil: "networkidle0" });
await page.click("#make");
ok(await waitFor("#password") && (await text("#password")).length === 16, `a 16-character password: ${(await text("#password")).replace(/./g, "•")}`);

// 5. the reference reads the daemon's schema
await page.goto(`${origin}/api`, { waitUntil: "networkidle0" });
ok(await waitFor("#routes tbody tr") && (await count("#routes tbody tr")) >= 20, `the reference lists ${await count("#routes tbody tr")} operations from /openapi.json`);

// 5b. your files, signed out: a file picked through <tc-pick> is kept on this device, and opens (the kit's Your files)
const kfSample = kfJoin(kfMkdtemp(kfJoin(kfTmp(), "hotbits-check-")), "hello.txt");
kfWrite(kfSample, "hello from hotbits' check\n");
await page.goto(`${origin}/files`, { waitUntil: "networkidle0" });
const kfInput = await page.evaluateHandle(() => document.querySelector("tc-pick")!.shadowRoot!.querySelector("input.files"));
await (kfInput as unknown as { uploadFile(p: string): Promise<void> }).uploadFile(kfSample);
let kfRows: string[] = [];
for (let i = 0; i < 40 && !kfRows.some((r) => r.startsWith("hello.txt")); i++) { await sleep(250); kfRows = await page.evaluate(() => [...document.querySelectorAll(".kfiles li")].map((li) => `${li.querySelector(".open")?.textContent} | ${li.querySelector(".state")?.textContent}`)); }
ok(kfRows.some((r) => /^hello\.txt \| On this device/.test(r)), `your files: a picked file is kept on this device (${kfRows.join("; ")})`);
await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".kfiles .open")].find((e) => e.textContent?.includes("hello.txt"))?.click());
await page.waitForSelector(".kfile-view pre", { timeout: 4000 }).catch(() => null);
ok((await text(".kfile-view pre")).startsWith("hello from hotbits' check"), "your files: opening it shows what it holds");
// a file shared to hotbits from another app (the Share menu's multipart POST, taken by the service worker) lands there
await page.goto(`${origin}/app`, { waitUntil: "networkidle0" });
await page.evaluate(() => navigator.serviceWorker.ready);
const kfLanded = await page.evaluate(async () => {
  const form = new FormData();
  form.append("files", new File(["shared from another app\n"], "shared note.txt", { type: "text/plain" }));
  const r = await fetch("/share", { method: "POST", body: form });
  return new URL(r.url).pathname + new URL(r.url).search;
});
await page.goto(`${origin}${kfLanded}`, { waitUntil: "networkidle0" });
await page.waitForFunction(() => /Open it in Your files/.test(document.querySelector("main")?.textContent ?? ""), { timeout: 8000 }).catch(() => null);
ok(/Open it in Your files/.test(await text("main")), `share: the share page says the file went to Your files (${kfLanded})`);
await page.goto(`${origin}/files`, { waitUntil: "networkidle0" });
kfRows = [];
for (let i = 0; i < 40 && !kfRows.some((r) => r.startsWith("shared note.txt")); i++) { await sleep(250); kfRows = await page.evaluate(() => [...document.querySelectorAll(".kfiles li .open")].map((b) => b.textContent ?? "")); }
ok(kfRows.includes("shared note.txt"), `share: it is in Your files (${kfRows.join("; ")})`);

// 6. offline
await page.goto(`${origin}/app`, { waitUntil: "networkidle0" }); await sleep(1500);
await page.reload({ waitUntil: "networkidle0" }); await sleep(1000);
offline = true;
await page.setOfflineMode(true);
await page.goto(`${origin}/play`, { waitUntil: "domcontentloaded" }).catch(() => null); await sleep(500);
ok((await text("main h1")) === "Play", `offline: /play opens from the cache ("${await text("main h1")}")`);
await page.setOfflineMode(false); offline = false;

ok(errors.length === 0, errors.length ? `page errors: ${errors.join(" | ").slice(0, 600)}` : "no page errors anywhere");
await browser.close();
console.log(fails ? `check-site: ${fails} FAILED` : "check-site: ALL OK");
process.exit(fails ? 1 : 0);
