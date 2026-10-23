// The instrument, live: the whole board bradley.io/trng carried (2026-10-14), in the kiosk vocabulary. Everything
// on it is machine output. A dash, not a zero, for anything that was not read: "0 B" is a claim, and a path that did
// not answer makes none.
import { useEffect, useState } from "react";
import { ago } from "@tinymachines/kit/lib/ago";
import { StatusTag } from "@tinymachines/kit/components/StatusTag";
import { getMetrics, type BatteryRow, type MetricRow } from "../lib/api";
import { compactBytes, grouped, useInstrument } from "../lib/instrument";
import { Sparkline } from "@tinymachines/kit/components/Sparkline";
import { Tag } from "../components/Tag";

function batteryState(r: BatteryRow): "live" | "warn" | "fail" {
  if (r.total_failures > 0) return "fail";
  if (r.practrand_anomalies > 1) return "warn";
  return "live";
}

/** The last day of 5-minute quality windows, asked once and then every 5 minutes: it is the daemon's bookkeeping. */
function useDay() {
  const [rows, setRows] = useState<MetricRow[] | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    const load = () => getMetrics("24h", ac.signal).then((w) => { if (!ac.signal.aborted) setRows(w.rows ?? []); }).catch(() => { if (!ac.signal.aborted) setRows((r) => r ?? []); });
    void load();
    const id = setInterval(load, 300_000);
    return () => { ac.abort(); clearInterval(id); };
  }, []);
  return rows;
}

export default function Instrument() {
  const inst = useInstrument(true);
  const day = useDay();
  const { health, stats, metric, cont, battery, seeds } = inst;
  const hasData = Boolean(health || stats || metric || cont || battery.length);

  const quality = metric ? [
    { label: "Entropy", value: metric.ent_bpb, ideal: 8, unit: " bits/byte", d: 4, key: "ent_bpb" as const, min: 7.5, max: 8 },
    { label: "Ones", value: metric.ones_pct, ideal: 50, unit: "%", d: 2, key: "ones_pct" as const, min: 45, max: 55 },
    { label: "Bias", value: metric.bias, ideal: 0, unit: "", d: 4, key: "bias" as const, min: -0.05, max: 0.05 },
    { label: "Chi-square p", value: metric.chi_pct, ideal: 50, unit: "%", d: 1, key: "chi_pct" as const, min: 0, max: 100 },
    { label: "Serial correlation", value: metric.lag1_bits, ideal: 0, unit: "", d: 4, key: "lag1_bits" as const, min: -0.05, max: 0.05 },
  ] : [];

  return (
    <article className="hb-instrument">
      <p className="kicker">hotbits · <b>the instrument</b></p>
      <h1>The instrument</h1>
      <p className="lede">What the Geiger source is doing right now, read from it every 30 seconds. Each quality figure is shown against the value a perfect source would give, which is the only thing that makes a number like 7.9984 mean anything.</p>
      <p className="hb-status">
        <StatusTag kind="measured" />{" "}
        {!inst.asked ? <span className="note">asking the instrument</span>
          : inst.down ? <Tag state="warn">not answering</Tag>
          : <>
              {health ? <Tag state={health.healthy ? "live" : "warn"} title="the daemon's own verdict: logger running, event log fresh, pool not empty">{health.healthy ? "healthy" : "not healthy"}</Tag> : null}
              {inst.heardAt ? <span className="note"> last decay event logged {ago(new Date(inst.heardAt).toISOString())}</span> : null}
            </>}
      </p>

      {!hasData && inst.asked && inst.down ? (
        <section className="panel hb-sec">
          <h2>The Geiger box is not answering</h2>
          <p>The counter and its daemon run on separate hardware and this page reads them over the network, so this means the link or the daemon is down, not that the source stopped decaying. This page asks again every 30 seconds and resumes by itself when the box answers.</p>
        </section>
      ) : null}

      <section className="panel hb-sec" aria-label="The source">
        <h2>The source</h2>
        {inst.down && hasData ? <p className="note"><Tag state="warn">stopped answering</Tag> every figure below is the last one it gave.</p> : null}
        <div className="hb-stats">
          <div className="stat"><p className="k">Fresh pool</p><p className="v">{stats ? compactBytes(stats.fresh_bytes) : "-"}</p><p className="note">unread bytes, exclusive to the next keyed request</p></div>
          <div className="stat"><p className="k">Consumed, all time</p><p className="v">{stats ? compactBytes(stats.consumed_bytes) : "-"}</p><p className="note">handed out through the keyed tier</p></div>
          <div className="stat"><p className="k">Archive</p><p className="v">{stats ? compactBytes(stats.bits_bin_size_bytes) : "-"}</p><p className="note">every byte emitted, append-only; what the pictures and the games read</p></div>
          <div className="stat"><p className="k">Event log age</p><p className="v">{health ? <>{grouped(health.events_csv_age_s, 1)}<small>s</small></> : "-"}</p><p className="note">since the last decay event was written</p></div>
          <div className="stat"><p className="k">Rejection window</p><p className="v">{stats ? <>{grouped(stats.reject_us)}<small>µs</small></> : "-"}</p><p className="note">two clicks closer than this are thrown away: a tube has a dead time</p></div>
          <div className="stat"><p className="k">Logger</p><p className="v">{health ? (health.logger_service_active ? "active" : "stopped") : "-"}</p><p className="note">the service that writes each click down</p></div>
        </div>
      </section>

      <section className="panel hb-sec" aria-label="Quality">
        <h2>Quality</h2>
        <p>The most recent window{metric ? <>: {compactBytes(metric.window_bytes)}, {grouped(metric.window_deltas)} gaps, written {metric.ts_iso.slice(0, 16).replace("T", " ")} UTC</> : null}. The line under each is the last day of windows, and the dashed rule is the ideal.</p>
        {quality.length ? (
          <div className="hb-quality">
            {quality.map((q) => (
              <div className="hb-q" key={q.label}>
                <p className="k">{q.label}</p>
                <p className="v"><span className="n">{grouped(q.value, q.d)}{q.unit}</span> <small>ideal {grouped(q.ideal, q.ideal === 0 ? 0 : 0)}{q.unit}</small></p>
                {day && day.length > 1 ? <Sparkline values={day.map((r) => r[q.key])} ideal={q.ideal} label={`${q.label} over the last day`} min={q.min} max={q.max} /> : <p className="note">{day === null ? "reading the day" : "no day of windows yet"}</p>}
              </div>
            ))}
          </div>
        ) : <p className="note">{inst.down ? "no quality window was read before the box stopped answering" : "waiting for the first quality window"}</p>}
        {day && day.length ? <p className="note">{grouped(day.length)} windows in the last day, a window every five minutes of about a kilobyte. At that size a single chi-square p-value swings across its whole range by design; the trend over many windows is the signal, never one value.</p> : null}
      </section>

      <section className="panel hb-sec" aria-label="Continuous health">
        <h2>Continuous health</h2>
        <p>NIST SP 800-90B runs two tests on every sample as it arrives: a repetition count, and an adaptive proportion test over a sliding window. Either one failing means the source is producing something other than noise, and those bits are discarded.</p>
        {cont?.available ? (
          <>
            <div className="hb-scroll" tabIndex={0} role="region" aria-label="The two tests">
            <table className="hb-readout">
              <tbody>
                <tr><th>Repetition count <Tag state={cont.rct.failed_ever ? "fail" : "live"}>{cont.rct.failed_ever ? "tripped" : "passing"}</Tag></th><td className="n">{grouped(cont.rct.max_run_seen)} / {grouped(cont.rct.cutoff)}</td><td className="note">longest identical run ever seen / the cutoff</td></tr>
                <tr><th>Adaptive proportion <Tag state={cont.apt.failed_ever ? "fail" : "live"}>{cont.apt.failed_ever ? "tripped" : "passing"}</Tag></th><td className="n">{grouped(cont.apt.position_in_window)} / {grouped(cont.apt.window_size)}</td><td className="note">position in the window / its size</td></tr>
                <tr><th>Failures, last 24 h</th><td className="n">{grouped(cont.fails_last_24h)}</td><td className="note">either test, any sample</td></tr>
                <tr><th>Bits processed</th><td className="n">{grouped(cont.total_bits_processed)}</td><td className="note">since the stream opened</td></tr>
              </tbody>
            </table>
            </div>
            <p className="note">These are all-time marks, so a repetition count reading &ldquo;tripped&rdquo; means the longest run ever seen reached the cutoff at some point over {grouped(cont.total_bits_processed)} bits, not that it is failing now. The current run is {grouped(cont.rct.current_run_length)}.</p>
          </>
        ) : <p className="note">{inst.asked ? "no continuous-health snapshot" : "asking"}</p>}
      </section>

      <section className="panel hb-sec" aria-label="Test batteries">
        <h2>Test batteries</h2>
        <p>Longer runs of PractRand, Rabbit and Alphabit over archived output. These take time and run on a timer rather than continuously.</p>
        {battery.length ? (
          <div className="hb-scroll" tabIndex={0} role="region" aria-label="Battery history">
            <table className="hb-ledger">
              <thead><tr><th>When (UTC)</th><th className="n">Bits</th><th className="n">Entropy</th><th className="n">PractRand</th><th className="n">Rabbit</th><th className="n">Alphabit</th><th>Verdict</th></tr></thead>
              <tbody>
                {battery.slice(0, 10).map((r) => (
                  <tr key={r.ts_iso}>
                    <td>{r.ts_iso.slice(0, 16).replace("T", " ")}</td>
                    <td className="n">{grouped(r.n_bits)}</td>
                    <td className="n">{grouped(r.ent_bpb, 4)}</td>
                    <td className="n">{compactBytes(r.practrand_max_bytes)}</td>
                    <td className="n">{grouped(r.rabbit_pass)}/{grouped(r.rabbit_n_stats)}</td>
                    <td className="n">{grouped(r.alphabit_pass)}/{grouped(r.alphabit_n_stats)}</td>
                    <td><Tag state={batteryState(r)}>{r.total_failures > 0 ? `${r.total_failures} failed` : r.practrand_anomalies > 1 ? `${r.practrand_anomalies} anomalies` : "clean"}</Tag></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="note">{Math.min(10, battery.length)} of the last {battery.length} runs.</p>
          </div>
        ) : <p className="note">{inst.asked ? "no battery history" : "asking"}</p>}
      </section>

      <section className="panel hb-sec" aria-label="A sample">
        <h2>A sample from the stream</h2>
        {seeds?.length ? <pre className="hb-hex">{seeds.map((n) => n.toString(16).padStart(12, "0")).join(" ")}</pre> : <p className="note">{inst.down ? "the seed stream did not answer" : "asking the gateway"}</p>}
        <p className="note">Twelve 48-bit seeds from /v1/seeds: real decay data, replayed from the append-only archive, so not exclusive to you and not drawn from the fresh pool. The path that handed out exclusive bytes to anyone was closed when it was costing the whole source's output; it now needs a key, at /v1/bytes.</p>
      </section>

      <p className="src">Read from /health, /stats, /metrics/latest, /metrics?since=24h, /health/continuous, /battery/history and /v1/seeds on this host. The counter and its daemon are the Pi's; the gateway is the server's; this page is only the reader.</p>
    </article>
  );
}
