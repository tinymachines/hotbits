import { useState } from "react";
import { onLink } from "@tinymachines/kit/lib/router";
import { draw, type BitSource, type Receipt as R } from "../../lib/bits";
import { Receipt } from "../../components/Receipt";
import { NumberField, Seg } from "../../components/Field";

interface Game { id: string; label: string; k: number; n: number; bonus?: { n: number; name: string } }
const GAMES: Game[] = [
  { id: "lotto47", label: "Lotto 47", k: 6, n: 47 },
  { id: "powerball", label: "Powerball", k: 5, n: 69, bonus: { n: 26, name: "Powerball" } },
  { id: "mega", label: "Mega Millions", k: 5, n: 70, bonus: { n: 25, name: "Mega Ball" } },
  { id: "649", label: "6 of 49", k: 6, n: 49 },
  { id: "custom", label: "Your own", k: 6, n: 49 },
];
interface Ticket { main: number[]; bonus?: number }

async function ticket(src: BitSource, g: Game): Promise<Ticket> {
  const pool = Array.from({ length: g.n }, (_, i) => i + 1);
  const main = (await src.shuffle(pool, g.k)).sort((a, b) => a - b);
  const bonus = g.bonus ? 1 + (await src.int(g.bonus.n)) : undefined;
  return { main, bonus };
}

export default function Lottery() {
  const [gameId, setGameId] = useState("lotto47");
  const [k, setK] = useState(6);
  const [n, setN] = useState(49);
  const [tickets, setTickets] = useState(1);
  const [out, setOut] = useState<Ticket[] | null>(null);
  const [receipt, setReceipt] = useState<R | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = GAMES.find((g) => g.id === gameId)!;
  const game: Game = base.id === "custom" ? { ...base, k: Math.min(k, n), n } : base;

  const play = async () => {
    setBusy(true); setError(null);
    try {
      const { result, receipt } = await draw(async (src) => { const t: Ticket[] = []; for (let i = 0; i < tickets; i++) t.push(await ticket(src, game)); return t; });
      setOut(result); setReceipt(receipt);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <article>
      <p className="kicker"><a href="/play" onClick={onLink}>play</a> · <b>lottery</b></p>
      <h1>Lottery</h1>
      <p className="lede">Numbers drawn without replacement, the way the machine does it: a partial shuffle of the balls, the first k kept and sorted. A bonus ball, where the game has one, is a separate draw from its own pool. This picks numbers; it does not improve them, because nothing can.</p>
      <div className="controls">
        <Seg label="Game" value={gameId} onChange={setGameId} options={GAMES.map((g) => ({ id: g.id, label: g.label }))} />
        {gameId === "custom" ? <>
          <NumberField id="lot-k" label="Pick" value={k} min={1} max={Math.min(20, n)} onChange={setK} />
          <NumberField id="lot-n" label="of" value={n} min={2} max={999} onChange={setN} />
        </> : <span className="note">{game.k} of {game.n}{game.bonus ? `, plus a ${game.bonus.name} from 1 to ${game.bonus.n}` : ""}</span>}
        <NumberField id="lot-t" label="Tickets" value={tickets} min={1} max={10} onChange={setTickets} />
        <button type="button" className="btn" onClick={play} disabled={busy} id="draw">{busy ? "Drawing" : tickets === 1 ? "Draw a ticket" : `Draw ${tickets} tickets`}</button>
      </div>
      {error ? <p className="hb-notice">The gateway did not answer: {error}. Nothing was drawn.</p> : null}
      {out ? (
        <section className="panel hb-sec" aria-live="polite">
          <ol className="hb-tickets" id="tickets">
            {out.map((t, i) => (
              <li key={i}>
                <span className="hb-balls">{t.main.map((b) => <span className="hb-ball" key={b}>{b}</span>)}{t.bonus !== undefined ? <span className="hb-ball hb-ball--bonus" aria-label={game.bonus?.name}>{t.bonus}</span> : null}</span>
              </li>
            ))}
          </ol>
          <Receipt r={receipt} />
        </section>
      ) : null}
    </article>
  );
}
