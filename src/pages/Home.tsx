// The front door: what hotbits is, how a bit is made, what the instrument has this minute, and the four ways in.
import { onLink } from "@tinymachines/kit/lib/router";
import { StatusTag } from "@tinymachines/kit/components/StatusTag";
import { ShareButton } from "@tinymachines/kit/components/ShareButton";
import { current, isDark, useTheme } from "@tinymachines/kit/lib/theme";
import { app } from "@tinymachines/kit/app";
import { compactBytes, grouped, useInstrument } from "../lib/instrument";
import { HealthTag } from "@tinymachines/kit/components/HealthTag";

export default function Home() {
  useTheme();   // the mark follows the theme: ember on a dark one, on its plate on a light one
  const dark = isDark(current());
  const mark = dark && app().logoDark ? app().logoDark : app().logo;
  const inst = useInstrument();
  const s = inst.stats, h = inst.health;

  return (
    <article className="hb-home">
      <p className="kicker">hotbits · <b>random, from radioactive decay</b></p>
      <div className="hb-hero">
        <img src={mark} alt="" width={120} height={120} className="hb-mark" data-plate={dark ? "none" : "ember"} />
        <div>
          <h1>hotbits</h1>
          <p className="lede">A Geiger tube clicks when an atom decays, and no one can say when the next click will come. hotbits times every click, compares each gap with the one after it, and writes down a one or a zero. That stream is what everything here is made of.</p>
        </div>
      </div>
      <p className="controls">
        <a className="btn" href="/instrument" onClick={onLink}>The instrument, live</a>
        <a className="btn quiet" href="/space" onClick={onLink}>The entropy, drawn</a>
        <a className="btn quiet" href="/play" onClick={onLink}>Play</a>
        <ShareButton label="Share" />
      </p>
      <p><StatusTag kind="measured" /> Nothing here generates a number. If the first of two gaps between decays is shorter the bit is a one, if the second is shorter it is a zero, and equal gaps are thrown away. The bias cancels by symmetry rather than by correction, which is why the raw stream is worth measuring at all, and every figure on this site is read from the running instrument rather than typed.</p>

      <section className="panel hb-sec" aria-label="The instrument right now">
        <h2>Right now</h2>
        {!inst.asked ? <p className="note">Asking the instrument.</p>
          : inst.down ? <p className="note"><HealthTag small state="warn">not answering</HealthTag> The Geiger box is on separate hardware and this page reads it over the network; this page asks again every 30 seconds.</p>
          : (
            <>
              <div className="hb-chips">
                {s ? <span className="hb-chip"><b>{compactBytes(s.fresh_bytes)}</b> unread in the pool</span> : null}
                {s?.l1_total_bits_emitted !== undefined ? <span className="hb-chip"><b>{grouped(s.l1_total_bits_emitted)}</b> bits emitted since the stream opened</span> : null}
                {s ? <span className="hb-chip"><b>{grouped(s.max_bytes_per_request)} bytes</b> the most one request may take</span> : null}
              </div>
              <div className="hb-chips">
                {h ? <HealthTag small state={h.healthy ? "live" : "warn"}>{h.healthy ? "healthy" : "not healthy"}</HealthTag> : null}
                {s ? <HealthTag small state={s.logger_service_active ? "live" : "fail"}>{s.logger_service_active ? "logger running" : "logger stopped"}</HealthTag> : null}
                {s?.l1_health_ok !== undefined ? <HealthTag small state={s.l1_health_ok ? "live" : "fail"}>{s.l1_health_ok ? "health tests passing" : "health tests failing"}</HealthTag> : null}
              </div>
              <p className="note">Read from the instrument {inst.answeredAt ? "just now" : ""}; the pool refills at about 75 bytes a minute for everyone put together. <a href="/instrument" onClick={onLink}>The whole board.</a></p>
            </>
          )}
      </section>

      <section className="panel hb-sec">
        <h2>Four ways in</h2>
        <dl className="kv">
          <dt><a href="/instrument" onClick={onLink}>The instrument</a></dt><dd>The pool, the last quality window held against a perfect source, the NIST 800-90B health tests that run on every sample, the test batteries, and twelve seeds from the stream. Live, every 30 seconds.</dd>
          <dt><a href="/space" onClick={onLink}>The entropy, drawn</a></dt><dd>The same bytes four ways: a field in three dimensions beside IBM's broken RANDU, a return map, a raster of raw bits, and the instrument's own measurements as a cloud over the last day.</dd>
          <dt><a href="/play" onClick={onLink}>Play</a></dt><dd>Dice, coins, cards, a pick from your list, lottery tickets, passwords. Every outcome is decided by decay bits, and every page shows the bits it used and the draws it threw away to stay fair.</dd>
          <dt><a href="/api" onClick={onLink}>The reference</a></dt><dd>Every address the instrument answers, read from its own schema, and the gateway's: which are open, which need a key, which are closed.</dd>
        </dl>
      </section>

      <section className="panel hb-sec">
        <h2>Where it runs</h2>
        <p>A Geiger tube and an ESP32-C6 at the edge timestamp each click; a Raspberry Pi turns the gaps into bits, conditions them, keeps the archive and runs the quality tests; a gateway on the server decides who gets the fresh bytes, because the source makes about 75 a minute for everyone put together. The instrument's own pages, <a href="/docs">its reference</a> among them, answer on this same host; this app sits in front of them.</p>
        <p className="note">hotbits is one of the <a href="https://tinymachines.ai/hotbits">tinymachines</a>, and its bench notes live there.</p>
      </section>

      <p className="src">Every number on this site is read from the instrument when the page loads or on its 30-second poll, never baked in at build time. The games draw on bytes already emitted, replayed from the public archive: real decay, not exclusive, which each game says under its result.</p>
    </article>
  );
}
