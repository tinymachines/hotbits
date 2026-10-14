import { useState } from "react";
import { onLink } from "@tinymachines/kit/lib/router";
import { draw, type Receipt as R } from "../../lib/bits";
import { Receipt } from "../../components/Receipt";
import { NumberField } from "../../components/Field";

export default function Coins() {
  const [count, setCount] = useState(5);
  const [flips, setFlips] = useState<boolean[] | null>(null);
  const [receipt, setReceipt] = useState<R | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flip = async () => {
    setBusy(true); setError(null);
    try {
      const { result, receipt } = await draw(async (src) => { const out: boolean[] = []; for (let i = 0; i < count; i++) out.push((await src.bits(1)) === 1); return out; });
      setFlips(result); setReceipt(receipt);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const heads = flips?.filter(Boolean).length ?? 0;

  return (
    <article>
      <p className="kicker"><a href="/play" onClick={onLink}>play</a> · <b>coins</b></p>
      <h1>Coins</h1>
      <p className="lede">One bit of decay per coin, nothing thrown away: a one is heads, a zero is tails. The fairest thing on the site, because a coin is what a bit already is.</p>
      <div className="controls">
        <NumberField id="coins-n" label="How many" value={count} min={1} max={50} onChange={setCount} />
        <button type="button" className="btn" onClick={flip} disabled={busy} id="flip">{busy ? "Flipping" : `Flip ${count}`}</button>
      </div>
      {error ? <p className="hb-notice">The gateway did not answer: {error}. Nothing was flipped.</p> : null}
      {flips ? (
        <section className="panel hb-sec" aria-live="polite">
          <div className="hb-faces" id="coins">{flips.map((h, i) => <span className={`hb-face hb-coin ${h ? "is-heads" : "is-tails"}`} key={i} aria-label={h ? "heads" : "tails"}>{h ? "H" : "T"}</span>)}</div>
          <div className="hb-stats">
            <div className="stat"><p className="k">Heads</p><p className="v n">{heads}</p></div>
            <div className="stat"><p className="k">Tails</p><p className="v n">{flips.length - heads}</p></div>
            <div className="stat"><p className="k">Heads share</p><p className="v n">{((heads / flips.length) * 100).toFixed(0)}<small>%</small></p></div>
          </div>
          <Receipt r={receipt} />
        </section>
      ) : null}
    </article>
  );
}
