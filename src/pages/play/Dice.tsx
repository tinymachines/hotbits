import { useState } from "react";
import { onLink } from "@tinymachines/kit/lib/router";
import { draw, type Receipt as R } from "../../lib/bits";
import { Receipt } from "../../components/Receipt";
import { NumberField, Seg } from "../../components/Field";

const DICE = [4, 6, 8, 10, 12, 20, 100] as const;
type Sides = `${(typeof DICE)[number]}`;

export default function Dice() {
  const [sides, setSides] = useState<Sides>("6");
  const [count, setCount] = useState(2);
  const [faces, setFaces] = useState<number[] | null>(null);
  const [receipt, setReceipt] = useState<R | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roll = async () => {
    setBusy(true); setError(null);
    try {
      const n = Number(sides);
      const { result, receipt } = await draw((src) => src.ints(count, n).then((v) => v.map((x) => x + 1)));
      setFaces(result); setReceipt(receipt);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const sum = faces?.reduce((a, b) => a + b, 0) ?? 0;

  return (
    <article>
      <p className="kicker"><a href="/play" onClick={onLink}>play</a> · <b>dice</b></p>
      <h1>Dice</h1>
      <p className="lede">Pick a die and how many, then roll. Each face is an unbiased integer drawn from decay bits: a d6 takes three bits and throws the draw away when it lands on 6 or 7.</p>
      <div className="controls">
        <Seg label="Die" value={sides} onChange={setSides} options={DICE.map((d) => ({ id: `${d}` as Sides, label: `d${d}` }))} />
        <NumberField id="dice-n" label="How many" value={count} min={1} max={20} onChange={setCount} />
        <button type="button" className="btn" onClick={roll} disabled={busy} id="roll">{busy ? "Rolling" : `Roll ${count} d${sides}`}</button>
      </div>
      {error ? <p className="hb-notice">The gateway did not answer: {error}. Nothing was rolled.</p> : null}
      {faces ? (
        <section className="panel hb-sec" aria-live="polite">
          <div className="hb-faces" id="faces">{faces.map((f, i) => <span className="hb-face" key={i} data-face={f}>{f}</span>)}</div>
          <div className="hb-stats">
            <div className="stat"><p className="k">Sum</p><p className="v n">{sum}</p></div>
            <div className="stat"><p className="k">Average</p><p className="v n">{(sum / faces.length).toFixed(2)}</p></div>
            <div className="stat"><p className="k">Lowest</p><p className="v n">{Math.min(...faces)}</p></div>
            <div className="stat"><p className="k">Highest</p><p className="v n">{Math.max(...faces)}</p></div>
          </div>
          <Receipt r={receipt} />
        </section>
      ) : null}
    </article>
  );
}
