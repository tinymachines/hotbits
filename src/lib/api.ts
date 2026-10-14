// The instrument, as this app reaches it: same-origin paths on hotbits.tinymachines.ai (src/api-paths.ts says
// which; in dev the Vite proxy sends them to the live site). ENTROPY IS SCARCE: the pool refills at about 75 bytes
// a minute for everyone put together, so nothing here spends it. /v1/seeds and /random/archive replay bytes already
// emitted (real decay, not exclusive), and the status paths are bookkeeping the daemon does anyway. Nothing is
// asked more often than every 30 seconds.

export interface Health {
  healthy: boolean;
  logger_service_active: boolean;
  events_csv_age_s: number;
  events_csv_fresh: boolean;
  pool_fresh_bytes: number;
  pool_has_bytes: boolean;
}

export interface Stats {
  bits_bin_size_bytes: number;
  consumed_bytes: number;
  fresh_bytes: number;
  low_water_bytes: number;
  max_bytes_per_request: number;
  reject_us: number;
  events_csv_age_s: number;
  events_csv_size_bytes: number;
  logger_service_active: boolean;
  l1_total_bits_emitted?: number;
  l1_health_ok?: boolean;
  l1_rct_max_seen?: number;
}

export interface MetricRow {
  ts_iso: string;
  window_bytes: number;
  window_deltas: number;
  bias: number;
  ones_pct: number;
  ent_bpb: number;
  chi_pct: number;
  lag1_bits: number;
  mean_dt_ms: number;
  lag1_dt: number;
  pileup_pct: number;
}

export interface MetricsWindow { since: string; window_seconds: number; n_rows: number; rows: MetricRow[] }

export interface Continuous {
  available: boolean;
  total_bits_processed: number;
  rct: { cutoff: number; current_run_length: number; max_run_seen: number; failed_ever: boolean };
  apt: { window_size: number; cutoff: number; position_in_window: number; failed_ever: boolean; last_verdict?: [string, number, number] };
  fails_last_24h: number;
  reject_us: number;
}

export interface BatteryRow {
  ts_iso: string;
  n_bits: number;
  window_bytes: number;
  ent_bpb: number;
  ent_chi_pct: number;
  practrand_max_bytes: number;
  practrand_anomalies: number;
  rabbit_n_stats: number;
  rabbit_pass: number;
  alphabit_n_stats: number;
  alphabit_pass: number;
  total_failures: number;
  runtime_s: number;
}

export interface Seeds { seeds: number[]; max: number; source: string; conditioning: string; note: string }

export interface OpenApi {
  info?: { title?: string; version?: string };
  paths: Record<string, Record<string, { summary?: string; description?: string; tags?: string[] }>>;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(path, { signal, cache: "no-store" });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return (await r.json()) as T;
}

export const getHealth = (s?: AbortSignal) => getJson<Health>("/health", s);
export const getStats = (s?: AbortSignal) => getJson<Stats>("/stats", s);
export const getLatestMetric = (s?: AbortSignal) => getJson<{ row: MetricRow | null }>("/metrics/latest", s);
export const getContinuous = (s?: AbortSignal) => getJson<Continuous>("/health/continuous", s);
export const getBattery = (limit = 30, s?: AbortSignal) => getJson<{ n_rows: number; rows: BatteryRow[] }>(`/battery/history?limit=${limit}`, s);
export const getOpenApi = (s?: AbortSignal) => getJson<OpenApi>("/openapi.json", s);

/** The gateway hands out at most 64 seeds a request, each 48 bits of decay replayed from the archive. */
export const SEEDS_PER_REQUEST = 64;
export const getSeeds = (n = SEEDS_PER_REQUEST, s?: AbortSignal) => getJson<Seeds>(`/v1/seeds?n=${Math.min(n, SEEDS_PER_REQUEST)}`, s);

export async function getMetrics(since = "24h", signal?: AbortSignal): Promise<MetricsWindow> {
  const body = await getJson<MetricsWindow | MetricRow[]>(`/metrics?since=${encodeURIComponent(since)}`, signal);
  // an older daemon answered a bare array; the pages read .rows
  return Array.isArray(body) ? { since, window_seconds: 0, n_rows: body.length, rows: body } : body;
}

/** The archive answers at most this many bytes a request; ask repeatedly and concatenate. */
const CHUNK = 4096;

/** Bytes already emitted, read from the append-only archive. Short is not an error: the caller draws what came. */
export async function getArchiveBytes(total: number, signal?: AbortSignal): Promise<Uint8Array> {
  const out = new Uint8Array(total);
  let filled = 0;
  while (filled < total) {
    const want = Math.min(CHUNK, total - filled);
    const res = await fetch(`/random/archive?n=${want}`, { signal, cache: "no-store" });
    if (!res.ok) throw new Error(`/random/archive: ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length === 0) break;
    out.set(buf.subarray(0, Math.min(buf.length, total - filled)), filled);
    filled += buf.length;
  }
  return filled === total ? out : out.subarray(0, filled);
}
