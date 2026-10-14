import { useState } from "react";
import { onLink } from "@tinymachines/kit/lib/router";
import { draw, type Receipt as R } from "../../lib/bits";
import { Receipt } from "../../components/Receipt";
import { Check, NumberField } from "../../components/Field";

const EXAMPLE = "Pizza\nTacos\nSushi\nA walk instead";

export default function Pick() {
  const [text, setText] = useState(EXAMPLE);
  const [count, setCount] = useState(1);
  const [repeats, setRepeats] = useState(false);
  const [picks, setPicks] = useState<string[] | null>(null);
  const [receipt, setReceipt] = useState<R | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const k = repeats ? count : Math.min(count, items.length);

  const pick = async () => {
    if (items.length === 0) return;
    setBusy(true); setError(null);
    try {
      const { result, receipt } = await draw(async (src) => repeats ? (await src.ints(k, items.length)).map((i) => items[i]) : src.shuffle(items, k));
      setPicks(result); setReceipt(receipt);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <article>
      <p className="kicker"><a href="/play" onClick={onLink}>play</a> · <b>pick</b></p>
      <h1>Pick</h1>
      <p className="lede">Paste a list, one item a line, and let radioactive decay choose. Without repeats it is a partial shuffle, so no item comes up twice; with repeats each pick is an independent draw. The list never leaves your device.</p>
      <label className="hb-field hb-field--wide" htmlFor="pick-list">
        <span>Your list ({items.length} {items.length === 1 ? "item" : "items"})</span>
        <textarea id="pick-list" rows={6} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      </label>
      <div className="controls">
        <NumberField id="pick-n" label="How many" value={count} min={1} max={Math.max(1, repeats ? 50 : items.length)} onChange={setCount} />
        <Check id="pick-r" label="repeats allowed" checked={repeats} onChange={setRepeats} />
        <button type="button" className="btn" onClick={pick} disabled={busy || items.length === 0} id="pick">{busy ? "Picking" : k === 1 ? "Pick one" : `Pick ${k}`}</button>
      </div>
      {error ? <p className="hb-notice">The gateway did not answer: {error}. Nothing was picked.</p> : null}
      {picks ? (
        <section className="panel hb-sec" aria-live="polite">
          <ol className="hb-picks" id="picks">{picks.map((p, i) => <li key={i}>{p}</li>)}</ol>
          <Receipt r={receipt} />
        </section>
      ) : null}
    </article>
  );
}
