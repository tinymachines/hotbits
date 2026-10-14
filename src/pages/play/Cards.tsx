import { useState } from "react";
import { onLink } from "@tinymachines/kit/lib/router";
import { draw, type Receipt as R } from "../../lib/bits";
import { Receipt } from "../../components/Receipt";
import { Check, NumberField } from "../../components/Field";

const SUITS = [{ g: "♠", name: "spades" }, { g: "♥", name: "hearts" }, { g: "♦", name: "diamonds" }, { g: "♣", name: "clubs" }];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
interface Card { rank: string; suit: string; name: string }

function deck(jokers: boolean): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ rank: r, suit: s.g, name: `${r} of ${s.name}` });
  if (jokers) d.push({ rank: "★", suit: "", name: "joker" }, { rank: "★", suit: "", name: "joker" });
  return d;
}

export default function Cards() {
  const [count, setCount] = useState(5);
  const [jokers, setJokers] = useState(false);
  const [hand, setHand] = useState<Card[] | null>(null);
  const [receipt, setReceipt] = useState<R | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const size = 52 + (jokers ? 2 : 0);

  const deal = async () => {
    setBusy(true); setError(null);
    try {
      const { result, receipt } = await draw((src) => src.shuffle(deck(jokers), Math.min(count, size)));
      setHand(result); setReceipt(receipt);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <article>
      <p className="kicker"><a href="/play" onClick={onLink}>play</a> · <b>cards</b></p>
      <h1>Cards</h1>
      <p className="lede">A fresh deck is shuffled by Fisher-Yates, each swap position an unbiased integer from decay bits, and the top cards are dealt. No card can come up twice; every hand of this size is equally likely.</p>
      <div className="controls">
        <NumberField id="cards-n" label="Cards to deal" value={count} min={1} max={size} onChange={setCount} />
        <Check id="cards-j" label="two jokers in the deck" checked={jokers} onChange={setJokers} />
        <button type="button" className="btn" onClick={deal} disabled={busy} id="deal">{busy ? "Shuffling" : `Deal ${Math.min(count, size)} of ${size}`}</button>
      </div>
      {error ? <p className="hb-notice">The gateway did not answer: {error}. Nothing was dealt.</p> : null}
      {hand ? (
        <section className="panel hb-sec" aria-live="polite">
          <div className="hb-cards" id="hand">
            {hand.map((c, i) => (
              <span className="hb-card" key={i} data-suit={c.suit || "joker"} aria-label={c.name}>
                <b>{c.rank}</b><i aria-hidden="true">{c.suit || "★"}</i>
              </span>
            ))}
          </div>
          <p className="note">{hand.map((c) => c.name).join(", ")}.</p>
          <Receipt r={receipt} />
        </section>
      ) : null}
    </article>
  );
}
