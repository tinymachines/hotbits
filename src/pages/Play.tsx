// The games' front door, and what is true of every one of them.
import { onLink } from "@tinymachines/kit/lib/router";
import { StatusTag } from "@tinymachines/kit/components/StatusTag";

const GAMES = [
  { href: "/play/dice", title: "Dice", what: "From a d4 to a d100, up to twenty at once, with the sum." },
  { href: "/play/coins", title: "Coins", what: "Up to fifty, one bit of decay each, and the tally." },
  { href: "/play/cards", title: "Cards", what: "A fair shuffle of a deck, then a draw from the top." },
  { href: "/play/pick", title: "Pick", what: "Paste your list; decay picks one or several." },
  { href: "/play/lottery", title: "Lottery", what: "Tickets without replacement: Lotto 47, Powerball, Mega Millions, 6 of 49, or your own." },
  { href: "/play/password", title: "Passwords", what: "The arithmetic of a password's entropy, with decay choosing the characters. A demonstration, not a secret." },
];

export default function Play() {
  return (
    <article className="hb-play">
      <p className="kicker">hotbits · <b>play</b></p>
      <h1>Play</h1>
      <p className="lede">Six small games, every outcome decided by radioactive decay. The original hotbits site had these; they are back, on bits from the public archive.</p>
      <p><StatusTag kind="measured" /> The bits come from /v1/seeds: real decay, replayed from the append-only archive of bytes the instrument has already emitted. Not exclusive, since anyone can read the same stream, which makes them right for a game and wrong for a secret. Every page draws unbiased integers by rejection, so a six-sided die is never fed &ldquo;a byte mod 6&rdquo;, and every result carries a receipt: the bits used, the draws thrown away, the requests made.</p>
      <div className="hb-grid">
        {GAMES.map((g) => (
          <a key={g.href} className="panel hb-door" href={g.href} onClick={onLink}>
            <h2>{g.title}</h2>
            <p>{g.what}</p>
          </a>
        ))}
      </div>
      <p className="src">One source for the whole app: bits left over from one game are used by the next. The gateway hands out 64 seeds of 48 bits a request and is rate-limited per address; a page asks only when it has run out.</p>
    </article>
  );
}
