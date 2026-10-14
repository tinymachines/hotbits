import { useState } from "react";
import { onLink } from "@tinymachines/kit/lib/router";
import { draw, type Receipt as R } from "../../lib/bits";
import { Receipt } from "../../components/Receipt";
import { Check, NumberField } from "../../components/Field";

const LOWER = "abcdefghijklmnopqrstuvwxyz", UPPER = LOWER.toUpperCase(), DIGITS = "0123456789", SYMBOLS = "!#$%&()*+,-./:;<=>?@[]^_{|}~";
const SIMILAR = /[il1Lo0O|]/g;

export default function Password() {
  const [length, setLength] = useState(16);
  const [lower, setLower] = useState(true);
  const [upper, setUpper] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(false);
  const [plain, setPlain] = useState(true);
  const [out, setOut] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<R | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let charset = (lower ? LOWER : "") + (upper ? UPPER : "") + (digits ? DIGITS : "") + (symbols ? SYMBOLS : "");
  if (plain) charset = charset.replace(SIMILAR, "");
  const bitsPerChar = charset.length > 1 ? Math.log2(charset.length) : 0;
  const entropy = bitsPerChar * length;

  const make = async () => {
    if (charset.length < 2) return;
    setBusy(true); setError(null);
    try {
      const { result, receipt } = await draw(async (src) => (await src.ints(length, charset.length)).map((i) => charset[i]).join(""));
      setOut(result); setReceipt(receipt);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <article>
      <p className="kicker"><a href="/play" onClick={onLink}>play</a> · <b>passwords</b></p>
      <h1>Passwords</h1>
      <p className="lede">How a password&rsquo;s strength is counted: log<sub>2</sub> of the alphabet, times the length, in bits. Decay bits choose the characters here so the arithmetic can be watched, and the receipt shows the cost of choosing fairly from an alphabet whose size is not a power of two.</p>
      <p className="hb-notice"><b>A demonstration, not a secret.</b> These bits are replayed from the public archive, which anyone can read, so a password made here is not private. For a secret, the gateway&rsquo;s keyed tier (/v1/hex, with a key) hands out fresh bytes once and to one caller; see <a href="/api" onClick={onLink}>the reference</a>.</p>
      <div className="controls">
        <NumberField id="pw-len" label="Length" value={length} min={4} max={64} onChange={setLength} />
        <Check id="pw-l" label="a to z" checked={lower} onChange={setLower} />
        <Check id="pw-u" label="A to Z" checked={upper} onChange={setUpper} />
        <Check id="pw-d" label="0 to 9" checked={digits} onChange={setDigits} />
        <Check id="pw-s" label="symbols" checked={symbols} onChange={setSymbols} />
        <Check id="pw-p" label="leave out look-alikes (i l 1 L o 0 O)" checked={plain} onChange={setPlain} />
        <button type="button" className="btn" onClick={make} disabled={busy || charset.length < 2} id="make">{busy ? "Choosing" : "Make one"}</button>
      </div>
      <div className="hb-stats">
        <div className="stat"><p className="k">Alphabet</p><p className="v n">{charset.length}<small>characters</small></p></div>
        <div className="stat"><p className="k">Per character</p><p className="v n">{bitsPerChar.toFixed(2)}<small>bits</small></p></div>
        <div className="stat"><p className="k">Whole password</p><p className="v n">{Math.floor(entropy)}<small>bits</small></p><p className="note">{entropy < 40 ? "weak" : entropy < 64 ? "fair" : entropy < 80 ? "good" : entropy < 128 ? "strong" : "more than any attacker will try"}</p></div>
      </div>
      {error ? <p className="hb-notice">The gateway did not answer: {error}. Nothing was made.</p> : null}
      {out ? (
        <section className="panel hb-sec" aria-live="polite">
          <pre className="hb-hex hb-pw" id="password">{out}</pre>
          <Receipt r={receipt} />
        </section>
      ) : null}
    </article>
  );
}
