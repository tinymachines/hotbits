// The reference: every address the instrument answers, read from its own OpenAPI schema each time the page loads,
// and the gateway's four. Which are open, which need a key, which are closed, and why.
import { useEffect, useState } from "react";
import { StatusTag } from "@tinymachines/kit/components/StatusTag";
import { getOpenApi, type OpenApi } from "../lib/api";
import { Tag, type TagState } from "../components/Tag";

const GATEWAY = [
  { path: "/v1/health", tier: "open", what: "the gateway's own health" },
  { path: "/v1/seeds?n=64", tier: "open", what: "up to 64 integers of 48 bits, replayed from the archive. Cannot drain the pool, so needs no key. Rate-limited per address." },
  { path: "/v1/bytes?n=32", tier: "keyed", what: "fresh, conditioned bytes from the scarce tip, charged against a per-key byte budget. Authorization: Bearer. 429 carries Retry-After; 503 means the source is down and nothing is invented." },
  { path: "/v1/hex?n=32", tier: "keyed", what: "the same bytes as hex in JSON" },
];

/** The daemon's pool-spending paths, which nginx answers with 410 Gone on this host, naming the replacement. */
const CLOSED = new Set(["/random/bytes", "/random/hex", "/random/integers", "/random/raw"]);

const TIER: Record<string, { state: TagState; word: string }> = {
  open: { state: "live", word: "open" }, keyed: { state: "quiet", word: "needs a key" }, closed: { state: "warn", word: "closed, 410" },
};

export default function Reference() {
  const [spec, setSpec] = useState<OpenApi | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const ac = new AbortController();
    getOpenApi(ac.signal).then((s) => { if (!ac.signal.aborted) setSpec(s); }).catch(() => { if (!ac.signal.aborted) setError(true); });
    return () => ac.abort();
  }, []);

  const rows = spec ? Object.entries(spec.paths).sort(([a], [b]) => a.localeCompare(b)).flatMap(([path, ops]) =>
    Object.entries(ops).map(([method, op]) => ({ path, method: method.toUpperCase(), summary: op.summary ?? op.description?.split("\n")[0] ?? "", tier: CLOSED.has(path) ? "closed" : "open" }))) : [];

  return (
    <article className="hb-reference">
      <p className="kicker">hotbits · <b>the reference</b></p>
      <h1>The reference</h1>
      <p className="lede">hotbits.tinymachines.ai is one hostname with three things behind it: the daemon on the Raspberry Pi, the gateway on the server, and this app. nginx tells them apart by path. Everything below answers on this host.</p>
      <p><StatusTag kind="measured" /> The daemon&rsquo;s table is read from its own schema at /openapi.json when this page loads, so it cannot go stale; the gateway&rsquo;s four are from its published API. The daemon&rsquo;s own interactive reference is at <a href="/docs">/docs</a>.</p>

      <section className="panel hb-sec">
        <h2>The gateway</h2>
        <p>The public door to the fresh pool. The source makes about 75 bytes a minute for everyone put together, and this service decides who gets them: the open tier replays the archive and costs the pool nothing; the keyed tier spends it, within each key&rsquo;s budget, and refuses to invent a byte when the source is down.</p>
        <table className="hb-ledger">
          <thead><tr><th>Address</th><th>Tier</th><th>What</th></tr></thead>
          <tbody>{GATEWAY.map((g) => <tr key={g.path}><td><code>GET {g.path}</code></td><td><Tag state={TIER[g.tier].state}>{TIER[g.tier].word}</Tag></td><td>{g.what}</td></tr>)}</tbody>
        </table>
      </section>

      <section className="panel hb-sec">
        <h2>The daemon {spec?.info?.version ? <small className="note">v{spec.info.version}</small> : null}</h2>
        <p>Status, measurements, the archive, the analysis runs and the reports, on the Pi. Four of its paths handed out exclusive bytes to anyone and were closed on this host when they were costing the whole source&rsquo;s output; they answer 410 with the replacement named, because the person hitting them is a developer.</p>
        {error ? <p className="hb-notice">The schema did not answer: the Pi is off the network or the daemon is down. The addresses are still those in the daemon&rsquo;s repository, tinymachines/geiger.</p>
          : !spec ? <p className="note">reading /openapi.json</p>
          : (
            <div className="hb-scroll" tabIndex={0} role="region" aria-label="The daemon's addresses">
              <table className="hb-ledger" id="routes">
                <thead><tr><th>Address</th><th>Tier</th><th>What</th></tr></thead>
                <tbody>{rows.map((r) => <tr key={r.method + r.path}><td><code>{r.method} {r.path}</code></td><td><Tag state={TIER[r.tier].state}>{TIER[r.tier].word}</Tag></td><td>{r.summary}</td></tr>)}</tbody>
              </table>
              <p className="note">{rows.length} operations, read just now.</p>
            </div>
          )}
      </section>

      <section className="panel hb-sec">
        <h2>Reading it from your own code</h2>
        <p>Every path sends <code>Access-Control-Allow-Origin: *</code>, so a page on any site can read the open tier directly. Be frugal with the archive: the pictures on this site read 6 KB in 4 KB chunks and ask again only when you pour. The quality tables (<code>/metrics</code>, <code>/battery/history</code>, <code>/health/continuous</code>) are bookkeeping the daemon does regardless and cost the pool nothing.</p>
        <pre className="hb-hex">curl https://hotbits.tinymachines.ai/v1/seeds?n=4{"\n"}curl -H &apos;Authorization: Bearer eg_...&apos; https://hotbits.tinymachines.ai/v1/hex?n=32</pre>
      </section>

      <p className="src">The daemon is tinymachines/geiger (its <code>api/</code>), the gateway is <code>entropy-gate</code>, and this app is tinymachines/hotbits. A key is minted by the gateway&rsquo;s operator, who refuses budgets the source cannot physically meet.</p>
    </article>
  );
}
