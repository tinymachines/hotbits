// One poll of the instrument's status paths for the live pages. Every 30 seconds, all five at once; a single path
// failing greys out its own panel, and only all five failing is "not answering". The time the box was last heard
// is the daemon's own clock (how long since it logged a decay event), not the time the answer arrived.
import { useEffect, useRef, useState } from "react";
import { getBattery, getContinuous, getHealth, getLatestMetric, getStats, getSeeds, type BatteryRow, type Continuous, type Health, type MetricRow, type Stats } from "./api";

export const POLL_MS = 30_000;

export interface Instrument {
  health: Health | null;
  stats: Stats | null;
  metric: MetricRow | null;
  cont: Continuous | null;
  battery: BatteryRow[];
  seeds: number[] | null;
  /** the first poll has come back, one way or the other */
  asked: boolean;
  /** the latest poll got no answer from any path */
  down: boolean;
  /** when the instrument was last heard, epoch ms, from its own event-log age */
  heardAt: number | null;
  /** when this page last got any answer, epoch ms */
  answeredAt: number | null;
}

const EMPTY: Instrument = { health: null, stats: null, metric: null, cont: null, battery: [], seeds: null, asked: false, down: false, heardAt: null, answeredAt: null };

export function useInstrument(withSeeds = false): Instrument {
  const [state, setState] = useState<Instrument>(EMPTY);
  const seedsAsked = useRef(false);

  useEffect(() => {
    const ac = new AbortController();
    const poll = async () => {
      if (document.visibilityState === "hidden") return;
      const [h, s, m, c, b] = await Promise.allSettled([
        getHealth(ac.signal), getStats(ac.signal), getLatestMetric(ac.signal), getContinuous(ac.signal), getBattery(30, ac.signal),
      ]);
      if (ac.signal.aborted) return;
      const at = Date.now();
      const results = [h, s, m, c, b];
      const allDown = results.every((r) => r.status === "rejected");
      setState((prev) => {
        const next: Instrument = { ...prev, asked: true, down: allDown };
        if (h.status === "fulfilled") {
          next.health = h.value;
          const age = h.value?.events_csv_age_s;
          next.heardAt = typeof age === "number" && age >= 0 ? at - age * 1000 : at;
        } else if (!allDown) next.heardAt = at;
        if (s.status === "fulfilled") next.stats = s.value;
        if (m.status === "fulfilled") next.metric = m.value?.row ?? null;
        if (c.status === "fulfilled") next.cont = c.value;
        if (b.status === "fulfilled") next.battery = b.value?.rows ?? [];
        if (!allDown) next.answeredAt = at;
        return next;
      });
      // Once per page, the first time the box answers: replayed seeds cost the pool nothing, but a sample nobody is
      // watching change has no reason to be re-asked. A failed ask clears the flag so the next poll tries again.
      if (withSeeds && !allDown && !seedsAsked.current) {
        seedsAsked.current = true;
        getSeeds(12, ac.signal)
          .then((d) => { if (!ac.signal.aborted && Array.isArray(d.seeds) && d.seeds.length) setState((p) => ({ ...p, seeds: d.seeds })); else seedsAsked.current = false; })
          .catch(() => { seedsAsked.current = false; });
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    const onShow = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { ac.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", onShow); };
  }, [withSeeds]);

  return state;
}

export const grouped = (n: number | undefined | null, d = 0) =>
  n === undefined || n === null || Number.isNaN(n) ? "-" : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export function compactBytes(n: number | undefined | null): string {
  if (n === undefined || n === null) return "-";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + " GB";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + " MB";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + " KB";
  return `${n} B`;
}
